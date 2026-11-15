// LUMEN DRIFT — shots.js
// Mode screenshot deterministik: ?shot=start|play|end&seed=1
// Membangun satu adegan tetap dari seed, merender SATU frame, lalu
// berhenti — jadi screenshot selalu sama di setiap pengambilan.
// Dipakai hanya untuk screenshot juri; permainan normal tidak memakainya.
(function (global) {
  'use strict';

  var CFG = global.LUMEN_CONFIG;

  function parseShot() {
    var q = new URLSearchParams(window.location.search);
    var shot = q.get('shot');
    if (!shot) return null;
    var seed = parseInt(q.get('seed') || '1', 10);
    if (!isFinite(seed)) seed = 1;
    return { shot: shot, seed: seed };
  }

  // Arena demo untuk title: lumen + meteor melayang tanpa pemain.
  function buildTitleScene(world) {
    world.seed(7);
    world.state = 'title';
    world.best = 2450;
    for (var i = 0; i < 9; i++) world.spawnLumen(true);
    for (var j = 0; j < 5; j++) world.spawnMeteor(true);
  }

  // Adegan play ramai: skor, kombo aktif, boss, power-up, partikel.
  function buildPlayScene(world, seed) {
    world.seed(seed);
    world.reset();
    world.state = 'playing';
    world.score = 2450;
    world.best = 2450;
    world.combo = 12;
    world.comboTimer = 1.9;
    world.setWave(3);
    // Pemain di tengah bawah dengan trail + perisai & magnet aktif (HUD terlihat).
    var pl = world.player;
    pl.x = 640; pl.y = 480;
    pl.vx = 120; pl.vy = -60;
    pl.shield = 5;
    pl.magnet = 6;
    pl.trail = [];
    for (var t = 0; t < 18; t++) {
      pl.trail.push({ x: 640 - t * 9, y: 480 + t * 5 });
    }
    // Lumen bertebaran di sekitar pemain.
    for (var i = 0; i < 13; i++) world.spawnLumen(true);
    for (var j = 0; j < 8; j++) world.spawnMeteor(true);
    // Satu power-up shield di dekat pemain.
    world.spawnPowerup();
    // Boss mini di atas (wave 5 di-simulasi lewat boss aktif).
    world.setBoss({
      x: 900, y: 150, vx: 55, vy: 0, r: CFG.wave.bossRadius,
      hp: 4, maxHp: 9, shotTimer: 1.0, rot: 0.4
    });
    world.setWave(5);
    // Ledakan partikel + teks melayang supaya adegan hidup.
    world.burst(560, 420, CFG.palette.cyan, 22, 260);
    world.burst(760, 380, CFG.palette.gold, 16, 220);
    world.addFloat(640, 380, '+120  x3', CFG.palette.cyanSoft);
  }

  // Layar game over: skor akhir + skor terbaik baru.
  function buildEndScene(world, seed) {
    world.seed(seed);
    world.reset();
    world.state = 'playing';
    world.score = 3120;
    world.best = 3120;
    world.combo = 0;
    world.bestCombo = 14;
    world.lives = 0; // game over = nyawa habis, hati di HUD kosong
    world.setWave(4);
    // Sisa arena setelah kalah: beberapa lumen + meteor masih melayang.
    world.collected = 47; // statistik akhir untuk layar game over
    var pl = world.player;
    pl.x = 640; pl.y = 400;
    for (var i = 0; i < 10; i++) world.spawnLumen(true);
    for (var j = 0; j < 4; j++) world.spawnMeteor(true);
    world.burst(640, 400, CFG.palette.danger, 40, 340);
    world.gameOver();
  }

  // Menyiapkan adegan; kembalikan true bila mode shot aktif.
  // Render loop utama memanggil ini sekali, lalu render satu frame.
  function setupShot(world) {
    var spec = parseShot();
    if (!spec) return null;
    if (spec.shot === 'start') buildTitleScene(world);
    else if (spec.shot === 'play') buildPlayScene(world, spec.seed);
    else if (spec.shot === 'end') buildEndScene(world, spec.seed);
    else return null;
    return spec;
  }

  global.setupShot = setupShot;
  global.parseShot = parseShot;
})(typeof window !== 'undefined' ? window : globalThis);
