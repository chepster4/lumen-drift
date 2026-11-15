// LUMEN DRIFT — boss.js
// Mesin fase VOID MAW: tiga fase serangan yang makin ganas.
// world.js yang memanggil update(); render.js membaca boss.phase.
(function (global) {
  'use strict';

  function phaseOf(boss) {
    var f = boss.hp / boss.maxHp;
    if (f > 0.66) return 1;
    if (f > 0.33) return 2;
    return 3;
  }

  // api: {shot(x,y,vx,vy), chaser(x,y), burst(x,y,color,n,speed),
  //       float(x,y,text,color), event(type, data), wave, width, shotEvery}
  function update(boss, dt, player, api) {
    if (boss.radialTimer === undefined) boss.radialTimer = 2.4;
    if (boss.chaserTimer === undefined) boss.chaserTimer = 5;
    if (boss._spiral === undefined) boss._spiral = 0;

    var phase = phaseOf(boss);
    if (boss._phase !== phase) {
      boss._phase = phase;
      if (phase > 1) {
        var label = phase === 2 ?
          'VOID MAW — FASE II: BADAI' : 'VOID MAW — FASE III: MURKA';
        api.burst(boss.x, boss.y, '#ff2fb3', 40, 380);
        api.float(boss.x, boss.y - 90, label, '#ff7ad4');
        api.event('bossPhase', phase);
      }
    }
    var speedMul = phase === 1 ? 1 : (phase === 2 ? 1.35 : 1.7);

    // Gerak melayang: masuk dari atas, lalu menyisir kiri-kanan.
    if (boss.y < 130) {
      boss.y += boss.vy * dt * speedMul;
    } else {
      boss.x += boss.vx * speedMul * dt;
      if (boss.x < 120 || boss.x > api.width - 120) boss.vx *= -1;
    }
    boss.rot += dt * 0.6 * speedMul;

    if (phase === 1) {
      // Fase I: satu tembakan terarah, seperti dulu.
      boss.shotTimer -= dt;
      if (boss.shotTimer <= 0 && boss.y > 0) {
        boss.shotTimer = api.shotEvery;
        var ang = Math.atan2(player.y - boss.y, player.x - boss.x);
        var bs = 190 + api.wave * 6;
        api.shot(boss.x, boss.y + boss.r * 0.6,
          Math.cos(ang) * bs, Math.sin(ang) * bs);
      }
    } else if (phase === 2) {
      // Fase II: tembakan terarah + semburan radial 6 arah.
      boss.shotTimer -= dt;
      boss.radialTimer -= dt;
      if (boss.shotTimer <= 0 && boss.y > 0) {
        boss.shotTimer = api.shotEvery * 1.25;
        var ang2 = Math.atan2(player.y - boss.y, player.x - boss.x);
        var bs2 = 200 + api.wave * 6;
        api.shot(boss.x, boss.y + boss.r * 0.6,
          Math.cos(ang2) * bs2, Math.sin(ang2) * bs2);
      }
      if (boss.radialTimer <= 0 && boss.y > 0) {
        boss.radialTimer = 2.4;
        for (var i = 0; i < 6; i++) {
          var a = (i / 6) * Math.PI * 2 + boss.rot * 0.5;
          api.shot(boss.x, boss.y, Math.cos(a) * 165, Math.sin(a) * 165);
        }
        api.burst(boss.x, boss.y, '#ff2fb3', 18, 260);
      }
    } else {
      // Fase III: spiral ganda + memanggil pemburu.
      boss.shotTimer -= dt;
      boss.chaserTimer -= dt;
      if (boss.shotTimer <= 0 && boss.y > 0) {
        boss.shotTimer = 0.5;
        boss._spiral += 0.55;
        var bs3 = 185 + api.wave * 3; // spiral makin cepat tiap gelombang
        api.shot(boss.x, boss.y,
          Math.cos(boss._spiral) * bs3, Math.sin(boss._spiral) * bs3);
        api.shot(boss.x, boss.y,
          Math.cos(boss._spiral + Math.PI) * bs3,
          Math.sin(boss._spiral + Math.PI) * bs3);
      }
      if (boss.chaserTimer <= 0 && boss.y > 0) {
        boss.chaserTimer = 5;
        api.chaser(boss.x, boss.y + 40);
        api.float(boss.x, boss.y + 90, 'VOID MAW MEMANGGIL PEMBURU!', '#c44dff');
      }
    }
  }

  global.LUMEN_BOSS = {
    phaseOf: phaseOf,
    update: update
  };
})(typeof window !== 'undefined' ? window : globalThis);
