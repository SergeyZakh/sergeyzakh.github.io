// Die Seiten selbst: jede Docs-Seite, die Übersicht unter docs/, der Projektteil der Startseite,
// 404-Seite und Sitemap.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import { lauf } from './lauf.mjs';
import { esc, ohneTags, nurText, symbol, bildgroesse, isoDatum } from './werkzeug.mjs';
import { stand } from './einlesen.mjs';
import { markdown, vorspann } from './markdown.mjs';
import { aufbereiten, abschnitte, seitenOrdner, seitenVerweis } from './aufbereiten.mjs';
import { rahmen, seitenleiste, inhaltsverzeichnis, weiterBlaettern, versionsMarke } from './rahmen.mjs';
// ---------- Eine Seite ----------


export function seiteBauen(w, s) {
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
    `<a href="${esc(quelle)}">${esc(s.datei)} ↗</a>`].filter(Boolean).map((t) => `<span>${t}</span>`).join('<span class="trenner">·</span>');
  // Eckdaten aus dem Kopf der Fundus-Doku: „Teil | Wert“
  const fakten = Array.isArray(kopf.fakten) && kopf.fakten.length ? `<dl class="fakten">
  ${kopf.fakten.map((f) => f.split('|').map((t) => esc(t.trim()))).map(([k, v]) => `<div><dt>${k}</dt><dd>${v || ''}</dd></div>`).join('\n  ')}
</dl>` : '';
  const hinweis = s.hinweis ? `<p class="herkunft">${esc(s.hinweis)}</p>` : '';
  const ersterAbsatz = gebaut.html.match(/<p>([\s\S]*?)<\/p>/)?.[1];
  const unterzeile = kopf.untertitel ? esc(kopf.untertitel) : gebaut.unterzeile;
  const beschreibung = (unterzeile ? nurText(unterzeile) : ersterAbsatz ? nurText(ersterAbsatz) : w.satz).slice(0, 180);

  const haupt = `<p class="pfad"><a href="${rel}/docs/">Docs</a><span>/</span><a href="${esc(seitenVerweis(w, w.seiten[0], '', ordner))}">${esc(w.name)}</a>${s.gruppe ? `<span>/</span>${esc(s.gruppe)}` : ''}</p>
<h1>${titelHtml}</h1>
${unterzeile ? `<p class="unterzeile">${unterzeile}</p>` : ''}
<p class="meta">${meta}</p>
${fakten}${hinweis}
<article class="text">
${gebaut.html.trim()}
</article>
${weiterBlaettern(w, s)}
<p class="fuss">Diese Seite entsteht aus <a href="${esc(quelle)}">${esc(s.datei)}</a> in ${esc(w.repo)}.
  Fehler gefunden? <a href="https://github.com/${esc(w.repo)}/edit/main/${esc(s.datei)}">Auf GitHub bearbeiten</a></p>`;

  mkdirSync(join(lauf.ziel, ordner), { recursive: true });
  writeFileSync(join(lauf.ziel, ordner, 'index.html'), rahmen({
    titel: `${titelText}${titelText === w.name ? '' : ' · ' + w.name} · Docs`,
    beschreibung, rel, aktiv: w.kurz, haupt,
    seitenleiste: seitenleiste(w, s, rel),
    inhalt: inhaltsverzeichnis(gebaut.inhalt),
  }));

  s.inhalt = gebaut.inhalt;
  const url = posix.relative('docs', ordner);
  for (const a of abschnitte(gebaut.html, titelText)) {
    lauf.suche.push({ k: w.kurz, w: w.name, s: s.titel, t: a.t, u: `${url ? url + '/' : ''}${a.a ? '#' + a.a : ''}`, x: a.x });
  }
  lauf.sitemap.push({ pfad: ordner + '/', datum: isoDatum(datum) });
  return woerter;
}
// ---------- Übersicht unter docs/ ----------

// Je Gruppe so viele Seiten, danach ein Verweis auf die nächste; das Fundus-Handbuch allein hat 16
const UEBERSICHT_JE_GRUPPE = 8;

export function uebersicht(alle) {
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
      ${versionsMarke(w, true)}
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
  writeFileSync(join(lauf.ziel, 'docs', 'index.html'), rahmen({
    titel: 'Docs · Sergey Zakharov',
    beschreibung: `Anleitungen und Hintergründe zu ${alle.map((w) => w.name).join(', ').replace(/, ([^,]*)$/, ' und $1')}.`,
    rel: '..', haupt, klasse: 'uebersicht',
  }));
}
// ---------- Startseite: der Projektteil ----------

// Mit Bild steht ein Projekt groß da, mit Bildschirmfoto und drei Punkten; ohne Bild kompakt im Raster.
// Die wichtigste Aktion (Demo, sonst Docs) ist ein dunkler Knopf, wie „Exportieren“ im Berichtsheft.
export function aktionen(p, docs) {
  const knoepfe = [
    p.demo && ['start', p.demo, 'Demo öffnen'],
    docs && ['buch', docs, 'Docs'],
    p.repo && ['code', `https://github.com/${p.repo}`, 'Code'],
    p.download && ['laden', p.download.adresse, p.download.name],
  ].filter(Boolean);
  return knoepfe.map(([zeichen, href, text], i) =>
    `<a class="knopf${i === 0 ? ' voll' : ''}" href="${esc(href)}">${symbol(zeichen)}${esc(text)}</a>`).join('\n          ');
}

