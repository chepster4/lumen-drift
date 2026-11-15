// LUMEN DRIFT — main.ts
// Program entrypoint (Node 22, stdlib saja). Menyalin game/ dan
// screenshots/ dari repo ke direktori output, lalu menulis
// dossier.json dengan buildDossier dari vendor/makefun-game.ts.
// Deterministik: dua run menghasilkan byte yang identik.
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
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

function removeTree(path: string): void {
  // Longgarkan mode dulu (pre-order): file hasil cpSync membawa mode dari
  // repo, dan repo grader (/bot) read-only sehingga salinannya bisa
  // read-only (mode 444/555); rm butuh direktori induk bisa ditulis,
  // jadi tanpa chmod ini run ke-2 gagal EACCES saat membersihkan.
  chmodSync(path, 0o755);
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) removeTree(join(path, entry));
  }
  rmSync(path, { recursive: true, force: true });
}

function main(): void {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(gameDir)) fail('game/ tidak ditemukan di ' + REPO_ROOT);
  if (!existsSync(shotsDir)) fail('screenshots/ tidak ditemukan di ' + REPO_ROOT);

  // Mulai dari output bersih supaya run lama tidak meninggalkan file basi.
  // JANGAN hapus OUTPUT_DIR itu sendiri: di grader ia adalah /output yang
  // parent-nya (/) tidak bisa ditulis uid 65534, jadi rmSync(OUTPUT_DIR)
  // melempar EACCES dan run gagal. Hapus hanya isi direktorinya.
  if (existsSync(OUTPUT_DIR) && !statSync(OUTPUT_DIR).isDirectory()) {
    // OUTPUT_DIR menunjuk ke file biasa: singkirkan dulu, lalu buat direktori.
    rmSync(OUTPUT_DIR, { force: true });
    mkdirSync(OUTPUT_DIR, { recursive: true });
  } else if (existsSync(OUTPUT_DIR)) {
    for (const entry of readdirSync(OUTPUT_DIR)) {
      removeTree(join(OUTPUT_DIR, entry));
    }
  } else {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  cpSync(gameDir, join(OUTPUT_DIR, 'game'), { recursive: true });
  cpSync(shotsDir, join(OUTPUT_DIR, 'screenshots'), { recursive: true });
  console.log('main.ts: copied game/ + screenshots/ to ' + OUTPUT_DIR);

  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  if (dossier.length > 1536 * 1024) fail('dossier.json melebihi 1,5 MiB: ' + dossier.length + ' bytes');
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
  console.log('main.ts: wrote ' + join(OUTPUT_DIR, 'dossier.json') + ' (' + dossier.length + ' bytes)');
}

main();
