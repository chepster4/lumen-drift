// LUMEN DRIFT — main.js
// Titik masuk game: merangkai config, input, audio, world, dan render
// menjadi satu loop. Mengatur alur title -> main -> jeda -> game over,
// skor terbaik (localStorage), dan mode screenshot (?shot=...).
(function (global) {
  'use strict';

  var BEST_KEY = 'lumen-drift-best';

  function loadBest() {
    try {
      var v = parseInt(window.localStorage.getItem(BEST_KEY) || '0', 10);
      return isFinite(v) ? v : 0;
    } catch (e) { return 0; }
  }

  function saveBest(v) {
    try { window.localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* abaikan */ }
  }

  function boot() {
    var canvas = document.getElementById('game');
    var world = global.createWorld();
    var input = global.createInput(canvas);
    var audio = global.createAudio();
    var renderer = global.createRenderer(canvas);

    world.best = loadBest();

    // Mode screenshot: bangun adegan, render SATU frame, berhenti.
    var shot = global.setupShot(world);
    if (shot) {
      renderer.render(world, 0.016);
      document.title = 'LUMEN DRIFT — shot ' + shot.shot;
      return;
    }

    var last = performance.now();
    var running = true;

    function handleKeys() {
      // Mute kapan saja.
      if (input.take('KeyM')) {
        audio.setMuted(!audio.isMuted());
      }
      if (world.state === 'title') {
        // Pilih kesulitan: 1/2/3 atau panah kiri-kanan.
        if (input.take('Digit1')) world.setDifficulty(0);
        else if (input.take('Digit2')) world.setDifficulty(1);
        else if (input.take('Digit3')) world.setDifficulty(2);
        else if (input.take('ArrowLeft')) world.setDifficulty((world.diffIndex + 2) % 3);
        else if (input.take('ArrowRight')) world.setDifficulty((world.diffIndex + 1) % 3);
        if (input.take('Enter') || input.take('Space') || input.mouse.down) {
          audio.unlock();
          audio.click();
          audio.startMusic();
          world.reset();
          input.clearPresses();
        }
        return;
      }
      if (world.state === 'shop') {
        // Toko: 1-5 beli langsung, ↑↓ pilih, Enter beli pilihan, Spasi lanjut.
        if (input.take('Digit1')) { if (world.shop.buy(world, 0)) audio.powerup(); }
        else if (input.take('Digit2')) { if (world.shop.buy(world, 1)) audio.powerup(); }
        else if (input.take('Digit3')) { if (world.shop.buy(world, 2)) audio.powerup(); }
        else if (input.take('Digit4')) { if (world.shop.buy(world, 3)) audio.powerup(); }
        else if (input.take('Digit5')) { if (world.shop.buy(world, 4)) audio.powerup(); }
        else if (input.take('ArrowUp')) { world.shop.selected = (world.shop.selected + 4) % 5; audio.click(); }
        else if (input.take('ArrowDown')) { world.shop.selected = (world.shop.selected + 1) % 5; audio.click(); }
        else if (input.take('Enter')) { if (world.shop.buy(world, world.shop.selected)) audio.powerup(); }
        else if (input.take('Space') || input.take('KeyQ')) {
          world.closeShop();
          audio.click();
        }
        return;
      }
      if (world.state === 'playing') {
        if (input.take('KeyP') || input.take('Space')) {
          world.state = 'paused';
          audio.click();
        } else if (input.take('KeyR')) {
          // Mulai ulang cepat tanpa lewat game over.
          world.reset();
          audio.click();
        }
        return;
      }
      if (world.state === 'paused') {
        if (input.take('KeyP') || input.take('Space')) {
          world.state = 'playing';
          audio.click();
        } else if (input.take('KeyR')) {
          world.reset();
        }
        return;
      }
      if (world.state === 'over') {
        if (input.take('KeyR') || input.take('Enter') || input.take('Space') || input.mouse.down) {
          audio.click();
          world.reset();
          input.clearPresses();
        }
      }
    }

    function pumpAudioEvents() {
      var evs = world.drainEvents();
      for (var i = 0; i < evs.length; i++) {
        var e = evs[i];
        if (e.type === 'collect') audio.collect(e.combo);
        else if (e.type === 'hit') audio.hit();
        else if (e.type === 'powerup') audio.powerup();
        else if (e.type === 'bossDown') audio.bossDown();
        else if (e.type === 'bossHit') audio.bossHit();
        else if (e.type === 'shieldBreak') audio.shieldBreak();
        else if (e.type === 'waveClear') audio.waveClear();
        else if (e.type === 'gameover') { audio.gameOver(); audio.stopMusic(); }
        else if (e.type === 'boss') audio.powerup();
        else if (e.type === 'shopOpen') audio.waveClear();
        else if (e.type === 'bossPhase') audio.bossHit();
        else if (e.type === 'buy') audio.powerup();
        else if (e.type === 'guardSave') audio.shieldBreak();
      }
    }

    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      handleKeys();
      // Di title, dunia demo tetap bergerak pelan (lumen/meteor melayang).
      if (world.state === 'title') {
        world.time += dt;
        for (var i = 0; i < world.lumens.length; i++) {
          var l = world.lumens[i];
          l.phase += dt * 3;
          l.x += l.vx * dt; l.y += l.vy * dt;
          if (l.x < 20 || l.x > 1280 - 20) l.vx *= -1;
          if (l.y < 80 || l.y > 720 - 20) l.vy *= -1;
        }
        for (var j = 0; j < world.meteors.length; j++) {
          var m = world.meteors[j];
          m.x += m.vx * dt * 0.4; m.y += m.vy * dt * 0.4;
          m.rot += m.spin * dt * 0.4;
          if (m.x < -60) m.x = 1280 + 50;
          if (m.x > 1280 + 60) m.x = -50;
          if (m.y < -60) m.y = 720 + 50;
          if (m.y > 720 + 60) m.y = -50;
        }
      } else if (world.state === 'playing') {
        world.update(dt, input);
        pumpAudioEvents();
        if (world.score > world.best) {
          world.best = world.score;
          saveBest(world.best);
        }
      } else if (world.state === 'shop') {
        // Toko membekukan permainan; event suara tetap dipompa.
        pumpAudioEvents();
      }
      renderer.render(world, dt);
      requestAnimationFrame(frame);
    }

    // Arena demo di belakang title screen (lebih ramai dari sebelumnya).
    (function demoScene() {
      world.state = 'title';
      world.seed(7);
      for (var i = 0; i < 12; i++) world.spawnLumen(true);
      for (var j = 0; j < 6; j++) world.spawnMeteor(true);
      world.useRandom();
    })();

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && world.state === 'playing') world.state = 'paused';
    });

    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
