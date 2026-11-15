// LUMEN DRIFT — config.js
// Satu-satunya tempat semua angka tuning, palet, dan konstanta game.
// Tidak ada logika di sini: file ini hanya mendeklarasikan nilai.
(function (global) {
  'use strict';

  var CFG = {
    // Ukuran arena (canvas logical, diskalakan CSS ke layar).
    WIDTH: 1280,
    HEIGHT: 720,

    // --- Palet neon di atas latar gelap ---
    palette: {
      bgTop: '#05010f',
      bgBottom: '#0d0221',
      nebulaA: '#1b0b3d',
      nebulaB: '#081a33',
      cyan: '#22e6ff',
      cyanSoft: '#7df3ff',
      magenta: '#ff2fb3',
      magentaSoft: '#ff7ad4',
      gold: '#ffd23f',
      goldSoft: '#ffe98a',
      violet: '#9b5cff',
      white: '#f4fbff',
      danger: '#ff3b4e',
      dangerSoft: '#ff8a94',
      shield: '#4dffc3',
      slowmo: '#8fb7ff',
      magnet: '#ffb347'
    },

    // --- Pemain (orb cahaya) ---
    player: {
      radius: 16,
      accel: 2600,        // px/s^2 saat tombol ditekan
      maxSpeed: 460,      // px/s
      friction: 3.2,      // redaman per detik saat tanpa input
      mousePull: 9.0,     // kekuatan tarik ke arah mouse
      trailLength: 22,    // jumlah titik trail
      invulnTime: 1.6,    // detik kebal setelah kena meteor
      startLives: 3
    },

    // --- Lumen (koleksi) ---
    lumen: {
      radius: 11,
      baseValue: 10,      // poin dasar per lumen
      comboWindow: 2.5,   // detik untuk menjaga rantai kombo
      maxMultiplier: 8,   // pengali skor maksimum
      spawnEvery: 0.85,   // detik antar spawn lumen (dasar)
      maxOnField: 14,
      goldChance: 0.12,   // peluang lumen emas (nilai 5x)
      pulseSpeed: 3.2
    },

    // --- Meteor (bahaya) ---
    meteor: {
      baseRadius: 18,
      radiusJitter: 16,   // variasi ukuran
      baseSpeed: 95,      // px/s dasar
      speedPerWave: 16,   // tambahan kecepatan per gelombang
      spawnEvery: 1.5,    // detik antar spawn meteor (dasar)
      spawnShrink: 0.09,  // pengurangan interval per gelombang
      minSpawnEvery: 0.55,
      maxOnField: 26,
      spinSpeed: 1.8
    },

    // --- Power-up ---
    powerup: {
      radius: 15,
      spawnEvery: 14,     // detik antar spawn power-up
      shieldTime: 8,      // detik perisai aktif
      slowTime: 6,        // detik slow-mo aktif
      magnetTime: 9,      // detik magnet aktif
      magnetRadius: 260   // jangkauan tarik lumen saat magnet aktif
    },

    // --- Gelombang & boss ---
    wave: {
      duration: 24,       // detik per gelombang biasa
      bossEvery: 5,       // tiap gelombang ke-5 ada mini-boss
      bossRadius: 64,
      bossHpPerWave: 6,   // HP boss = 6 + gelombang
      bossScore: 500,     // bonus skor saat boss kalah
      bossLumenShower: 6, // lumen yang muncrat saat boss kalah
      bossShotEvery: 1.4  // detik antar tembakan boss
    },

    // --- Skor & kombo ---
    scoring: {
      meteorGraze: 5,     // poin saat meteor lewat dekat tanpa kena
      waveClear: 150,     // bonus saat gelombang selesai
      bossHit: 25         // poin per hit ke boss
    },

    // --- Visual ---
    fx: {
      starCount: 130,     // bintang latar parallax
      particleCap: 420,   // jumlah partikel maksimum
      shakeOnHit: 14,     // px screen shake saat kena meteor
      shakeOnBoss: 8,
      flashOnCombo: 0.35  // kekuatan flash saat kombo naik tingkat
    },

    // --- Audio ---
    audio: {
      musicTempo: 112,    // BPM loop bassline
      masterGain: 0.5,
      sfxGain: 0.9
    }
  };

  // RNG deterministik (mulberry32) untuk mode screenshot & replay.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  global.LUMEN_CONFIG = CFG;
  global.mulberry32 = mulberry32;
})(typeof window !== 'undefined' ? window : globalThis);
