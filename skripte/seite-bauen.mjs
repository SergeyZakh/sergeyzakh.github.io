// Baut die ganze Seite nach _site/: Startseite mit den Projekten, Docs, Bilder, Schrift, Profilkarte,
// 404-Seite und Sitemap. Projekte, Versionen und Docs kommen aus projekte.mjs und den Repos der Projekte.
// Aufruf: node skripte/seite-bauen.mjs [--quellen <ordner>] [--ziel <ordner>] [--projekte <datei>]
//   --quellen   Ordner mit den Repos (Vorgabe: quellen/, sonst der Ordner, in dem dieses Repo liegt)
//   --ziel      Ausgabe (Vorgabe: _site)
//   --projekte  andere Liste statt projekte.mjs, zum Ausprobieren
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { Marked } from 'marked';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const option = (name, vorgabe) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : vorgabe;
};
const QUELLEN = [option('--quellen', null), join(wurzel, 'quellen'), join(wurzel, '..')].filter(Boolean);
const ZIEL = option('--ziel', join(wurzel, '_site'));
const { projekte } = await import(pathToFileURL(resolve(option('--projekte', join(wurzel, 'projekte.mjs')))).href);
// Für Sitemap und 404-Seite, die unter beliebigen Pfaden ausgeliefert wird
const ADRESSE = 'https://sergeyzakh.github.io/';
// Was von hier unverändert auf die Seite geht. Die Profilkarte muss dabei sein, das GitHub-Profil lädt sie.
const FEST = ['bilder', 'schrift', 'karte', 'docs'];
// Bis zu so vielen Projekten mit Docs steht ein Umschalter in der Kopfleiste, darüber ein Menü
const UMSCHALTER_BIS = 3;
// Ids im Rahmen (hauptteil, seitenleiste) heißen so, dass keine Überschrift aus den Repos sie trifft.

