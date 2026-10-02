// Prüft die gebaute Seite in _site/, bevor sie veröffentlicht wird:
//  - jeder Verweis innerhalb der Seite führt zu einer Datei, jeder Anker (#…) zu einer Überschrift
//  - nichts lädt von außen (Bilder, Skripte, Stile, Schriften)
//  - keine id doppelt auf einer Seite, sonst springt ein Anker an die falsche Stelle
// Verweise nach draußen (GitHub, LinkedIn) werden nicht abgerufen.
// Aufruf: node skripte/seite-pruefen.mjs [--ziel <ordner>]
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--ziel');
const ZIEL = i > 0 ? process.argv[i + 1] : join(wurzel, '_site');
if (!existsSync(ZIEL)) throw new Error(`${ZIEL} fehlt, erst node skripte/seite-bauen.mjs`);

const dateien = (ordner) => readdirSync(ordner, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? dateien(join(ordner, e.name)) : [join(ordner, e.name)]);
const seiten = dateien(ZIEL).filter((d) => d.endsWith('.html'));
const dekodiert = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const entschluesseln = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const idsJeDatei = new Map();
function ids(datei) {
  if (!idsJeDatei.has(datei)) {
    const html = readFileSync(datei, 'utf8');
    idsJeDatei.set(datei, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => entschluesseln(m[1]))));
  }
  return idsJeDatei.get(datei);
}

const fehler = [];
let verweise = 0;
for (const seite of seiten) {
  const html = readFileSync(seite, 'utf8').replace(/<code>[\s\S]*?<\/code>/g, '');
  const name = relative(ZIEL, seite);

  const alle = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  for (const doppelt of new Set(alle.filter((id, n) => alle.indexOf(id) !== n))) fehler.push(`${name}: id="${doppelt}" doppelt`);

  for (const m of html.matchAll(/<(a|img|link|script|source|use)\b[^>]*?\s(href|src|srcset)="([^"]*)"/g)) {
    const [, tag, , roh] = m;
    const wert = entschluesseln(roh);
    if (/^([a-z]+:)?\/\//i.test(wert)) {
      if (tag !== 'a') fehler.push(`${name}: <${tag}> lädt von außen: ${wert}`);
      continue;
    }
    if (/^(mailto|tel):/i.test(wert) || wert === '#' || wert === '') continue;
    verweise++;
    const [pfad, anker] = wert.split('#');
    // Pfade ab der Wurzel stehen nur auf der 404-Seite
    const basis = pfad.startsWith('/') ? ZIEL : dirname(seite);
    let ziel = pfad ? join(basis, dekodiert(pfad.split('?')[0])) : seite;
    if (existsSync(ziel) && statSync(ziel).isDirectory()) ziel = join(ziel, 'index.html');
    if (!existsSync(ziel)) { fehler.push(`${name}: ${wert} führt ins Leere`); continue; }
    if (anker && extname(ziel) === '.html' && !ids(ziel).has(dekodiert(anker))) {
      fehler.push(`${name}: Anker #${dekodiert(anker)} fehlt in ${relative(ZIEL, ziel)}`);
    }
  }
}

console.log(`geprüft: ${seiten.length} Seiten, ${verweise} Verweise innerhalb der Seite`);
if (fehler.length) {
  for (const f of fehler) console.error('Fehler: ' + f);
  process.exit(1);
}
