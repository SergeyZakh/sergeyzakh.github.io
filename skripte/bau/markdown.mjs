// Markdown nach HTML: GitHub-Hinweise als Kästen, Code mit Kopf, Mermaid als Bild aus dem Repo,
// dazu der YAML-Kopf der Fundus-Doku.
import { posix } from 'node:path';
import { Marked } from 'marked';
import { lauf } from './lauf.mjs';
import { esc } from './werkzeug.mjs';

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

export const kasten = (farbe, titel, inhalt) =>
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

export function markdown(text, seite) {
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
          lauf.warnungen.push(`${seite.datei}: Mermaid-Block ohne Bild in projekte.mjs, steht als Code da`);
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
export function vorspann(text) {
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
