// Baut die ganze Seite nach _site/: Startseite, Bilder, Schrift, Profilkarte und die Docs.
// Die Docs entstehen aus Markdown und HTML der Projekt-Repos; welche Dateien, steht in docs.mjs.
// Aufruf: node skripte/seite-bauen.mjs [--quellen <ordner>] [--ziel <ordner>]
//   --quellen  Ordner mit den Kopien der Repos (Vorgabe: der Ordner, in dem dieses Repo liegt)
//   --ziel     Ausgabe (Vorgabe: _site)
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { Marked } from 'marked';
import { werkzeuge } from '../docs.mjs';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const option = (name, vorgabe) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : vorgabe;
};
const QUELLEN = option('--quellen', join(wurzel, '..'));
const ZIEL = option('--ziel', join(wurzel, '_site'));
// Ids im Rahmen (hauptteil, seitenleiste) heißen so, dass keine Überschrift aus den Repos sie trifft.
// Was von hier unverändert auf die Seite geht. Die Profilkarte muss dabei sein, das GitHub-Profil lädt sie.
const FEST = ['index.html', 'bilder', 'schrift', 'karte', 'docs'];

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

// ---------- Bausteine aus der Startseite ----------

const startseite = readFileSync(join(wurzel, 'index.html'), 'utf8');
const SZ = startseite.match(/<symbol id="sz"[\s\S]*?<\/symbol>/)?.[0];
if (!SZ) throw new Error('Das Pixelbild <symbol id="sz"> fehlt in index.html');

