// Holt die Repos aller Projekte aus projekte.mjs nach quellen/ (oder aktualisiert sie), damit
// seite-bauen.mjs Versionen und Docs daraus lesen kann. In der Action und lokal derselbe Weg.
// Ohne Datei-Inhalte der Vergangenheit (--filter=blob:none), aber mit allen Commits: „Stand“ je
// Seite kommt aus dem letzten Commit an der Datei.
// Private Repos brauchen GH_TOKEN mit Leserecht; öffentliche gehen ohne.
// Aufruf: node skripte/quellen-holen.mjs [--quellen <ordner>]
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { projekte } from '../projekte.mjs';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--quellen');
const QUELLEN = i > 0 ? process.argv[i + 1] : join(wurzel, 'quellen');
const token = process.env.GH_TOKEN;
const git = (...args) => execFileSync('git', args, { stdio: ['ignore', 'ignore', 'inherit'] });

mkdirSync(QUELLEN, { recursive: true });
for (const p of projekte.filter((p) => p.repo)) {
  const ziel = join(QUELLEN, p.repo.split('/')[1]);
  if (existsSync(join(ziel, '.git'))) {
    git('-C', ziel, 'pull', '--ff-only', '--quiet');
    console.log(`aktualisiert: ${p.repo}`);
  } else {
    const adresse = `https://${token ? `x-access-token:${token}@` : ''}github.com/${p.repo}.git`;
    git('clone', '--quiet', '--filter=blob:none', adresse, ziel);
    // Den Schlüssel nicht in .git/config liegen lassen
    if (token) git('-C', ziel, 'remote', 'set-url', 'origin', `https://github.com/${p.repo}.git`);
    console.log(`geholt: ${p.repo}`);
  }
}
