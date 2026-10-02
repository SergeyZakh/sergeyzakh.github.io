// Baut die ganze Seite nach _site/: Startseite mit den Projekten, Docs, Bilder, Schrift, Profilkarte,
// 404-Seite und Sitemap. Projekte, Versionen und Docs kommen aus projekte.mjs und den Repos der Projekte.
// Die Teile stehen unter skripte/bau/: einlesen, markdown, aufbereiten, rahmen, seiten.
// Aufruf: node skripte/seite-bauen.mjs [--quellen <ordner>] [--ziel <ordner>] [--projekte <datei>]
//   --quellen   Ordner mit den Repos (Vorgabe: quellen/, sonst der Ordner, in dem dieses Repo liegt)
//   --ziel      Ausgabe (Vorgabe: _site)
//   --projekte  andere Liste statt projekte.mjs, zum Ausprobieren
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lauf } from './bau/lauf.mjs';
import { einlesen } from './bau/einlesen.mjs';
import { seiteBauen, uebersicht, startseiteBauen, seite404, sitemapSchreiben } from './bau/seiten.mjs';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const option = (name, vorgabe) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : vorgabe;
};
const { projekte } = await import(pathToFileURL(resolve(option('--projekte', join(wurzel, 'projekte.mjs')))).href);
// Was von hier unverändert auf die Seite geht. Die Profilkarte muss dabei sein, das GitHub-Profil lädt sie.
const FEST = ['bilder', 'schrift', 'karte', 'docs'];

lauf.wurzel = wurzel;
lauf.ziel = option('--ziel', join(wurzel, '_site'));
lauf.quellen = [option('--quellen', null), join(wurzel, 'quellen'), join(wurzel, '..')].filter(Boolean);
lauf.startseite = readFileSync(join(wurzel, 'index.html'), 'utf8');
lauf.sz = lauf.startseite.match(/<symbol id="sz"[\s\S]*?<\/symbol>/)?.[0];
if (!lauf.sz) throw new Error('Das Pixelbild <symbol id="sz"> fehlt in index.html');
lauf.sitemap.push({ pfad: '' }, { pfad: 'docs/' });

rmSync(lauf.ziel, { recursive: true, force: true });
mkdirSync(lauf.ziel, { recursive: true });
for (const f of FEST) cpSync(join(wurzel, f), join(lauf.ziel, f), { recursive: true });

const alle = projekte.map(einlesen);
lauf.mitDocs = alle.filter((p) => p.seiten.length);
let woerter = 0;
for (const w of lauf.mitDocs) for (const s of w.seiten) woerter += seiteBauen(w, s);
startseiteBauen(alle);
uebersicht(lauf.mitDocs);
seite404();
sitemapSchreiben();
// Als Skript statt JSON, damit die Suche auch ohne Server (Datei im Browser geöffnet) lädt
writeFileSync(join(lauf.ziel, 'docs', 'suche.js'), `window.DOCS_SUCHE = ${JSON.stringify(lauf.suche)};\n`);

const seiten = lauf.mitDocs.reduce((n, w) => n + w.seiten.length, 0);
console.log(`gebaut: ${lauf.ziel} mit ${alle.length} Projekten, ${seiten} Docs-Seiten, ${lauf.suche.length} Abschnitten in der Suche, rund ${woerter} Wörtern`);
for (const w of lauf.warnungen) console.warn('Warnung: ' + w);