const SYMBOL = {
  lupe: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  menue: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  links: '<path d="m15 18-6-6 6-6"/>',
  rechts: '<path d="m9 18 6-6-6-6"/>',
};
const symbol = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${SYMBOL[name]}</svg>`;

// ---------- Werkzeug und Seiten einlesen ----------

function stand(repo, datei) {
  try {
    const tag = execFileSync('git', ['-C', repo, 'log', '-1', '--format=%cs', '--', datei], { encoding: 'utf8' }).trim();
    return tag ? tag.split('-').reverse().join('.') : null;
  } catch {
    return null;
  }
}

// Die Gliederung des Fundus-Handbuchs steht in einrichten.py, das sie beim Einrichten ins Wiki legt.
// Gelesen wird nur der Block des Handbuchs; ändert sich dort die Form, bricht der Bau laut ab.
function handbuchSeiten(werkzeug, repo, h) {
  const py = readFileSync(join(repo, h.gliederung), 'utf8');
  const anfang = py.indexOf('"So funktioniert das Wiki"');
  const ende = py.indexOf('\n]\n', anfang);
  if (anfang < 0 || ende < 0) throw new Error(`${h.gliederung}: Handbuch „So funktioniert das Wiki“ nicht gefunden`);
  const eintraege = [];
  for (const m of py.slice(anfang, ende).matchAll(/\{"name": "([^"]+)", "(seiten|datei)": (?:\[|"([^"]+)")/g)) {
    if (m[2] === 'seiten') {
      eintraege.push({ unter: m[1] });
    } else {
      const datei = `${h.ordner}/${m[3]}.html`;
      if (!existsSync(join(repo, datei))) throw new Error(`${h.gliederung} nennt ${datei}, die Datei fehlt`);
      eintraege.push({ datei, pfad: `${h.pfad}/${m[3].replace(/^\d+-/, '')}`, titel: m[1], handbuch: true });
    }
  }
  if (!eintraege.some((e) => e.datei)) throw new Error(`${h.gliederung}: keine Handbuchseiten gefunden`);
  return eintraege;
}

function einlesen(w) {
  const repo = join(QUELLEN, w.ordner);
  if (!existsSync(join(repo, 'README.md'))) {
    throw new Error(`${repo} fehlt. Das Repo ${w.repo} gehört nach ${QUELLEN} (oder --quellen angeben).`);
  }
  const version = readFileSync(join(repo, 'CHANGELOG.md'), 'utf8').match(/^## \[(\d+\.\d+\.\d+)\]/m)?.[1];
  const gruppen = w.gruppen.map((g) => ({
    titel: g.titel,
    eintraege: g.handbuch ? handbuchSeiten(w, repo, g.handbuch) : g.seiten,
  }));
  const seiten = gruppen.flatMap((g) => g.eintraege.filter((e) => e.datei));
  for (const s of seiten) {
    if (!existsSync(join(repo, s.datei))) throw new Error(`${w.repo}: ${s.datei} fehlt (docs.mjs)`);
  }
  return { ...w, repoOrdner: repo, version, gruppen, seiten, nachDatei: new Map(seiten.map((s) => [s.datei, s])) };
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
          warnungen.push(`${seite.datei}: Mermaid-Block ohne Bild in docs.mjs, steht als Code da`);
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

const versionsMarke = (w) => w.vorab
  ? `<span class="stand vorab">Vorabversion${w.version ? ' ' + esc(w.version) : ''}</span>`
  : `<span class="stand gut">${w.version ? 'v' + esc(w.version) : 'veröffentlicht'}</span>`;

function rahmen({ titel, beschreibung, rel, aktiv, haupt, seitenleiste = '', inhalt = '', klasse = '' }) {
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
<body class="${klasse}" data-wurzel="${rel}">
<svg width="0" height="0" style="position: absolute" aria-hidden="true">${SZ}</svg>
<a class="springen" href="#hauptteil">Zum Inhalt</a>
<header class="kopf">
  <a class="marke" href="${rel}/" aria-label="Zur Startseite"><svg class="sz" viewBox="0 0 159 89"><use href="#sz"/></svg></a>
  <a class="docs-name" href="${rel}/docs/">Docs</a>
  <nav class="umschalter" aria-label="Werkzeuge">
    ${werkzeuge.map((w) => `<a href="${rel}/docs/${w.kurz}/"${w.kurz === aktiv ? ' aria-current="true"' : ''}>${esc(w.name)}</a>`).join('\n    ')}
  </nav>
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
  const anderes = werkzeuge.filter((x) => x.kurz !== w.kurz)
    .map((x) => `<a href="${rel}/docs/${x.kurz}/">${esc(x.name)}</a>`).join('');
  return `<aside class="seiten" id="seitenleiste">
  <div class="werkzeug">
    <a class="werkzeug-name" href="${esc(seitenVerweis(w, w.seiten[0], '', seitenOrdner(w, aktuell)))}">${esc(w.name)}</a>
    ${versionsMarke(w)}
    <p>${esc(w.satz)}</p>
    <p class="werkzeug-links">${w.demo ? `<a href="${esc(w.demo)}">Demo ↗</a>` : ''}<a href="https://github.com/${esc(w.repo)}">Code ↗</a></p>
  </div>
  <nav aria-label="Seiten zu ${esc(w.name)}">
    ${gruppen}
  </nav>
  <p class="anderes">Auch hier: ${anderes}</p>
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
  const herkunft = s.handbuch ? `<p class="herkunft">Aus dem Handbuch, das Fundus beim Einrichten ins Wiki legt.
  „Unser Wiki“ ist dort das Wiki der Firma, die Fundus betreibt.</p>` : '';
  const ersterAbsatz = gebaut.html.match(/<p>([\s\S]*?)<\/p>/)?.[1];
  const beschreibung = (kopf.untertitel || (ersterAbsatz ? nurText(ersterAbsatz) : w.satz)).slice(0, 180);

  const haupt = `<p class="pfad"><a href="${rel}/docs/">Docs</a><span>/</span><a href="${esc(seitenVerweis(w, w.seiten[0], '', ordner))}">${esc(w.name)}</a>${s.handbuch ? '<span>/</span>Handbuch' : ''}</p>
<h1>${titelHtml}</h1>
${kopf.untertitel ? `<p class="unterzeile">${esc(kopf.untertitel)}</p>` : ''}
<p class="meta">${meta}</p>
${fakten}${herkunft}
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
    suche.push({ w: w.name, s: s.titel, t: a.t, u: `${url ? url + '/' : ''}${a.a ? '#' + a.a : ''}`, x: a.x });
  }
  return woerter;
}

// ---------- Übersicht unter docs/ ----------

function uebersicht(alle) {
  const bloecke = alle.map((w) => {
    const gruppen = w.gruppen.map((g) => {
      const seiten = g.eintraege.filter((e) => e.datei);
      const links = seiten.map((e) => `<li><a href="${esc(posix.join(w.kurz, e.pfad))}/">${esc(e.titel)}</a></li>`).join('');
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
<p class="unterzeile">Anleitungen und Hintergründe zu meinen Werkzeugen. Die Texte stammen aus den
  Repositories und werden jede Nacht neu gebaut, damit sie zum Code passen.</p>
<button class="suchfeld" type="button" data-suche>${symbol('lupe')}<span>Befehl, Einstellung oder Frage suchen …</span><kbd>Strg</kbd><kbd>K</kbd></button>
<div class="werkzeug-liste">
  ${bloecke}
</div>`;
  writeFileSync(join(ZIEL, 'docs', 'index.html'), rahmen({
    titel: 'Docs · Sergey Zakharov',
    beschreibung: 'Anleitungen und Hintergründe zu Berichtsheft und Fundus.',
    rel: '..', aktiv: null, haupt, klasse: 'uebersicht',
  }));
}

// ---------- Los ----------

rmSync(ZIEL, { recursive: true, force: true });
mkdirSync(ZIEL, { recursive: true });
for (const f of FEST) cpSync(join(wurzel, f), join(ZIEL, f), { recursive: true });

const alle = werkzeuge.map(einlesen);
let woerter = 0;
for (const w of alle) for (const s of w.seiten) woerter += seiteBauen(w, s);
uebersicht(alle);
// Als Skript statt JSON, damit die Suche auch ohne Server (Datei im Browser geöffnet) lädt
writeFileSync(join(ZIEL, 'docs', 'suche.js'), `window.DOCS_SUCHE = ${JSON.stringify(suche)};\n`);

const seiten = alle.reduce((n, w) => n + w.seiten.length, 0);
console.log(`gebaut: ${ZIEL} mit ${seiten} Docs-Seiten, ${suche.length} Abschnitten in der Suche, rund ${woerter} Wörtern`);
for (const w of warnungen) console.warn('Warnung: ' + w);
