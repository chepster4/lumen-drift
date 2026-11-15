// LUMEN DRIFT — enemies.js
// Tiga jenis musuh baru + pecahan (shard): perilaku, bukan gambar.
// world.js yang memanggilnya; render.js yang menggambar tiap tipe.
(function (global) {
  'use strict';

  var COLORS = {
    chaser: '#c44dff',
    splitter: '#ff9f1c',
    shooter: '#ffb347',
    shard: '#ff6b81',
    rock: '#ff3b4e'
  };

  // Jenis apa yang muncul: makin tinggi gelombang, makin beragam.
  function pickType(wave, rng) {
    if (wave < 2) return 'rock';
    var r = rng();
    if (wave < 4) return r < 0.10 ? 'chaser' : 'rock';
    if (r < 0.13) return 'chaser';
    if (r < 0.20) return 'splitter';
    if (r < 0.27) return 'shooter';
    return 'rock';
  }

  function make(type, x, y, wave, rng) {
    var e = {
      type: type, x: x, y: y, vx: 0, vy: 0,
      r: 18, rot: rng() * Math.PI * 2, spin: (rng() - 0.5) * 3,
      grazed: false, fuse: 0, shotTimer: 0,
      phase: rng() * Math.PI * 2, speed: 0
    };
    if (type === 'chaser') {
      e.r = 20; e.speed = 150 + wave * 8;
    } else if (type === 'splitter') {
      e.r = 26; e.fuse = 6; e.speed = 90 + wave * 5;
    } else if (type === 'shooter') {
      e.r = 22; e.shotTimer = 1.5 + rng(); e.speed = 70 + wave * 4;
    } else if (type === 'shard') {
      e.r = 12; e.speed = 260 + wave * 10;
    }
    return e;
  }

  // Splitter yang habis sumbunya pecah jadi 2 pecahan cepat.
  // Pecahan mewarisi separuh momentum induk supaya pecahnya terbaca
  // sebagai ledakan ke arah gerak, bukan acak murni.
  function splitShards(e, rng) {
    var out = [];
    for (var i = 0; i < 2; i++) {
      var a = rng() * Math.PI * 2;
      var s = make('shard', e.x, e.y, 1, rng);
      s.vx = Math.cos(a) * s.speed + e.vx * 0.5;
      s.vy = Math.sin(a) * s.speed + e.vy * 0.5;
      out.push(s);
    }
    return out;
  }

  // Perilaku tiap frame. api: {shot(x,y,vx,vy), split(e), rng, time, wave}.
  // Rock & shard tidak di-steer: mereka melaju lurus.
  function steer(e, dt, px, py, api) {
    if (e.type === 'chaser') {
      var dx = px - e.x, dy = py - e.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      // Kejar pemain dengan goyangan sinus supaya tidak terlalu lurus.
      var wob = Math.sin(api.time * 2 + e.phase) * 60;
      var tx = (dx / d) * e.speed + (-dy / d) * wob;
      var ty = (dy / d) * e.speed + (dx / d) * wob;
      e.vx += (tx - e.vx) * Math.min(1, dt * 2.2);
      e.vy += (ty - e.vy) * Math.min(1, dt * 2.2);
    } else if (e.type === 'shooter') {
      var ddx = px - e.x, ddy = py - e.y;
      var dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      var want = 280; // jaga jarak tembak
      var radial = (dd - want) / want;
      var mx = (ddx / dd) * radial * e.speed + (-ddy / dd) * 50;
      var my = (ddy / dd) * radial * e.speed + (ddx / dd) * 50;
      e.vx += (mx - e.vx) * Math.min(1, dt * 1.6);
      e.vy += (my - e.vy) * Math.min(1, dt * 1.6);
      e.shotTimer -= dt;
      if (e.shotTimer <= 0) {
        e.shotTimer = Math.max(1.6, 2.4 - api.wave * 0.05);
        var bs = 175;
        api.shot(e.x, e.y, (ddx / dd) * bs, (ddy / dd) * bs);
      }
    } else if (e.type === 'splitter') {
      e.fuse -= dt;
      if (e.fuse <= 0) api.split(e);
    }
  }

  global.LUMEN_ENEMIES = {
    COLORS: COLORS,
    pickType: pickType,
    make: make,
    splitShards: splitShards,
    steer: steer
  };
})(typeof window !== 'undefined' ? window : globalThis);
