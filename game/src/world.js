// LUMEN DRIFT — world.js
// Semua aturan dan state permainan: pemain, lumen, meteor, power-up,
// gelombang, mini-boss, kombo, skor, nyawa, dan tabrakan.
// Tidak menggambar apa pun; render.js yang membaca state ini.
(function (global) {
  'use strict';

  var CFG = global.LUMEN_CONFIG;

  var POWER_KINDS = ['shield', 'slow', 'magnet'];

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function dist2(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  function createWorld() {
    var rng = Math.random;
    var state = 'title'; // title | playing | paused | over
    var time = 0;
    var wave = 1;
    var waveTime = 0;
    var score = 0;
    var best = 0;
    var combo = 0;
    var comboTimer = 0;
    var bestCombo = 0;
    var lives = CFG.player.startLives;
    var collected = 0;
    var meteorsDodged = 0;

    var player = {
      x: CFG.WIDTH / 2, y: CFG.HEIGHT / 2 + 80,
      vx: 0, vy: 0, r: CFG.player.radius,
      invuln: 0, shield: 0, slow: 0, magnet: 0,
      trail: []
    };

    var lumens = [];
    var meteors = [];
    var powerups = [];
    var particles = [];
    var floats = []; // teks skor melayang (+10, x3 ...)
    var boss = null; // {x,y,vx,vy,r,hp,maxHp,shotTimer}
    var bossActive = false;

    var lumenTimer = 0;
    var meteorTimer = 0;
    var powerTimer = CFG.powerup.spawnEvery;

    var shake = 0;
    var flash = 0;
    var slowFactor = 1; // 0.45 saat slow-mo aktif
    var events = [];    // antrean event untuk audio & render (collect/hit/...)

    function seed(n) { rng = global.mulberry32(n); }
    function useRandom() { rng = Math.random; }

    function reset() {
      state = 'playing';
      time = 0; wave = 1; waveTime = 0;
      score = 0; combo = 0; comboTimer = 0; bestCombo = 0;
      lives = CFG.player.startLives;
      collected = 0; meteorsDodged = 0;
      player.x = CFG.WIDTH / 2; player.y = CFG.HEIGHT / 2 + 80;
      player.vx = 0; player.vy = 0;
      player.invuln = 0; player.shield = 0; player.slow = 0; player.magnet = 0;
      player.trail = [];
      lumens = []; meteors = []; powerups = [];
      particles = []; floats = [];
      boss = null; bossActive = false;
      lumenTimer = 0; meteorTimer = 0.6;
      powerTimer = CFG.powerup.spawnEvery;
      shake = 0; flash = 0; slowFactor = 1;
      events = [];
      // Arena awal langsung hidup: beberapa lumen + meteor sejak detik 0.
      for (var i = 0; i < 6; i++) spawnLumen(true);
      for (var j = 0; j < 3; j++) spawnMeteor(true);
    }

    function multiplier() {
      return Math.min(CFG.lumen.maxMultiplier, 1 + Math.floor(combo / 5));
    }

    function spawnLumen(anywhere) {
      if (lumens.length >= CFG.lumen.maxOnField) return;
      var margin = 60;
      var x, y, tries = 0;
      do {
        x = margin + rng() * (CFG.WIDTH - margin * 2);
        y = 90 + rng() * (CFG.HEIGHT - 180);
        tries++;
      } while (tries < 8 && dist2(x, y, player.x, player.y) < 120 * 120 && !anywhere);
      lumens.push({
        x: x, y: y, r: CFG.lumen.radius,
        phase: rng() * Math.PI * 2,
        kind: rng() < CFG.lumen.goldChance ? 'gold' : 'cyan', // gold = 5x nilai
        vx: (rng() - 0.5) * 24, vy: (rng() - 0.5) * 24
      });
    }

    function spawnMeteor(anywhere) {
      if (meteors.length >= CFG.meteor.maxOnField) return;
      var edge = Math.floor(rng() * 4);
      var x, y, vx, vy;
      var speed = CFG.meteor.baseSpeed + CFG.meteor.speedPerWave * (wave - 1);
      speed *= 0.8 + rng() * 0.5;
      if (edge === 0) { x = -30; y = rng() * CFG.HEIGHT; vx = speed; vy = (rng() - 0.5) * speed; }
      else if (edge === 1) { x = CFG.WIDTH + 30; y = rng() * CFG.HEIGHT; vx = -speed; vy = (rng() - 0.5) * speed; }
      else if (edge === 2) { x = rng() * CFG.WIDTH; y = -30; vx = (rng() - 0.5) * speed; vy = speed; }
      else { x = rng() * CFG.WIDTH; y = CFG.HEIGHT + 30; vx = (rng() - 0.5) * speed; vy = -speed; }
      if (anywhere) {
        x = 60 + rng() * (CFG.WIDTH - 120);
        y = 90 + rng() * (CFG.HEIGHT - 180);
      }
      meteors.push({
        x: x, y: y, vx: vx, vy: vy,
        r: CFG.meteor.baseRadius + rng() * CFG.meteor.radiusJitter,
        rot: rng() * Math.PI * 2,
        spin: (rng() - 0.5) * CFG.meteor.spinSpeed * 2,
        grazed: false
      });
    }

    function spawnPowerup() {
      var kind = POWER_KINDS[Math.floor(rng() * POWER_KINDS.length)];
      powerups.push({
        x: 80 + rng() * (CFG.WIDTH - 160),
        y: 110 + rng() * (CFG.HEIGHT - 220),
        r: CFG.powerup.radius, kind: kind,
        phase: rng() * Math.PI * 2
      });
    }

    function spawnBoss() {
      boss = {
        x: CFG.WIDTH / 2, y: -90, vy: 55,
        vx: 60, r: CFG.wave.bossRadius,
        hp: CFG.wave.bossHpPerWave + wave,
        maxHp: CFG.wave.bossHpPerWave + wave,
        shotTimer: 1.2, rot: 0
      };
      bossActive = true;
      events.push({ type: 'boss' });
    }

    function burst(x, y, color, n, speed) {
      for (var i = 0; i < n; i++) {
        if (particles.length >= CFG.fx.particleCap) return;
        var a = rng() * Math.PI * 2;
        var s = (0.3 + rng() * 0.7) * (speed || 220);
        particles.push({
          x: x, y: y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 0.5 + rng() * 0.5, maxLife: 1,
          size: 2 + rng() * 4, color: color
        });
      }
    }

    function addFloat(x, y, text, color) {
      floats.push({ x: x, y: y, text: text, color: color, life: 1.1 });
    }

    function collectLumen(l) {
      combo++;
      comboTimer = CFG.lumen.comboWindow;
      if (combo > bestCombo) bestCombo = combo;
      var mult = multiplier();
      var value = CFG.lumen.baseValue * mult * (l.kind === 'gold' ? 5 : 1);
      score += value;
      collected++;
      burst(l.x, l.y, l.kind === 'gold' ? CFG.palette.gold : CFG.palette.cyan, 14, 200);
      addFloat(l.x, l.y - 18, '+' + value + (mult > 1 ? '  x' + mult : ''), l.kind === 'gold' ? CFG.palette.gold : CFG.palette.cyanSoft);
      if (mult > 1 && combo % 5 === 0) flash = CFG.fx.flashOnCombo;
      events.push({ type: 'collect', combo: combo });
    }

    function hitMeteor(m) {
      if (player.invuln > 0) return;
      if (player.shield > 0) {
        player.shield = 0;
        burst(player.x, player.y, CFG.palette.shield, 26, 300);
        shake = CFG.fx.shakeOnHit;
        player.invuln = CFG.player.invulnTime;
        events.push({ type: 'shieldBreak' });
        removeMeteor(m);
        return;
      }
      lives--;
      combo = 0; comboTimer = 0;
      burst(player.x, player.y, CFG.palette.danger, 30, 320);
      shake = CFG.fx.shakeOnHit;
      player.invuln = CFG.player.invulnTime;
      events.push({ type: 'hit' });
      removeMeteor(m);
      if (lives <= 0) gameOver();
    }

    function removeMeteor(m) {
      var i = meteors.indexOf(m);
      if (i >= 0) meteors.splice(i, 1);
    }

    function gameOver() {
      state = 'over';
      if (score > best) best = score;
      events.push({ type: 'gameover' });
      burst(player.x, player.y, CFG.palette.white, 50, 380);
    }

    function applyPowerup(p) {
      if (p.kind === 'shield') player.shield = CFG.powerup.shieldTime;
      else if (p.kind === 'slow') player.slow = CFG.powerup.slowTime;
      else player.magnet = CFG.powerup.magnetTime;
      burst(p.x, p.y, CFG.palette[p.kind === 'slow' ? 'slowmo' : p.kind], 20, 240);
      addFloat(p.x, p.y - 20, p.kind.toUpperCase() + '!', CFG.palette.white);
      events.push({ type: 'powerup', kind: p.kind });
    }

    function updatePlayer(dt, input) {
      var dir = input.direction();
      var p = CFG.player;
      if (dir.active) {
        player.vx += dir.x * p.accel * dt;
        player.vy += dir.y * p.accel * dt;
      } else if (input.mouse.inside && input.consumeMouseMoved()) {
        // Mouse: orb meluncur mengikuti pointer.
        var dx = input.mouse.x - player.x;
        var dy = input.mouse.y - player.y;
        player.vx += dx * p.mousePull * dt * 10;
        player.vy += dy * p.mousePull * dt * 10;
      }
      // Redaman + batas kecepatan.
      var damp = Math.exp(-p.friction * dt);
      player.vx *= damp; player.vy *= damp;
      var sp = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
      if (sp > p.maxSpeed) {
        player.vx *= p.maxSpeed / sp;
        player.vy *= p.maxSpeed / sp;
      }
      player.x = clamp(player.x + player.vx * dt, p.radius, CFG.WIDTH - p.radius);
      player.y = clamp(player.y + player.vy * dt, p.radius + 56, CFG.HEIGHT - p.radius);
      if (player.invuln > 0) player.invuln -= dt;
      if (player.shield > 0) player.shield -= dt;
      if (player.slow > 0) player.slow -= dt;
      if (player.magnet > 0) player.magnet -= dt;
      // Trail orb.
      player.trail.unshift({ x: player.x, y: player.y });
      if (player.trail.length > p.trailLength) player.trail.pop();
    }

    function update(dt, input) {
      if (state !== 'playing') return;
      slowFactor = player.slow > 0 ? 0.45 : 1;
      var sdt = dt * slowFactor;
      time += dt;
      waveTime += dt;

      // Gelombang selesai -> bonus + gelombang berikutnya (boss tiap 5).
      if (waveTime >= CFG.wave.duration) {
        waveTime = 0;
        wave++;
        score += CFG.scoring.waveClear;
        addFloat(CFG.WIDTH / 2, CFG.HEIGHT / 2 - 60, 'WAVE ' + wave + '  +' + CFG.scoring.waveClear, CFG.palette.gold);
        events.push({ type: 'waveClear', wave: wave });
        if (wave % CFG.wave.bossEvery === 0) spawnBoss();
      }

      updatePlayer(sdt, input);

      // Kombo menurun kalau terlalu lama tanpa kumpul.
      if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) combo = 0;
      }

      // Spawn berkala.
      lumenTimer -= dt;
      if (lumenTimer <= 0) {
        lumenTimer = CFG.lumen.spawnEvery * (0.8 + rng() * 0.4);
        spawnLumen(false);
      }
      meteorTimer -= dt;
      if (meteorTimer <= 0) {
        meteorTimer = Math.max(CFG.meteor.minSpawnEvery,
          CFG.meteor.spawnEvery - CFG.meteor.spawnShrink * (wave - 1)) * (0.75 + rng() * 0.5);
        spawnMeteor(false);
      }
      powerTimer -= dt;
      if (powerTimer <= 0) {
        powerTimer = CFG.powerup.spawnEvery;
        spawnPowerup();
      }

      // Lumen: gerak pelan, magnet, koleksi.
      for (var i = lumens.length - 1; i >= 0; i--) {
        var l = lumens[i];
        l.phase += dt * CFG.lumen.pulseSpeed;
        l.x += l.vx * sdt; l.y += l.vy * sdt;
        if (player.magnet > 0) {
          var d2 = dist2(l.x, l.y, player.x, player.y);
          if (d2 < CFG.powerup.magnetRadius * CFG.powerup.magnetRadius) {
            var d = Math.sqrt(d2) || 1;
            l.x += (player.x - l.x) / d * 420 * sdt;
            l.y += (player.y - l.y) / d * 420 * sdt;
          }
        }
        if (l.x < 20 || l.x > CFG.WIDTH - 20) l.vx *= -1;
        if (l.y < 80 || l.y > CFG.HEIGHT - 20) l.vy *= -1;
        if (dist2(l.x, l.y, player.x, player.y) < (l.r + player.r) * (l.r + player.r)) {
          collectLumen(l);
          lumens.splice(i, 1);
        }
      }

      // Meteor: gerak, pantul di tepi, graze, tabrakan.
      for (var j = meteors.length - 1; j >= 0; j--) {
        var m = meteors[j];
        m.x += m.vx * sdt; m.y += m.vy * sdt;
        m.rot += m.spin * sdt;
        if (m.x < -60 || m.x > CFG.WIDTH + 60 || m.y < -60 || m.y > CFG.HEIGHT + 60) {
          meteors.splice(j, 1);
          meteorsDodged++;
          continue;
        }
        var dd = dist2(m.x, m.y, player.x, player.y);
        var rr = (m.r + player.r) * (m.r + player.r);
        if (dd < rr) {
          hitMeteor(m);
        } else if (!m.grazed && dd < (m.r + player.r + 26) * (m.r + player.r + 26)) {
          m.grazed = true;
          score += CFG.scoring.meteorGraze;
          addFloat(m.x, m.y - m.r - 8, 'GRAZE +' + CFG.scoring.meteorGraze, CFG.palette.magentaSoft);
        }
      }

      // Power-up: koleksi.
      for (var k = powerups.length - 1; k >= 0; k--) {
        var pu = powerups[k];
        pu.phase += dt * 3;
        if (dist2(pu.x, pu.y, player.x, player.y) < (pu.r + player.r) * (pu.r + player.r)) {
          applyPowerup(pu);
          powerups.splice(k, 1);
        }
      }

      // Boss: masuk dari atas, melayang, menembak meteor kecil.
      if (bossActive && boss) {
        if (boss.y < 130) boss.y += boss.vy * sdt;
        else {
          boss.x += boss.vx * sdt;
          if (boss.x < 120 || boss.x > CFG.WIDTH - 120) boss.vx *= -1;
        }
        boss.rot += sdt * 0.6;
        boss.shotTimer -= sdt;
        if (boss.shotTimer <= 0 && boss.y > 0) {
          boss.shotTimer = CFG.wave.bossShotEvery;
          var ang = Math.atan2(player.y - boss.y, player.x - boss.x);
          var bs = 190 + wave * 6;
          meteors.push({
            x: boss.x, y: boss.y + boss.r * 0.6,
            vx: Math.cos(ang) * bs, vy: Math.sin(ang) * bs,
            r: 13, rot: 0, spin: 3, grazed: false
          });
        }
        // Orb menabrak boss = hit ke boss (bukan mati).
        if (dist2(boss.x, boss.y, player.x, player.y) < (boss.r + player.r) * (boss.r + player.r)) {
          boss.hp--;
          score += CFG.scoring.bossHit;
          burst(player.x, player.y, CFG.palette.magenta, 12, 240);
          player.vx = (player.x - boss.x) * 6;
          player.vy = (player.y - boss.y) * 6;
          player.invuln = 0.8;
          events.push({ type: 'bossHit' });
          if (boss.hp <= 0) {
            score += CFG.wave.bossScore;
            burst(boss.x, boss.y, CFG.palette.magenta, 60, 420);
            burst(boss.x, boss.y, CFG.palette.gold, 40, 320);
            addFloat(boss.x, boss.y, 'BOSS DOWN! +' + CFG.wave.bossScore, CFG.palette.gold);
            // Hujan lumen sebagai hadiah: boss yang kalah memuntahkan cahaya.
            for (var s = 0; s < CFG.wave.bossLumenShower; s++) spawnLumen(true);
            shake = CFG.fx.shakeOnBoss;
            boss = null; bossActive = false;
            events.push({ type: 'bossDown' });
          }
        }
      }

      // Partikel & teks melayang.
      for (var a = particles.length - 1; a >= 0; a--) {
        var pt = particles[a];
        pt.x += pt.vx * sdt; pt.y += pt.vy * sdt;
        pt.vx *= Math.exp(-2 * sdt); pt.vy *= Math.exp(-2 * sdt);
        pt.life -= sdt;
        if (pt.life <= 0) particles.splice(a, 1);
      }
      for (var b = floats.length - 1; b >= 0; b--) {
        floats[b].y -= 34 * dt;
        floats[b].life -= dt;
        if (floats[b].life <= 0) floats.splice(b, 1);
      }
      if (shake > 0) shake = Math.max(0, shake - dt * 34);
      if (flash > 0) flash = Math.max(0, flash - dt * 1.4);
    }

    function drainEvents() {
      var out = events;
      events = [];
      return out;
    }

    return {
      // state (dibaca render.js)
      get state() { return state; },
      set state(v) { state = v; },
      get time() { return time; },
      set time(v) { time = v; },
      get wave() { return wave; },
      get waveTime() { return waveTime; },
      get score() { return score; },
      set score(v) { score = v; },
      get best() { return best; },
      set best(v) { best = v; },
      get combo() { return combo; },
      set combo(v) { combo = v; },
      get comboTimer() { return comboTimer; },
      set comboTimer(v) { comboTimer = v; },
      get bestCombo() { return bestCombo; },
      set bestCombo(v) { bestCombo = v; },
      get lives() { return lives; },
      set lives(v) { lives = v; },
      get collected() { return collected; },
      set collected(v) { collected = v; },
      get meteorsDodged() { return meteorsDodged; },
      get player() { return player; },
      get lumens() { return lumens; },
      get meteors() { return meteors; },
      get powerups() { return powerups; },
      get particles() { return particles; },
      get floats() { return floats; },
      get boss() { return boss; },
      get bossActive() { return bossActive; },
      get shake() { return shake; },
      get flash() { return flash; },
      get slowFactor() { return slowFactor; },
      multiplier: multiplier,
      reset: reset,
      update: update,
      gameOver: gameOver,
      drainEvents: drainEvents,
      seed: seed,
      useRandom: useRandom,
      spawnLumen: spawnLumen,
      spawnMeteor: spawnMeteor,
      spawnPowerup: spawnPowerup,
      spawnBoss: spawnBoss,
      burst: burst,
      addFloat: addFloat,
      // Untuk mode screenshot: isi arena dengan adegan ramai deterministik.
      setBoss: function (b) { boss = b; bossActive = !!b; },
      setWave: function (w) { wave = w; }
    };
  }

  global.createWorld = createWorld;
})(typeof window !== 'undefined' ? window : globalThis);