export const standText = (p) => [p.vorab ? `Vorabversion${p.version ? ' ' + p.version : ''}` : p.version && `v${p.version}`, p.datum]
  .filter(Boolean).join(' · ');

function projektAbschnitt(p, nr, gespiegelt) {
  const stand = standText(p);
  // Kopf, Aktionen, Bild und Punkte stehen nebeneinander im Raster des Artikels; wo was steht, regelt
  // index.html je Breite: am PC Text und Bild nebeneinander, abwechselnd links und rechts, am Handy
  // untereinander mit dem Bild vor den Punkten.
  const kopf = `      <div class="projekt-kopf">
        <span class="nr">${String(nr).padStart(2, '0')}</span>
        <h3>${esc(p.name)}</h3>
        ${stand ? `<span class="stand ${p.vorab ? 'vorab' : 'gut'}">${esc(stand)}</span>` : ''}
        <p class="satz">${esc(p.satz)}</p>
      </div>
      <div class="aktionen">
          ${aktionen(p, p.seiten.length && `docs/${p.kurz}/`)}
      </div>`;
  const punkte = Object.entries(p.punkte || {}).slice(0, 3)
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n        ');
  const punkteHtml = punkte ? `\n      <dl class="punkte">\n        ${punkte}\n      </dl>` : '';
  if (!p.bild) return `    <article class="projekt kurz">\n${kopf}${punkteHtml}\n    </article>`;

  const groesse = (datei) => {
    if (!existsSync(join(lauf.wurzel, datei))) throw new Error(`${p.name}: Bild ${datei} fehlt (projekte.mjs)`);
    return bildgroesse(join(lauf.wurzel, datei));
  };
  const [breite, hoehe] = groesse(p.bild.datei);
  // Für schmale Bildschirme kann ein eigener Ausschnitt stehen
  const handy = p.bild.handy ? (([b, h]) => `<source media="(max-width: 860px)" srcset="${esc(p.bild.handy)}" width="${b}" height="${h}">`)(groesse(p.bild.handy)) : '';
  // Das Bild führt zur Demo, sonst zu den Docs
  const ziel = p.demo || (p.seiten.length ? `docs/${p.kurz}/` : null);
  const bild = `<picture>${handy}<img src="${esc(p.bild.datei)}" width="${breite}" height="${hoehe}" loading="lazy" alt="${esc(p.bild.alt)}"></picture>`;
  // Kleine Bilder nicht über ihre Größe ziehen, sonst werden sie unscharf
  return `    <article class="projekt${gespiegelt ? ' gespiegelt' : ''}">
${kopf}
      <figure class="bild${breite < 1400 ? ' schmal' : ''}">${ziel ? `<a href="${esc(ziel)}" tabindex="-1" aria-hidden="true">${bild}</a>` : bild}</figure>${punkteHtml}
    </article>`;
}

// Neues: die letzten Versionen aus den CHANGELOGs, je Projekt höchstens zwei, damit ein Projekt mit
// vielen kleinen Ausgaben die anderen nicht verdrängt. Gleiches Datum: abwechselnd nach Projekt.
const NEUES_JE_PROJEKT = 2;
const NEUES_INSGESAMT = 4;

function neuesBauen(alle) {
  const iso = (d) => (d ? d.split('.').reverse().join('-') : '');
  const eintraege = alle.flatMap((p, i) => (p.versionen || []).slice(0, NEUES_JE_PROJEKT).map((v, rang) => ({ p, v, i, rang })))
    .sort((a, b) => iso(b.v.datum).localeCompare(iso(a.v.datum)) || a.rang - b.rang || a.i - b.i)
    .slice(0, NEUES_INSGESAMT);
  if (!eintraege.length) return '';
  let vorher = null;
  const zeilen = eintraege.map(({ p, v }) => {
    const gleich = v.datum === vorher;
    vorher = v.datum;
    // Anker der Version auf der Seite „Änderungen“, wie ihn der Bau dort vergeben hat
    const seite = p.nachDatei?.get('CHANGELOG.md');
    const anker = seite?.inhalt?.find((e) => e.text.startsWith(v.version))?.id;
    const href = seite ? `docs/${p.kurz}/${seite.pfad}/${anker ? '#' + anker : ''}` : null;
    const was = v.satz || v.punkte.slice(0, 3).join(' · ');
    const innen = `<time>${esc(v.datum || '')}</time><b><i class="punkt${p.vorab ? ' vorab' : ''}"></i>${esc(p.name)} <span>${esc(v.version)}</span></b><span class="was">${esc(was)}</span>`;
    const klasse = `neu${gleich ? ' gleich' : ''}`;
    return href ? `      <a class="${klasse}" href="${esc(href)}">${innen}<span class="pfeil" aria-hidden="true">→</span></a>`
      : `      <div class="${klasse}">${innen}</div>`;
  });
  return `  <section id="neues" class="band"><div class="breite">
    <header class="band-kopf"><h2>Neues</h2><p>Die letzten Versionen, aus den Änderungsprotokollen der Projekte. Jede Zeile führt zu den Einzelheiten.</p></header>
    <div class="neues">
${zeilen.join('\n')}
    </div>
  </div></section>`;
}

