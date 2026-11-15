// LUMEN DRIFT — shots.js
// Mode screenshot deterministik: ?shot=start|play|shop|end&seed=1
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
    for (var i = 0; i < 14; i++) world.spawnLumen(true);
    for (var j = 0; j < 6; j++) world.spawnMeteor(true);
    world.spawnMeteor(true, 'chaser');
    world.spawnMeteor(true, 'shooter');
  }

  // Adegan toko: panel upgrade antar-gelombang dengan 2 item sudah dibeli.
  function buildShopScene(world) {
    world.seed(11);
    world.reset();
    world.score = 3200;
    world.best = 3200;
    world.combo = 9;
    world.bank = 45;
    world.setWave(2);
    world.shop.buy(world, 0); // +NYAWA Lv.1 (bank 45 -> 25)
    world.shop.buy(world, 1); // MAGNET Lv.1 (bank 25 -> 13)
    for (var i = 0; i < 8; i++) world.spawnLumen(true);
    for (var j = 0; j < 3; j++) world.spawnMeteor(true);
    world.openShop();
    world.shop.selected = 2; // sorot PERISAI AWAL (openShop me-reset ke 0)
  }
  // bertipe, tembakan musuh, power-up, partikel — semua sistem terlihat.
  function buildPlayScene(world, seed) {
    world.seed(seed);
    world.reset();
    world.state = 'playing';
    world.score = 4860;
    world.best = 4860;
    world.combo = 18;
    world.comboTimer = 2.1;
    world.bank = 38;
    world.setWave(6);
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
    // Lumen bertebaran di sekitar pemain (2 ungu = nilai 3x).
    for (var i = 0; i < 13; i++) world.spawnLumen(true);
    world.lumens[0].kind = 'violet';
    world.lumens[1].kind = 'violet';
    // Arena padat: batu + pemburu + pemecah + penembak.
    for (var j = 0; j < 6; j++) world.spawnMeteor(true);
    world.spawnMeteor(true, 'chaser');
    world.spawnMeteor(true, 'chaser');
    world.spawnMeteor(true, 'splitter');
    world.spawnMeteor(true, 'shooter');
    // Tembakan musuh yang sedang melayang ke arah pemain.
    world.addEnemyShot(500, 300, 60, 120);
    world.addEnemyShot(820, 260, -50, 130);
    // Satu power-up shield di dekat pemain.
    world.spawnPowerup();
    // Boss VOID MAW fase II (HP 5/15) dengan bar HP + pip fase.
    world.setBoss({
      x: 900, y: 150, vx: 55, vy: 0, r: CFG.wave.bossRadius,
      hp: 5, maxHp: 15, shotTimer: 1.0, rot: 0.4,
      radialTimer: 2.4, chaserTimer: 5, _phase: 2, _spiral: 0, phase: 2
    });
    // Ledakan partikel + teks melayang supaya adegan hidup.
    world.burst(560, 420, CFG.palette.cyan, 22, 260);
    world.burst(760, 380, CFG.palette.gold, 16, 220);
    world.burst(900, 150, CFG.palette.magenta, 20, 280);
    world.addFloat(640, 380, '+120  x4', CFG.palette.cyanSoft);
    world.addFloat(700, 330, 'RISIKO x2', CFG.palette.gold);
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
    world.upgradesBought = 4; // upgrade toko yang sempat dibeli
    world.bank = 12;
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
    else if (spec.shot === 'shop') buildShopScene(world);
    else if (spec.shot === 'end') buildEndScene(world, spec.seed);
    else return null;
    return spec;
  }

  global.setupShot = setupShot;
  global.parseShot = parseShot;
})(typeof window !== 'undefined' ? window : globalThis);
