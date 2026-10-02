// Kleine Helfer für alle Teile des Baus: Maskieren, Text aus HTML, Pfadwörter, Symbole, Bildgrößen.
import { readFileSync } from 'node:fs';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ZEICHEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export const entschluesseln = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, e) => ZEICHEN[e]);
// Für Überschriften ohne Leerraum an Tag-Grenzen, für Fließtext mit, damit Absätze nicht verkleben
export const ohneTags = (html) => entschluesseln(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
export const nurText = (html) => entschluesseln(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
export const dekodiert = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
// „Ausbildungs-Berichtsheft“ → „ausbildungs-berichtsheft“, „Änderungen“ → „aenderungen“
export const pfadwort = (s) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const isoDatum = (d) => d && d.split('.').reverse().join('-');

const SYMBOL = {
  lupe: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  menue: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  links: '<path d="m15 18-6-6 6-6"/>',
  rechts: '<path d="m9 18 6-6-6-6"/>',
  runter: '<path d="m6 9 6 6 6-6"/>',
  start: '<path d="M7 4.5v15l12-7.5z"/>',
  buch: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  laden: '<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
  raus: '<path d="M7 17 17 7M8 7h9v9"/>',
};
export const symbol = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${SYMBOL[name]}</svg>`;

// Breite und Höhe eines Bildes für width/height, damit beim Laden nichts springt. Nur PNG und JPEG.
export function bildgroesse(datei) {
  const d = readFileSync(datei);
  if (d.readUInt32BE(0) === 0x89504e47) return [d.readUInt32BE(16), d.readUInt32BE(20)];
  for (let i = 2; i < d.length;) {
    const marke = d[i + 1], laenge = d.readUInt16BE(i + 2);
    if (marke >= 0xc0 && marke <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marke)) return [d.readUInt16BE(i + 7), d.readUInt16BE(i + 5)];
    i += 2 + laenge;
  }
  throw new Error(`${datei}: Größe nicht lesbar, nur PNG und JPEG`);
}