const warnungen = [];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ZEICHEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const entschluesseln = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, e) => ZEICHEN[e]);
// Für Überschriften ohne Leerraum an Tag-Grenzen, für Fließtext mit, damit Absätze nicht verkleben
const ohneTags = (html) => entschluesseln(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const nurText = (html) => entschluesseln(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const dekodiert = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
// „Ausbildungs-Berichtsheft“ → „ausbildungs-berichtsheft“, „Änderungen“ → „aenderungen“
const pfadwort = (s) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- Bausteine aus der Startseite ----------

const startseite = readFileSync(join(wurzel, 'index.html'), 'utf8');
const SZ = startseite.match(/<symbol id="sz"[\s\S]*?<\/symbol>/)?.[0];
if (!SZ) throw new Error('Das Pixelbild <symbol id="sz"> fehlt in index.html');

const SYMBOL = {
  lupe: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  menue: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  links: '<path d="m15 18-6-6 6-6"/>',
  rechts: '<path d="m9 18 6-6-6-6"/>',
  runter: '<path d="m6 9 6 6 6-6"/>',
};
const symbol = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${SYMBOL[name]}</svg>`;

// Breite und Höhe eines Bildes für width/height, damit beim Laden nichts springt. Nur PNG und JPEG.
function bildgroesse(datei) {
  const d = readFileSync(datei);
  if (d.readUInt32BE(0) === 0x89504e47) return [d.readUInt32BE(16), d.readUInt32BE(20)];
  for (let i = 2; i < d.length;) {
    const marke = d[i + 1], laenge = d.readUInt16BE(i + 2);
    if (marke >= 0xc0 && marke <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marke)) return [d.readUInt16BE(i + 7), d.readUInt16BE(i + 5)];
    i += 2 + laenge;
  }
  throw new Error(`${datei}: Größe nicht lesbar, nur PNG und JPEG`);
}

// ---------- Projekte und Seiten einlesen ----------

function stand(repo, datei) {
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
  const ort = QUELLEN.map((q) => join(q, name)).find((o) => existsSync(join(o, '.git')) || existsSync(join(o, 'README.md')));
  if (!ort) throw new Error(`Repo ${p.repo} nicht gefunden. Erst node skripte/quellen-holen.mjs (holt nach quellen/).`);
  return ort;
}

function einlesen(p) {
  const kurz = pfadwort(p.name);
  if (!p.repo) return { ...p, kurz, seiten: [], gruppen: [] };
  const repo = repoOrdner(p);
  const changelog = join(repo, 'CHANGELOG.md');
  const version = existsSync(changelog) ? readFileSync(changelog, 'utf8').match(/^## \[?v?(\d+\.\d+\.\d+)\]?/m)?.[1] : null;
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
  return { ...p, kurz, repoOrdner: repo, version, gruppen, seiten, nachDatei: new Map(seiten.map((s) => [s.datei, s])) };
}

// ---------- Markdown ----------

const SPRACHEN = {
  bash: 'Bash', sh: 'Shell', shell: 'Shell', powershell: 'PowerShell', ps1: 'PowerShell', yaml: 'YAML', yml: 'YAML',
  json: 'JSON', js: 'JavaScript', javascript: 'JavaScript', php: 'PHP', python: 'Python', sql: 'SQL', ini: 'INI',
  dockerfile: 'Dockerfile', nginx: 'nginx', text: '',
};
// Keine Hervorhebung mit Bibliothek: nur Kommentare treten zurück, das reicht für Befehle und Konfiguration
const KOMMENTAR = { '#': /^(bash|sh|shell|powershell|ps1|yaml|yml|python|ini|dockerfile|nginx)$/, '//': /^(js|javascript|php|ts)$/ };

function codeBlock(text, sprache) {
  const zeichen = Object.keys(KOMMENTAR).find((z) => KOMMENTAR[z].test(sprache));
  const zeilen = text.split('\n').map((zeile) => {
    const i = zeichen ? zeile.indexOf(zeichen) : -1;
    if (i < 0 || zeile.slice(0, i).trim()) return esc(zeile);
    return esc(zeile.slice(0, i)) + `<span class="kommentar">${esc(zeile.slice(i))}</span>`;
  });
  const name = sprache in SPRACHEN ? SPRACHEN[sprache] : sprache;
  return `<div class="code"><div class="code-kopf"><span>${esc(name)}</span></div><pre><code>${zeilen.join('\n')}</code></pre></div>\n`;
}

const kasten = (farbe, titel, inhalt) =>
  `<div class="hinweis ${farbe}"><p class="hinweis-titel">${titel}</p>\n${inhalt}</div>\n`;

// GitHub-Hinweise: > [!NOTE] … Die Fundus-Doku setzt eine fette erste Zeile als eigenen Titel.
const ARTEN = {
  NOTE: ['blau', 'Hinweis'], TIP: ['gruen', 'Tipp'], IMPORTANT: ['violett', 'Wichtig'],
  WARNING: ['bernstein', 'Warnung'], CAUTION: ['rot', 'Vorsicht'],
};
function zitat(innen) {
  const m = innen.match(/^<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/);
  if (!m) return `<blockquote>\n${innen}</blockquote>\n`;
  let [farbe, titel] = ARTEN[m[1]];
  let rest = '<p>' + innen.slice(m[0].length);
  const eigener = rest.match(/^<p><strong>([^<]+)<\/strong>(\s*<\/p>\s*|\n|<br>\s*)/);
  if (eigener) {
    titel = eigener[1];
    rest = (eigener[2].includes('</p>') ? '' : '<p>') + rest.slice(eigener[0].length);
  }
  return kasten(farbe, titel, rest.replace(/^<p>\s*<\/p>\s*/, ''));
}

function markdown(text, seite) {
  let diagramme = 0;
  const md = new Marked({
    gfm: true,
    renderer: {
      code({ text: code, lang }) {
        const sprache = (lang || '').trim().split(/\s/)[0].toLowerCase();
        if (sprache === 'mermaid') {
          const bild = seite.mermaid?.[diagramme++];
          if (bild) {
            const src = posix.relative(posix.dirname(seite.datei), bild.bild);
            return `<figure class="diagramm"><img src="${esc(src)}" alt="${esc(bild.alt)}"></figure>\n`;
          }
          warnungen.push(`${seite.datei}: Mermaid-Block ohne Bild in projekte.mjs, steht als Code da`);
        }
        return codeBlock(code, sprache);
      },
      blockquote({ tokens }) {
        return zitat(this.parser.parse(tokens));
      },
    },
  });
  return md.parse(text);
}

// Kopf aus YAML, wie ihn die Fundus-Doku für ihr PDF trägt (titel, untertitel, stand, fakten).
// Nur die einfache Form: Schlüssel: Wert und Listen mit „- “.
function vorspann(text) {
  if (!text.startsWith('---\n')) return [{}, text];
  const ende = text.indexOf('\n---\n', 4);
  if (ende < 0) return [{}, text];
  const daten = {};
  let liste = null;
  for (const zeile of text.slice(4, ende).split('\n')) {
    const punkt = zeile.match(/^\s+-\s+(.*)$/);
    if (punkt && liste) { daten[liste].push(punkt[1]); continue; }
    const paar = zeile.match(/^([\w-]+):\s*(.*)$/);
    if (!paar) continue;
    liste = paar[2] ? null : paar[1];
    daten[paar[1]] = paar[2] || [];
  }
  return [daten, text.slice(ende + 5)];
}

// ---------- Aufbereiten: Bilder, Verweise, Überschriften ----------

// GitHub vergibt Anker so. Verweise aus den Repos (…START.md#weg-2-für-mehrere-…) treffen dann auch hier.
function anker(text, vergeben) {
  const basis = text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '').replace(/ /g, '-');
  let id = basis;
  for (let n = 1; vergeben.has(id); n++) id = `${basis}-${n}`;
  vergeben.add(id);
  return id;
}

function seitenOrdner(w, s) { return posix.join('docs', w.kurz, s.pfad); }

function seitenVerweis(w, ziel, rest, von) {
  const nach = seitenOrdner(w, ziel);
  if (nach === von) return rest || './';
  return (posix.relative(von, nach) || '.') + '/' + rest;
}

function verweis(href, w, s) {
  if (!href || href.startsWith('#')) return href && '#' + dekodiert(href.slice(1));
  const github = href.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/main\/([^?#]+)(#.*)?$/i);
  if (github && github[1].toLowerCase() === w.repo.toLowerCase() && w.nachDatei.has(github[2])) {
    return seitenVerweis(w, w.nachDatei.get(github[2]), dekodiert(github[3] || ''), seitenOrdner(w, s));
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return href;
  const [, pfad, rest] = href.match(/^([^?#]*)(.*)$/);
  const imRepo = pfad ? posix.normalize(posix.join(posix.dirname(s.datei), dekodiert(pfad))).replace(/\/$/, '') : s.datei;
  const ziel = w.nachDatei.get(imRepo);
  if (ziel) return seitenVerweis(w, ziel, dekodiert(rest), seitenOrdner(w, s));
  // Alles andere bleibt auf GitHub: Quelltext, Lizenz, Issues, Sicherheitsmeldungen
  return new URL(href, `https://github.com/${w.repo}/blob/main/${s.datei}`).href;
}

function bild(src, w, s) {
  if (/^([a-z]+:)?\/\//i.test(src)) return null;
  const imRepo = posix.normalize(posix.join(posix.dirname(s.datei), dekodiert(src.split(/[?#]/)[0])));
  const quelle = join(w.repoOrdner, imRepo);
  if (imRepo.startsWith('..') || !existsSync(quelle)) {
    warnungen.push(`${w.repo}/${s.datei}: Bild ${src} fehlt`);
    return null;
  }
  const ziel = posix.join('docs', w.kurz, 'dateien', imRepo);
  mkdirSync(dirname(join(ZIEL, ziel)), { recursive: true });
  cpSync(quelle, join(ZIEL, ziel));
  return encodeURI(posix.relative(seitenOrdner(w, s), ziel));
}

const CALLOUTS = { info: ['blau', 'Hinweis'], success: ['gruen', 'Tipp'], warning: ['bernstein', 'Wichtig'], danger: ['rot', 'Achtung'] };

function aufbereiten(html, w, s) {
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  // Hinweiskästen im Handbuch heißen wie in BookStack, die Wörter wie im Wiki
  html = html.replace(/<p class="callout (\w+)">([\s\S]*?)<\/p>/g, (_, art, inhalt) => {
    const [farbe, titel] = CALLOUTS[art] || CALLOUTS.info;
    return kasten(farbe, titel, `<p>${inhalt}</p>`);
  });
  // Abzeichen von shields.io und andere Bilder von außen fallen weg: Die Seite lädt nichts von dort
  html = html.replace(/<img\b([^>]*)>/g, (_, attr) => {
    const src = attr.match(/\bsrc="([^"]*)"/)?.[1];
    const neu = src && bild(entschluesseln(src), w, s);
    if (!neu) return '';
    attr = attr.replace(/\bsrc="[^"]*"/, `src="${esc(neu)}"`).replace(/\s*\/$/, '');
    return `<img${attr}${/\bloading=/.test(attr) ? '' : ' loading="lazy"'}>`;
  });
  html = html.replace(/<a\b([^>]*?)\bhref="([^"]*)"/g, (_, vor, href) => `<a${vor}href="${esc(verweis(entschluesseln(href), w, s))}"`);
  html = html.replace(/<a\b[^>]*>\s*<\/a>/g, '').replace(/<p>\s*<\/p>\n?/g, '');
  // Breite Tabellen scrollen am Handy für sich, die Seite bleibt fest
  html = html.replace(/<table>/g, '<div class="tabelle"><table>').replace(/<\/table>/g, '</table></div>');

  // Eine einzige # ist der Seitentitel. Mehrere # sind Kapitel (Fundus-Doku): dann rückt alles eine Stufe tiefer.
  const einsen = (html.match(/<h1[\s>]/g) || []).length;
  const tiefer = einsen > 1 ? 1 : 0;
  const vergeben = new Set();
  const inhalt = [];
  let titel = null;
  html = html.replace(/<h([1-6])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/g, (_, n, text) => {
    const klar = ohneTags(text);
    const id = anker(klar, vergeben);
    if (+n === 1 && einsen === 1) { titel = text; return ''; }
    const stufe = Math.min(+n + tiefer, 6);
    if (stufe <= 3) inhalt.push({ stufe, id, text: klar });
    return `<h${stufe} id="${id}">${text}<a class="anker" href="#${id}" aria-label="Link zu diesem Abschnitt">#</a></h${stufe}>`;
  });
  return { html, inhalt, titel };
}

// Für die Suche: je Abschnitt (bis zur nächsten h2 oder h3) Überschrift, Anker und Text
function abschnitte(html, seitentitel) {
  const teile = [];
  let letzte = { t: seitentitel, a: '' }, von = 0;
  for (const m of html.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<a class="anker"/g)) {
    teile.push({ ...letzte, x: nurText(html.slice(von, m.index)) });
    letzte = { t: ohneTags(m[3]), a: m[2] };
    von = m.index + m[0].length;
  }
  teile.push({ ...letzte, x: nurText(html.slice(von).replace(/<a class="anker"[^>]*>#<\/a>/g, '')) });
  return teile.filter((t) => t.x || t.a);
}

// ---------- Seitenrahmen ----------

// Projekte mit Docs, gesetzt, sobald alle eingelesen sind; Kopfleiste und Seitenleiste brauchen sie
let MIT_DOCS = [];

const versionsMarke = (w) => w.vorab
  ? `<span class="stand vorab">Vorabversion${w.version ? ' ' + esc(w.version) : ''}</span>`
  : `<span class="stand gut">${w.version ? 'v' + esc(w.version) : 'veröffentlicht'}</span>`;

// Wenige Projekte: Umschalter wie ein Segment. Viele: ein Menü mit Stand und Satz je Projekt.
function projektwahl(rel, aktiv) {
  const link = (w, innen) => `<a href="${rel}/docs/${w.kurz}/"${w.kurz === aktiv ? ' aria-current="true"' : ''}>${innen}</a>`;
  if (MIT_DOCS.length <= UMSCHALTER_BIS) {
    return `<nav class="umschalter" aria-label="Projekte">
    ${MIT_DOCS.map((w) => link(w, esc(w.name))).join('\n    ')}
  </nav>`;
  }
  const jetzt = MIT_DOCS.find((w) => w.kurz === aktiv);
  return `<details class="projektwahl">
    <summary>${esc(jetzt ? jetzt.name : 'Projekte')}${symbol('runter')}</summary>
    <nav aria-label="Projekte">
      ${MIT_DOCS.map((w) => link(w, `<b>${esc(w.name)}</b>${versionsMarke(w)}<small>${esc(w.satz)}</small>`)).join('\n      ')}
    </nav>
  </details>`;
}

function rahmen({ titel, beschreibung, rel, aktiv = '', haupt, seitenleiste = '', inhalt = '', klasse = '' }) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschreibung)}">
<meta name="color-scheme" content="light dark">
<link rel="stylesheet" href="${rel}/docs/docs.css">
<script src="${rel}/docs/docs.js" defer></script>
</head>
<body class="${klasse}" data-wurzel="${rel}" data-projekt="${aktiv || ''}">
<svg width="0" height="0" style="position: absolute" aria-hidden="true">${SZ}</svg>
<a class="springen" href="#hauptteil">Zum Inhalt</a>
<header class="kopf">
  <a class="marke" href="${rel}/" aria-label="Zur Startseite"><svg class="sz" viewBox="0 0 159 89"><use href="#sz"/></svg></a>
  <a class="docs-name" href="${rel}/docs/">Docs</a>
  ${projektwahl(rel, aktiv)}
  <button class="suchknopf" type="button" data-suche aria-label="Suchen">${symbol('lupe')}<span>Docs durchsuchen</span><kbd>Strg</kbd><kbd>K</kbd></button>
  ${seitenleiste ? `<button class="menueknopf" type="button" data-menue aria-controls="seitenleiste" aria-expanded="false">${symbol('menue')}<span>Seiten</span></button>` : ''}
</header>
<div class="raster">
${seitenleiste}
<main class="haupt" id="hauptteil">
${haupt}
</main>
${inhalt}
</div>
</body>
</html>
`;
}

function seitenleiste(w, aktuell, rel) {
  const gruppen = w.gruppen.map((g) => {
    const liste = g.eintraege.map((e) => {
      if (e.unter) return `<li class="unter">${esc(e.unter)}</li>`;
      const href = seitenVerweis(w, e, '', seitenOrdner(w, aktuell));
      return `<li><a href="${esc(href)}"${e === aktuell ? ' aria-current="page"' : ''}>${esc(e.titel)}</a></li>`;
    }).join('\n      ');
    return `${g.titel ? `<p class="gruppe">${esc(g.titel)}</p>` : ''}
    <ul>
      ${liste}
    </ul>`;
  }).join('\n    ');
  const andere = MIT_DOCS.filter((x) => x.kurz !== w.kurz);
  const anderes = !andere.length ? '' : andere.length < UMSCHALTER_BIS
    ? `<p class="anderes">Auch hier: ${andere.map((x) => `<a href="${rel}/docs/${x.kurz}/">${esc(x.name)}</a>`).join('')}</p>`
    : `<p class="anderes"><a href="${rel}/docs/">Alle ${MIT_DOCS.length} Projekte</a></p>`;
  const links = [w.demo && `<a href="${esc(w.demo)}">Demo ↗</a>`, `<a href="https://github.com/${esc(w.repo)}">Code ↗</a>`,
    w.download && `<a href="${esc(w.download.adresse)}">${esc(w.download.name)} ↓</a>`].filter(Boolean).join('');
  return `<aside class="seiten" id="seitenleiste">
  <div class="werkzeug">
    <a class="werkzeug-name" href="${esc(seitenVerweis(w, w.seiten[0], '', seitenOrdner(w, aktuell)))}">${esc(w.name)}</a>
    ${versionsMarke(w)}
    <p>${esc(w.satz)}</p>
    <p class="werkzeug-links">${links}</p>
  </div>
  <nav aria-label="Seiten zu ${esc(w.name)}">
    ${gruppen}
  </nav>
  ${anderes}
</aside>`;
}

function inhaltsverzeichnis(eintraege) {
  if (eintraege.length < 2) return '<aside class="toc" aria-hidden="true"></aside>';
  return `<aside class="toc" aria-label="Auf dieser Seite">
  <p>Auf dieser Seite</p>
  <ul>
    ${eintraege.map((e) => `<li class="stufe-${e.stufe}"><a href="#${e.id}">${esc(e.text)}</a></li>`).join('\n    ')}
  </ul>
</aside>`;
}

function weiterBlaettern(w, s) {
  const i = w.seiten.indexOf(s), von = seitenOrdner(w, s);
  const karte = (ziel, art) => ziel ? `<a class="${art}" href="${esc(seitenVerweis(w, ziel, '', von))}">
    <small>${art === 'zurueck' ? symbol('links') + 'Zurück' : 'Weiter' + symbol('rechts')}</small>${esc(ziel.titel)}</a>` : '<span></span>';
  return `<nav class="blaettern" aria-label="Blättern">${karte(w.seiten[i - 1], 'zurueck')}${karte(w.seiten[i + 1], 'weiter')}</nav>`;
}

// ---------- Eine Seite ----------

const suche = [];
const sitemap = [{ pfad: '' }, { pfad: 'docs/' }];
const isoDatum = (d) => d && d.split('.').reverse().join('-');

function seiteBauen(w, s) {
  const roh = readFileSync(join(w.repoOrdner, s.datei), 'utf8').replace(/\r\n/g, '\n');
  const [kopf, text] = s.datei.endsWith('.md') ? vorspann(roh) : [{}, roh];
  const gebaut = aufbereiten(s.datei.endsWith('.md') ? markdown(text, s) : text, w, s);
  const ordner = seitenOrdner(w, s);
  const rel = posix.relative(ordner, '.') || '.';
  const titelHtml = gebaut.titel || esc(s.titel);
  const titelText = ohneTags(titelHtml);
  const quelle = `https://github.com/${w.repo}/blob/main/${s.datei}`;
  const woerter = nurText(gebaut.html).split(' ').length;
  const datum = kopf.stand || stand(w.repoOrdner, s.datei);
  const meta = [datum && `Stand ${esc(datum)}`, `${Math.max(1, Math.round(woerter / 200))} Min. Lesezeit`,
    `<a href="${esc(quelle)}">${esc(s.datei)} ↗</a>`].filter(Boolean).join('<span>·</span>');
  // Eckdaten aus dem Kopf der Fundus-Doku: „Teil | Wert“
  const fakten = Array.isArray(kopf.fakten) && kopf.fakten.length ? `<dl class="fakten">
  ${kopf.fakten.map((f) => f.split('|').map((t) => esc(t.trim()))).map(([k, v]) => `<div><dt>${k}</dt><dd>${v || ''}</dd></div>`).join('\n  ')}
</dl>` : '';
  const hinweis = s.hinweis ? `<p class="herkunft">${esc(s.hinweis)}</p>` : '';
  const ersterAbsatz = gebaut.html.match(/<p>([\s\S]*?)<\/p>/)?.[1];
  const beschreibung = (kopf.untertitel || (ersterAbsatz ? nurText(ersterAbsatz) : w.satz)).slice(0, 180);

  const haupt = `<p class="pfad"><a href="${rel}/docs/">Docs</a><span>/</span><a href="${esc(seitenVerweis(w, w.seiten[0], '', ordner))}">${esc(w.name)}</a>${s.gruppe ? `<span>/</span>${esc(s.gruppe)}` : ''}</p>
<h1>${titelHtml}</h1>
${kopf.untertitel ? `<p class="unterzeile">${esc(kopf.untertitel)}</p>` : ''}
<p class="meta">${meta}</p>
${fakten}${hinweis}
<article class="text">
${gebaut.html.trim()}
</article>
${weiterBlaettern(w, s)}
<p class="fuss">Diese Seite entsteht aus <a href="${esc(quelle)}">${esc(s.datei)}</a> in ${esc(w.repo)}.
  Fehler gefunden? <a href="https://github.com/${esc(w.repo)}/edit/main/${esc(s.datei)}">Auf GitHub bearbeiten</a></p>`;

  mkdirSync(join(ZIEL, ordner), { recursive: true });
  writeFileSync(join(ZIEL, ordner, 'index.html'), rahmen({
    titel: `${titelText}${titelText === w.name ? '' : ' · ' + w.name} · Docs`,
    beschreibung, rel, aktiv: w.kurz, haupt,
    seitenleiste: seitenleiste(w, s, rel),
    inhalt: inhaltsverzeichnis(gebaut.inhalt),
  }));

  const url = posix.relative('docs', ordner);
  for (const a of abschnitte(gebaut.html, titelText)) {
    suche.push({ k: w.kurz, w: w.name, s: s.titel, t: a.t, u: `${url ? url + '/' : ''}${a.a ? '#' + a.a : ''}`, x: a.x });
  }
  sitemap.push({ pfad: ordner + '/', datum: isoDatum(datum) });
  return woerter;
}

// ---------- Übersicht unter docs/ ----------

// Je Gruppe so viele Seiten, danach ein Verweis auf die nächste; das Fundus-Handbuch allein hat 16
const UEBERSICHT_JE_GRUPPE = 8;

function uebersicht(alle) {
  const bloecke = alle.map((w) => {
    const gruppen = w.gruppen.map((g) => {
      const seiten = g.eintraege.filter((e) => e.datei);
      const link = (e, text) => `<li><a href="${esc(posix.join(w.kurz, e.pfad))}/">${text}</a></li>`;
      const rest = seiten.length - UEBERSICHT_JE_GRUPPE;
      const links = seiten.slice(0, rest > 1 ? UEBERSICHT_JE_GRUPPE : seiten.length).map((e) => link(e, esc(e.titel))).join('')
        + (rest > 1 ? link(seiten[UEBERSICHT_JE_GRUPPE], `<span class="mehr">und ${rest} weitere →</span>`) : '');
      return `<div><p class="gruppe">${esc(g.titel || 'Loslegen')}</p><ul>${links}</ul></div>`;
    }).join('\n      ');
    return `<section class="werkzeug-block">
    <div class="werkzeug-zeile">
      <h2><a href="${w.kurz}/">${esc(w.name)}</a></h2>
      ${versionsMarke(w)}
    </div>
    <p class="satz">${esc(w.satz)}</p>
    <div class="spalten">
      ${gruppen}
    </div>
  </section>`;
  }).join('\n  ');
  const haupt = `<p class="pfad"><a href="../">Startseite</a><span>/</span>Docs</p>
<h1>Docs</h1>
<p class="unterzeile">Anleitungen und Hintergründe zu meinen Projekten. Die Texte stammen aus den
  Repositories und werden jede Nacht neu gebaut, damit sie zum Code passen.</p>
<button class="suchfeld" type="button" data-suche>${symbol('lupe')}<span>Befehl, Einstellung oder Frage suchen …</span><kbd>Strg</kbd><kbd>K</kbd></button>
<div class="werkzeug-liste">
  ${bloecke}
</div>`;
  writeFileSync(join(ZIEL, 'docs', 'index.html'), rahmen({
    titel: 'Docs · Sergey Zakharov',
    beschreibung: `Anleitungen und Hintergründe zu ${alle.map((w) => w.name).join(', ').replace(/, ([^,]*)$/, ' und $1')}.`,
    rel: '..', haupt, klasse: 'uebersicht',
  }));
}

// ---------- Startseite: der Projektteil ----------

// Mit Bild steht ein Projekt groß da, mit Bildschirmfoto und drei Punkten; ohne Bild kompakt in einer Zeile.
function projektAbschnitt(p, nr) {
  const verweise = [
    p.demo && `<a href="${esc(p.demo)}">Demo</a>`,
    p.seiten.length && `<a class="intern" href="docs/${p.kurz}/">Docs</a>`,
    p.repo && `<a href="https://github.com/${esc(p.repo)}">Code</a>`,
    p.download && `<a class="laden" href="${esc(p.download.adresse)}">${esc(p.download.name)}</a>`,
  ].filter(Boolean).join('\n          ');
  const marke = p.vorab ? '<span class="stand vorab">Vorabversion</span>'
    : p.version ? `<span class="stand gut">v${esc(p.version)}</span>` : '';
  const zeile = `      <div class="projekt-zeile">
        <span class="nr">${String(nr).padStart(2, '0')}</span>
        <h2>${esc(p.name)}</h2>
        ${marke}
        <p class="satz">${esc(p.satz)}</p>
        <div class="verweise">
          ${verweise}
        </div>
      </div>`;
  if (!p.bild) return `    <article class="projekt kurz">\n${zeile}\n    </article>`;

  const groesse = (datei) => {
    if (!existsSync(join(wurzel, datei))) throw new Error(`${p.name}: Bild ${datei} fehlt (projekte.mjs)`);
    return bildgroesse(join(wurzel, datei));
  };
  const [breite, hoehe] = groesse(p.bild.datei);
  // Am Handy wäre ein ganzer Bildschirm zu klein, dort steht der Ausschnitt
  const handy = p.bild.handy ? (([b, h]) => `<source media="(max-width: 860px)" srcset="${esc(p.bild.handy)}" width="${b}" height="${h}">`)(groesse(p.bild.handy)) : '';
  // Kleine Bilder nicht über ihre Größe ziehen, sonst werden sie unscharf
  const bild = `      <figure class="bild${breite < 1400 ? ' schmal' : ''}">
        <picture>${handy}<img src="${esc(p.bild.datei)}" width="${breite}" height="${hoehe}" loading="lazy" alt="${esc(p.bild.alt)}"></picture>
      </figure>`;
  const punkte = Object.entries(p.punkte || {}).slice(0, 3)
    .map(([k, v]) => `<div><h3>${esc(k)}</h3><p>${esc(v)}</p></div>`).join('\n        ');
  return `    <article class="projekt">
${zeile}
${bild}${punkte ? `\n      <div class="drei">\n        ${punkte}\n      </div>` : ''}
    </article>`;
}

function startseiteBauen(alle) {
  const teil = `  <section id="projekte" class="breite">
    <div class="abschnitt-kopf"><span class="versal">Projekte</span><span class="versal">${String(alle.length).padStart(2, '0')}</span></div>
${alle.map((p, i) => projektAbschnitt(p, i + 1)).join('\n')}
  </section>`;
  const muster = /(<!-- projekte:anfang -->)[\s\S]*?(\n\s*<!-- projekte:ende -->)/;
  if (!muster.test(startseite)) throw new Error('Markierungen <!-- projekte:anfang/ende --> fehlen in index.html');
  writeFileSync(join(ZIEL, 'index.html'), startseite.replace(muster, `$1\n${teil}$2`));
}

// ---------- 404, Sitemap ----------

// GitHub Pages liefert 404.html unter jedem falschen Pfad aus; deshalb Pfade ab der Wurzel (rel = '')
function seite404() {
  const haupt = `<p class="pfad"><a href="/">Startseite</a><span>/</span>404</p>
<h1>Nicht gefunden</h1>
<p class="unterzeile">Diese Seite gibt es nicht (mehr). Vielleicht ist sie umgezogen: Die Suche findet
  alles in den Docs.</p>
<button class="suchfeld" type="button" data-suche>${symbol('lupe')}<span>Docs durchsuchen …</span><kbd>Strg</kbd><kbd>K</kbd></button>
<p class="meta"><a href="/">Zur Startseite</a><span>·</span><a href="/docs/">Zu den Docs</a></p>`;
  writeFileSync(join(ZIEL, '404.html'), rahmen({
    titel: 'Nicht gefunden · Sergey Zakharov', beschreibung: 'Diese Seite gibt es nicht.', rel: '', haupt, klasse: 'uebersicht',
  }));
}

function sitemapSchreiben() {
  const eintraege = sitemap.map((e) => `  <url><loc>${esc(ADRESSE + encodeURI(e.pfad))}</loc>${e.datum ? `<lastmod>${e.datum}</lastmod>` : ''}</url>`);
  writeFileSync(join(ZIEL, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${eintraege.join('\n')}
</urlset>
`);
  writeFileSync(join(ZIEL, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ADRESSE}sitemap.xml\n`);
}

// ---------- Los ----------

rmSync(ZIEL, { recursive: true, force: true });
mkdirSync(ZIEL, { recursive: true });
for (const f of FEST) cpSync(join(wurzel, f), join(ZIEL, f), { recursive: true });

const alle = projekte.map(einlesen);
MIT_DOCS = alle.filter((p) => p.seiten.length);
let woerter = 0;
for (const w of MIT_DOCS) for (const s of w.seiten) woerter += seiteBauen(w, s);
startseiteBauen(alle);
uebersicht(MIT_DOCS);
seite404();
sitemapSchreiben();
// Als Skript statt JSON, damit die Suche auch ohne Server (Datei im Browser geöffnet) lädt
writeFileSync(join(ZIEL, 'docs', 'suche.js'), `window.DOCS_SUCHE = ${JSON.stringify(suche)};\n`);

const seiten = MIT_DOCS.reduce((n, w) => n + w.seiten.length, 0);
console.log(`gebaut: ${ZIEL} mit ${alle.length} Projekten, ${seiten} Docs-Seiten, ${suche.length} Abschnitten in der Suche, rund ${woerter} Wörtern`);
for (const w of warnungen) console.warn('Warnung: ' + w);
