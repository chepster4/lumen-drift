// LUMEN DRIFT — main.ts
// Program entrypoint (Node 22, stdlib saja). Menyalin game/ dan
// screenshots/ dari repo ke direktori output, lalu menulis
// dossier.json dengan buildDossier dari vendor/makefun-game.ts.
// Deterministik: dua run menghasilkan byte yang identik.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = resolve(import.meta.dirname);
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR || join(REPO_ROOT, 'out'));

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function fail(message: string): never {
  console.error('main.ts: ' + message);
  process.exit(1);
}

function main(): void {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(gameDir)) fail('game/ tidak ditemukan di ' + REPO_ROOT);
  if (!existsSync(shotsDir)) fail('screenshots/ tidak ditemukan di ' + REPO_ROOT);

  // Mulai dari output bersih supaya run lama tidak meninggalkan file basi.
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  cpSync(gameDir, join(OUTPUT_DIR, 'game'), { recursive: true });
  cpSync(shotsDir, join(OUTPUT_DIR, 'screenshots'), { recursive: true });
  console.log('main.ts: copied game/ + screenshots/ to ' + OUTPUT_DIR);

  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  if (dossier.length > 1536 * 1024) fail('dossier.json melebihi 1,5 MiB: ' + dossier.length + ' bytes');
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
  console.log('main.ts: wrote ' + join(OUTPUT_DIR, 'dossier.json') + ' (' + dossier.length + ' bytes)');
}

main();
