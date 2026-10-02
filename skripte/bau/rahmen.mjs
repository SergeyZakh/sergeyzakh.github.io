// Der Rahmen jeder Docs-Seite: Kopfleiste mit Projektwahl und Suche, Seitenleiste, Inhaltsverzeichnis,
// Blättern.
import { lauf } from './lauf.mjs';
import { esc, symbol } from './werkzeug.mjs';
import { seitenOrdner, seitenVerweis } from './aufbereiten.mjs';

// Ids im Rahmen (hauptteil, seitenleiste) heißen so, dass keine Überschrift aus den Repos sie trifft.

// Bis zu so vielen Projekten mit Docs steht ein Umschalter in der Kopfleiste, darüber ein Menü
const UMSCHALTER_BIS = 3;

// mitDatum: „v0.5.0 · 01.10.2026“ in der Übersicht; in Seitenleiste und Menü ist dafür kein Platz
export const versionsMarke = (w, mitDatum) => {
  const datum = mitDatum && w.datum ? ` · ${esc(w.datum)}` : '';
  return w.vorab
    ? `<span class="stand vorab">Vorabversion${w.version ? ' ' + esc(w.version) : ''}${datum}</span>`
    : `<span class="stand gut">${w.version ? 'v' + esc(w.version) : 'veröffentlicht'}${datum}</span>`;
};

// Wenige Projekte: Umschalter wie ein Segment. Viele: ein Menü mit Stand und Satz je Projekt.
function projektwahl(rel, aktiv) {
  const link = (w, innen) => `<a href="${rel}/docs/${w.kurz}/"${w.kurz === aktiv ? ' aria-current="true"' : ''}>${innen}</a>`;
  if (lauf.mitDocs.length <= UMSCHALTER_BIS) {
    return `<nav class="umschalter" aria-label="Projekte">
    ${lauf.mitDocs.map((w) => link(w, esc(w.name))).join('\n    ')}
  </nav>`;
  }
  const jetzt = lauf.mitDocs.find((w) => w.kurz === aktiv);
  return `<details class="projektwahl">
    <summary>${esc(jetzt ? jetzt.name : 'Projekte')}${symbol('runter')}</summary>
    <nav aria-label="Projekte">
      ${lauf.mitDocs.map((w) => link(w, `<b>${esc(w.name)}</b>${versionsMarke(w)}<small>${esc(w.satz)}</small>`)).join('\n      ')}
    </nav>
  </details>`;
}

// Hell oder dunkel (siehe auch index.html, dort dasselbe Skript)
const THEMA = `<script>
  // Hell oder dunkel: die gespeicherte Wahl, sonst wie das System. Steht im Kopf, damit vor dem ersten
  // Zeichnen feststeht, welche Farben gelten, und nichts aufblitzt.
  (function () {
    var wurzel = document.documentElement, system = matchMedia("(prefers-color-scheme: dark)");
    function gespeichert() { try { return localStorage.getItem("thema"); } catch (e) { return null; } }
    function setzen(t) { wurzel.setAttribute("data-theme", t); }
    setzen(gespeichert() || (system.matches ? "dunkel" : "hell"));
    system.addEventListener("change", function (e) { if (!gespeichert()) setzen(e.matches ? "dunkel" : "hell"); });
    window.themaWechseln = function () {
      var neu = wurzel.getAttribute("data-theme") === "dunkel" ? "hell" : "dunkel";
      setzen(neu);
      try { localStorage.setItem("thema", neu); } catch (e) { /* ohne Speicher gilt die Wahl nur bis zum Neuladen */ }
    };
  })();
</script>`;

export function rahmen({ titel, beschreibung, rel, aktiv = '', haupt, seitenleiste = '', inhalt = '', klasse = '' }) {
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
${THEMA}
</head>
<body class="${[klasse, seitenleiste && 'mit-leiste'].filter(Boolean).join(' ')}" data-wurzel="${rel}" data-projekt="${aktiv || ''}">
<svg width="0" height="0" style="position: absolute" aria-hidden="true">${lauf.sz}</svg>
<a class="springen" href="#hauptteil">Zum Inhalt</a>
<header class="kopf">
  <div class="kopf-innen">
  <a class="marke" href="${rel}/" aria-label="Zur Startseite"><svg class="sz" viewBox="0 0 159 89"><use href="#sz"/></svg></a>
  <a class="docs-name" href="${rel}/docs/">Docs</a>
  ${projektwahl(rel, aktiv)}
  <button class="suchknopf" type="button" data-suche aria-label="Suchen">${symbol('lupe')}<span>Docs durchsuchen</span><kbd>Strg</kbd><kbd>K</kbd></button>
  <button class="themaknopf" type="button" data-thema aria-label="Hell oder dunkel" title="Hell oder dunkel"><span class="mond">${symbol('mond')}</span><span class="sonne">${symbol('sonne')}</span></button>
  ${seitenleiste ? `<button class="menueknopf" type="button" data-menue aria-controls="seitenleiste" aria-expanded="false">${symbol('menue')}<span>Seiten</span></button>` : ''}
  </div>
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

export function seitenleiste(w, aktuell, rel) {
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
  const andere = lauf.mitDocs.filter((x) => x.kurz !== w.kurz);
  const anderes = !andere.length ? '' : andere.length < UMSCHALTER_BIS
    ? `<p class="anderes">Auch hier: ${andere.map((x) => `<a href="${rel}/docs/${x.kurz}/">${esc(x.name)}</a>`).join('')}</p>`
    : `<p class="anderes"><a href="${rel}/docs/">Alle ${lauf.mitDocs.length} Projekte</a></p>`;
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

export function inhaltsverzeichnis(eintraege) {
  if (eintraege.length < 2) return '<aside class="toc" aria-hidden="true"></aside>';
  return `<aside class="toc" aria-label="Auf dieser Seite">
  <p>Auf dieser Seite</p>
  <ul>
    ${eintraege.map((e) => `<li class="stufe-${e.stufe}"><a href="#${e.id}">${esc(e.text)}</a></li>`).join('\n    ')}
  </ul>
</aside>`;
}

export function weiterBlaettern(w, s) {
  const i = w.seiten.indexOf(s), von = seitenOrdner(w, s);
  const karte = (ziel, art) => ziel ? `<a class="${art}" href="${esc(seitenVerweis(w, ziel, '', von))}">
    <small>${art === 'zurueck' ? symbol('links') + 'Zurück' : 'Weiter' + symbol('rechts')}</small>${esc(ziel.titel)}</a>` : '<span></span>';
  return `<nav class="blaettern" aria-label="Blättern">${karte(w.seiten[i - 1], 'zurueck')}${karte(w.seiten[i + 1], 'weiter')}</nav>`;
}
