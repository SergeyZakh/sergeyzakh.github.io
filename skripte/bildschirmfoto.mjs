// Nimmt ein Bildschirmfoto einer Seite mit Edge über das DevTools-Protokoll auf.
// Aufruf: node skripte/bildschirmfoto.mjs <url> <ausgabe.jpg> [Knopftexte, die nacheinander geklickt werden]
// Ein Knopf passt, wenn sein Text so anfängt, Leerraum zählt einfach.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, ausgabe, ...knoepfe] = process.argv.slice(2);
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profil = mkdtempSync(join(tmpdir(), 'edge-foto-'));
const port = 9334;
const proz = spawn(edge, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, 'about:blank']);
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let ziele;
  for (let i = 0; i < 50 && !ziele; i++) {
    await warte(200);
    ziele = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).catch(() => undefined);
  }
  const ws = new WebSocket(ziele.find((z) => z.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let nr = 0;
  const offen = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && offen.has(m.id)) { offen.get(m.id)(m); offen.delete(m.id); }
  });
  const cdp = (method, params = {}) => new Promise((r) => { const id = ++nr; offen.set(id, r); ws.send(JSON.stringify({ id, method, params })); });

  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await cdp('Page.navigate', { url });
  await warte(4000);
  for (const knopf of knoepfe) {
    const r = await cdp('Runtime.evaluate', { returnByValue: true, expression: `(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.replace(/\\s+/g, ' ').trim().startsWith(${JSON.stringify(knopf)}));
      if (!b) return false; b.click(); return true; })()` });
    if (!r.result.result.value) throw new Error(`Knopf „${knopf}“ nicht gefunden`);
    await warte(2000);
  }
  const bild = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
  writeFileSync(ausgabe, Buffer.from(bild.result.data, 'base64'));
  ws.close();
  console.log('gespeichert:', ausgabe);
} finally {
  proz.kill();
  await warte(500);
  rmSync(profil, { recursive: true, force: true, maxRetries: 3 });
}