// Projekte mit Bild stehen groß und abwechselnd gespiegelt; die ohne Bild, die direkt aufeinander
// folgen, nebeneinander in einem Raster, damit neben ihnen nicht eine halbe Zeile leer bleibt.
function projekteBauen(alle) {
  const teile = [];
  let gross = 0, weitere = [];
  const weitereAbschliessen = () => {
    if (weitere.length) teile.push(`    <div class="weitere">\n${weitere.join('\n')}\n    </div>`);
    weitere = [];
  };
  alle.forEach((p, i) => {
    if (!p.bild) return weitere.push(projektAbschnitt(p, i + 1));
    weitereAbschliessen();
    teile.push(projektAbschnitt(p, i + 1, gross++ % 2 === 1));
  });
  weitereAbschliessen();
  return teile.join('\n');
}

// Bühne unter dem Kopf: die Bildschirmfotos aus buehne der ersten beiden Projekte, die eines haben.
// Nur Schmuck (die Projekte stehen darunter mit Text), deshalb aria-hidden und ohne Alternativtext.
const BUEHNE_BILDER = 2;
function buehneBauen(alle) {
  const bilder = alle.filter((p) => p.buehne).slice(0, BUEHNE_BILDER).map((p) => {
    if (!existsSync(join(lauf.wurzel, p.buehne))) throw new Error(`${p.name}: Bild ${p.buehne} fehlt (projekte.mjs)`);
    const [b, h] = bildgroesse(join(lauf.wurzel, p.buehne));
    return `<img src="${esc(p.buehne)}" width="${b}" height="${h}" alt="">`;
  });
  return bilder.length ? `<div class="kopf-buehne" aria-hidden="true">${bilder.join('')}</div>` : '';
}

export function startseiteBauen(alle) {
  const teil = `  <section id="projekte" class="band flaeche"><div class="breite">
    <header class="band-kopf"><h2>Projekte</h2><p>Werkzeuge aus der Ausbildung, quelloffen auf GitHub, mit Docs und, wo es geht, einer Demo im Browser.</p></header>
${projekteBauen(alle)}
  </div></section>`;
  const muster = /(<!-- projekte:anfang -->)[\s\S]*?(\n\s*<!-- projekte:ende -->)/;
  if (!muster.test(lauf.startseite)) throw new Error('Markierungen <!-- projekte:anfang/ende --> fehlen in index.html');
  if (!lauf.startseite.includes('<!-- buehne -->')) throw new Error('Markierung <!-- buehne --> fehlt in index.html');
  // Ersetzen über Funktionen: Ein „$“ in einem Text aus den Repos wäre sonst ein Platzhalter
  const neues = neuesBauen(alle);
  writeFileSync(join(lauf.ziel, 'index.html'), lauf.startseite
    .replace(muster, (_, vor, nach) => `${vor}\n${teil}\n\n${neues}${nach}`)
    .replace('<!-- buehne -->', () => buehneBauen(alle)));
}

// ---------- 404, Sitemap ----------

// GitHub Pages liefert 404.html unter jedem falschen Pfad aus; deshalb Pfade ab der Wurzel (rel = '')
export function seite404() {
  const haupt = `<p class="pfad"><a href="/">Startseite</a><span>/</span>404</p>
<h1>Nicht gefunden</h1>
<p class="unterzeile">Diese Seite gibt es nicht (mehr). Vielleicht ist sie umgezogen: Die Suche findet
  alles in den Docs.</p>
<button class="suchfeld" type="button" data-suche>${symbol('lupe')}<span>Docs durchsuchen …</span><kbd>Strg</kbd><kbd>K</kbd></button>
<p class="meta"><span><a href="/">Zur Startseite</a></span><span class="trenner">·</span><span><a href="/docs/">Zu den Docs</a></span></p>`;
  writeFileSync(join(lauf.ziel, '404.html'), rahmen({
    titel: 'Nicht gefunden · Sergey Zakharov', beschreibung: 'Diese Seite gibt es nicht.', rel: '', haupt, klasse: 'uebersicht',
  }));
}

export function sitemapSchreiben() {
  const eintraege = lauf.sitemap.map((e) => `  <url><loc>${esc(lauf.adresse + encodeURI(e.pfad))}</loc>${e.datum ? `<lastmod>${e.datum}</lastmod>` : ''}</url>`);
  writeFileSync(join(lauf.ziel, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${eintraege.join('\n')}
</urlset>
`);
  writeFileSync(join(lauf.ziel, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${lauf.adresse}sitemap.xml\n`);
}
