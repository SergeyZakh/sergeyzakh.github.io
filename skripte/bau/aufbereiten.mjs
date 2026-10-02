// HTML aus Markdown oder Handbuch aufbereiten: Bilder kopieren, Verweise auf Docs-Seiten oder GitHub
// umbiegen, Anker wie GitHub vergeben, Inhaltsverzeichnis und Abschnitte für die Suche sammeln.
import { mkdirSync, cpSync, existsSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { lauf } from './lauf.mjs';
import { esc, entschluesseln, ohneTags, nurText, dekodiert } from './werkzeug.mjs';
import { kasten } from './markdown.mjs';

// GitHub vergibt Anker so. Verweise aus den Repos (…START.md#weg-2-für-mehrere-…) treffen dann auch hier.
function anker(text, vergeben) {
  const basis = text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '').replace(/ /g, '-');
  let id = basis;
  for (let n = 1; vergeben.has(id); n++) id = `${basis}-${n}`;
  vergeben.add(id);
  return id;
}

export function seitenOrdner(w, s) { return posix.join('docs', w.kurz, s.pfad); }

export function seitenVerweis(w, ziel, rest, von) {
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
    lauf.warnungen.push(`${w.repo}/${s.datei}: Bild ${src} fehlt`);
    return null;
  }
  const ziel = posix.join('docs', w.kurz, 'dateien', imRepo);
  mkdirSync(dirname(join(lauf.ziel, ziel)), { recursive: true });
  cpSync(quelle, join(lauf.ziel, ziel));
  return encodeURI(posix.relative(seitenOrdner(w, s), ziel));
}

const CALLOUTS = { info: ['blau', 'Hinweis'], success: ['gruen', 'Tipp'], warning: ['bernstein', 'Wichtig'], danger: ['rot', 'Achtung'] };

export function aufbereiten(html, w, s) {
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
export function abschnitte(html, seitentitel) {
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
