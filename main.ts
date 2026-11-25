// Dapur Ember — hand-in program (Node 22, standard library only).
//
// It assembles the submission output: the playable game/ directory and the
// maker screenshots are copied next to this file into the output directory,
// then the vendored make.fun library writes /output/dossier.json from them.
// Run it twice and both runs must produce identical bytes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader the output directory is /output instead.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function fail(message) {
  throw new Error(`dapur-ember main.ts: ${message}`);
}

function countEntries(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    total += 1;
    if (statSync(p).isDirectory()) total += countEntries(p);
  }
  return total;
}

function checkGameWithinCaps() {
  const gameDir = join(repoRoot, 'game');
  if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
  if (countEntries(gameDir) > 993) fail('game/ holds more than 993 files and directories');
  const shots = join(repoRoot, 'screenshots');
  if (!existsSync(shots)) fail('screenshots/ is missing');
  const names = readdirSync(shots).filter((n) => !n.startsWith('.'));
  if (names.length < 3 || names.length > 4) fail(`screenshots/ must hold 3 or 4 images, found ${names.length}`);
  for (const n of names) {
    if (statSync(join(shots, n)).size > 256 * 1024) fail(`screenshot ${n} is over 256 KiB`);
  }
}

checkGameWithinCaps();

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

const dossierText = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierText);
