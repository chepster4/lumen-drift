// LUMEN DRIFT — audio.js
// Semua suara dibuat dengan WebAudio dari osilator + noise, tanpa file.
// SFX: kumpul lumen, kena meteor, power-up, boss, klik UI.
// Musik: loop bassline + arpeggio ringan, dijadwalkan per langkah ketuk.
(function (global) {
  'use strict';

  function createAudio() {
    var ctx = null;
    var master = null;
    var sfxBus = null;
    var musicBus = null;
    var muted = false;
    var musicTimer = null;
    var step = 0;

    // Tangga nada minor yang dipakai musik + SFX kumpul (A minor pentatonik).
    var SCALE = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];

    function ensure() {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return true;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.9;
      sfxBus.connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.34;
      musicBus.connect(master);
      return true;
    }

    // Satu nada osilator dengan envelope attack/decay sederhana.
    function tone(freq, dur, type, vol, when, slideTo, bus) {
      if (!ctx) return;
      var t0 = when || ctx.currentTime;
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(bus || sfxBus);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    }

    // Ledakan noise pendek (tabrakan, ledakan boss).
    function noiseBurst(dur, vol, lowpass) {
      if (!ctx) return;
      var len = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 900;
      var g = ctx.createGain();
      g.gain.value = vol;
      src.connect(filter);
      filter.connect(g);
      g.connect(sfxBus);
      src.start();
    }

    function collect(combo) {
      if (!ensure()) return;
      var idx = Math.min(SCALE.length - 1, 2 + Math.floor(combo / 2));
      tone(SCALE[idx], 0.16, 'sine', 0.5);
      tone(SCALE[idx] * 2, 0.12, 'triangle', 0.22, ctx.currentTime + 0.02);
    }

    function hit() {
      if (!ensure()) return;
      tone(160, 0.35, 'sawtooth', 0.55, 0, 42);
      noiseBurst(0.28, 0.5, 700);
    }

    function powerup() {
      if (!ensure()) return;
      var t = ctx.currentTime;
      tone(523.25, 0.12, 'triangle', 0.4, t);
      tone(659.25, 0.12, 'triangle', 0.4, t + 0.09);
      tone(783.99, 0.22, 'triangle', 0.45, t + 0.18);
    }

    function bossDown() {
      if (!ensure()) return;
      var t = ctx.currentTime;
      tone(110, 0.5, 'square', 0.4, t, 55);
      noiseBurst(0.5, 0.6, 1200);
      tone(880, 0.3, 'sine', 0.3, t + 0.15, 1760);
    }

    // Perisai pecah: denting kaca + desis.
    function shieldBreak() {
      if (!ensure()) return;
      var t = ctx.currentTime;
      tone(1244, 0.12, 'triangle', 0.35, t);
      tone(932, 0.18, 'triangle', 0.3, t + 0.06);
      noiseBurst(0.18, 0.35, 3200);
    }

    // Orb menghantam boss: pukulan berat bernada rendah.
    function bossHit() {
      if (!ensure()) return;
      tone(220, 0.14, 'square', 0.4, 0, 90);
      noiseBurst(0.1, 0.3, 900);
    }

    function click() {
      if (!ensure()) return;
      tone(660, 0.07, 'square', 0.25);
    }

    function waveClear() {
      if (!ensure()) return;
      var t = ctx.currentTime;
      tone(392.0, 0.14, 'triangle', 0.4, t);
      tone(523.25, 0.14, 'triangle', 0.4, t + 0.12);
      tone(659.25, 0.26, 'triangle', 0.45, t + 0.24);
    }

    function gameOver() {
      if (!ensure()) return;
      var t = ctx.currentTime;
      tone(392.0, 0.3, 'triangle', 0.4, t, 370);
      tone(311.13, 0.3, 'triangle', 0.4, t + 0.25, 293);
      tone(233.08, 0.6, 'triangle', 0.42, t + 0.5, 220);
    }

    // Musik: bass A-minor per ketuk + arpeggio tiap 2 ketuk.
    function startMusic() {
      if (!ensure() || musicTimer) return;
      var bpm = 112;
      var stepDur = 60 / bpm / 2; // ketuk 8th
      var bassLine = [55.0, 0, 55.0, 65.41, 55.0, 0, 49.0, 58.27];
      step = 0;
      musicTimer = setInterval(function () {
        if (muted || !ctx) return;
        var now = ctx.currentTime + 0.05;
        var b = bassLine[step % bassLine.length];
        if (b) tone(b, stepDur * 1.8, 'sawtooth', 0.16, now, 0, musicBus);
        if (step % 2 === 0) {
          var arp = SCALE[(step / 2) % SCALE.length] * 2;
          tone(arp, stepDur * 0.9, 'sine', 0.07, now, 0, musicBus);
        }
        step++;
      }, stepDur * 1000);
    }

    function stopMusic() {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    }

    function setMuted(m) {
      muted = !!m;
      if (master) master.gain.value = muted ? 0 : 0.5;
    }

    function isMuted() { return muted; }

    return {
      unlock: ensure,
      collect: collect,
      hit: hit,
      powerup: powerup,
      bossDown: bossDown,
      bossHit: bossHit,
      shieldBreak: shieldBreak,
      click: click,
      waveClear: waveClear,
      gameOver: gameOver,
      startMusic: startMusic,
      stopMusic: stopMusic,
      setMuted: setMuted,
      isMuted: isMuted
    };
  }

  global.createAudio = createAudio;
})(typeof window !== 'undefined' ? window : globalThis);
