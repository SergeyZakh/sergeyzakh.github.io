// Projekte einlesen: Repo finden, Version aus dem CHANGELOG, Seiten aus der eigenen Gliederung,
// dem Handbuch oder von selbst gefunden.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { lauf } from './lauf.mjs';
import { pfadwort } from './werkzeug.mjs';

export function stand(repo, datei) {
  try {
    const tag = execFileSync('git', ['-C', repo, 'log', '-1', '--format=%cs', '--', datei], { encoding: 'utf8' }).trim();
    return tag ? tag.split('-').reverse().join('.') : null;
  } catch {
    return null;
  }
}

// Handbuchseiten, deren Gliederung in einer Python-Datei des Repos steht (Fundus: einrichten.py legt sie
// beim Einrichten ins Wiki). Gelesen wird nur der Block des Buchs; ändert sich dort die Form, bricht
// der Bau laut ab statt still Seiten zu verlieren.
function handbuchSeiten(repo, h) {
  const py = readFileSync(join(repo, h.gliederung), 'utf8');
  const anfang = py.indexOf(`"${h.buch}"`);
  const ende = py.indexOf('\n]\n', anfang);
  if (anfang < 0 || ende < 0) throw new Error(`${h.gliederung}: Buch „${h.buch}“ nicht gefunden`);
  const eintraege = [];
  for (const m of py.slice(anfang, ende).matchAll(/\{"name": "([^"]+)", "(seiten|datei)": (?:\[|"([^"]+)")/g)) {
    if (m[2] === 'seiten') {
      eintraege.push({ unter: m[1] });
    } else {
      const datei = `${h.ordner}/${m[3]}.html`;
      if (!existsSync(join(repo, datei))) throw new Error(`${h.gliederung} nennt ${datei}, die Datei fehlt`);
      eintraege.push({ datei, pfad: `${h.pfad}/${m[3].replace(/^\d+-/, '')}`, titel: m[1], hinweis: h.hinweis });
    }
  }
  if (!eintraege.some((e) => e.datei)) throw new Error(`${h.gliederung}: keine Handbuchseiten gefunden`);
  return eintraege;
}

// Ohne eigene Gliederung: was ein Repo üblicherweise an Docs hat. README ist der Überblick, docs/*.md
// stehen darunter (START zuerst), Entwicklung, Mitmachen, Sicherheit und Änderungen für Mitwirkende.
const FUER_MITWIRKENDE = /^(ENTWICKLUNG|DEVELOPMENT|ARCHITEKTUR|ARCHITECTURE)\.md$/i;
const FESTE_SEITEN = [['CONTRIBUTING.md', 'mitmachen', 'Mitmachen'], ['SECURITY.md', 'sicherheit', 'Sicherheit'],
  ['CHANGELOG.md', 'aenderungen', 'Änderungen']];

// Eine # ist der Titel. Mehrere # sind Kapitel (wie in der Fundus-Doku), dann heißt die Seite wie die Datei.
function titelAus(datei) {
  const text = readFileSync(datei, 'utf8').replace(/^```[\s\S]*?^```/gm, '');
  const einsen = [...text.matchAll(/^# (.+)$/gm)];
  if (einsen.length === 1) return einsen[0][1].replace(/[`*_]/g, '').trim();
  const name = datei.split(/[\\/]/).pop().replace(/\.md$/i, '').replace(/[-_]+/g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function finden(repo) {
  const oben = [], unten = [];
  if (existsSync(join(repo, 'README.md'))) oben.push({ datei: 'README.md', pfad: '', titel: 'Überblick' });
  const docs = existsSync(join(repo, 'docs')) ? readdirSync(join(repo, 'docs')).filter((f) => /\.md$/i.test(f)) : [];
  docs.sort((a, b) => (/^start/i.test(b) - /^start/i.test(a)) || a.localeCompare(b, 'de'));
  for (const f of docs) {
    const seite = { datei: `docs/${f}`, pfad: pfadwort(f.replace(/\.md$/i, '')), titel: titelAus(join(repo, 'docs', f)) };
    (FUER_MITWIRKENDE.test(f) ? unten : oben).push(seite);
  }
  for (const [datei, pfad, titel] of FESTE_SEITEN) if (existsSync(join(repo, datei))) unten.push({ datei, pfad, titel });
  return [{ titel: null, seiten: oben }, { titel: 'Für Mitwirkende', seiten: unten }].filter((g) => g.seiten.length);
}

function repoOrdner(p) {
  const name = p.repo.split('/')[1];
  const ort = lauf.quellen.map((q) => join(q, name)).find((o) => existsSync(join(o, '.git')) || existsSync(join(o, 'README.md')));
  if (!ort) throw new Error(`Repo ${p.repo} nicht gefunden. Erst node skripte/quellen-holen.mjs (holt nach quellen/).`);
  return ort;
}

export function einlesen(p) {
  const kurz = pfadwort(p.name);
  if (!p.repo) return { ...p, kurz, seiten: [], gruppen: [] };
  const repo = repoOrdner(p);
  const changelog = join(repo, 'CHANGELOG.md');
  // „## [0.5.0] – 2026-10-01“, die erste Überschrift mit Nummer; „## [Unveröffentlicht]“ zählt nicht
  const neueste = existsSync(changelog)
    ? readFileSync(changelog, 'utf8').match(/^## \[?v?(\d+\.\d+\.\d+)\]?(?:\s*[–—-]\s*(\d{4}-\d{2}-\d{2}))?/m) : null;
  const version = neueste?.[1] || null;
  const datum = neueste?.[2] ? neueste[2].split('-').reverse().join('.') : null;
  const vorlage = p.docs === false ? [] : p.docs?.gruppen || finden(repo);
  const gruppen = vorlage.map((g) => ({
    titel: g.titel,
    eintraege: g.handbuch ? handbuchSeiten(repo, g.handbuch) : g.seiten,
  }));
  const seiten = gruppen.flatMap((g) => g.eintraege.filter((e) => e.datei).map((e) => Object.assign(e, { gruppe: g.titel })));
  for (const s of seiten) {
    if (!existsSync(join(repo, s.datei))) throw new Error(`${p.repo}: ${s.datei} fehlt (projekte.mjs)`);
  }
  const doppelt = seiten.map((s) => s.pfad).find((pfad, i, alle) => alle.indexOf(pfad) !== i);
  if (doppelt !== undefined) throw new Error(`${p.name}: zwei Seiten unter docs/${kurz}/${doppelt}`);
  return { ...p, kurz, repoOrdner: repo, version, datum, gruppen, seiten, nachDatei: new Map(seiten.map((s) => [s.datei, s])) };
}
