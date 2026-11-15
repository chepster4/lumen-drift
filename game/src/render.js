// LUMEN DRIFT — render.js
// Menggambar seluruh game di canvas: latar bintang parallax, arena,
// orb + trail, lumen, meteor, boss, partikel, HUD BESAR, dan layar
// title / pause / game over. Hanya membaca state world, tidak mengubahnya.
(function (global) {
  'use strict';

  var CFG = global.LUMEN_CONFIG;
  var P = CFG.palette;
  var W = CFG.WIDTH, H = CFG.HEIGHT;

  function createRenderer(canvas) {
    var ctx = canvas.getContext('2d');
    var stars = [];
    var nebulae = [];
    var tGlobal = 0;
    // RNG tetap (seed 20261116) supaya latar bintang identik di setiap load
    // — screenshot ?shot=... harus byte-identik bila diambil ulang.
    var rng = global.mulberry32(20261116);

    // Bintang parallax: 3 lapis kedalaman, posisi tetap per sesi.
    for (var i = 0; i < CFG.fx.starCount; i++) {
      stars.push({
        x: rng() * W, y: rng() * H,
        z: 0.25 + rng() * 0.75,
        r: 0.6 + rng() * 1.6,
        tw: rng() * Math.PI * 2
      });
    }
    for (var n = 0; n < 5; n++) {
      nebulae.push({
        x: rng() * W, y: rng() * H,
        r: 160 + rng() * 220,
        color: n % 2 ? P.nebulaA : P.nebulaB
      });
    }

    function rr(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawBackground(dt, scrollX) {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, P.bgTop);
      g.addColorStop(1, P.bgBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Nebula lembut.
      for (var n = 0; n < nebulae.length; n++) {
        var nb = nebulae[n];
        var ng = ctx.createRadialGradient(nb.x, nb.y, 0, nb.x, nb.y, nb.r);
        ng.addColorStop(0, nb.color);
        ng.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ng;
        ctx.fillRect(nb.x - nb.r, nb.y - nb.r, nb.r * 2, nb.r * 2);
      }
      // Bintang berkelip, bergeser pelan (parallax).
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.tw += dt * 1.5;
        var a = 0.35 + 0.65 * Math.abs(Math.sin(s.tw));
        var sx = (s.x - scrollX * s.z * 24) % W;
        if (sx < 0) sx += W;
        ctx.globalAlpha = a;
        ctx.fillStyle = s.z > 0.7 ? P.white : P.cyanSoft;
        ctx.beginPath();
        ctx.arc(sx, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawLumen(l) {
      var pulse = 1 + 0.18 * Math.sin(l.phase);
      var r = l.r * pulse;
      var col = l.kind === 'gold' ? P.gold : P.cyan;
      var glow = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r * 3);
      glow.addColorStop(0, col);
      glow.addColorStop(0.35, col + '55');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(l.x, l.y, r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = P.white;
      ctx.beginPath();
      ctx.arc(l.x, l.y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(l.x, l.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawMeteor(m) {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.rot);
      var glow = ctx.createRadialGradient(0, 0, m.r * 0.4, 0, 0, m.r * 2.1);
      glow.addColorStop(0, 'rgba(255,59,78,0.55)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, m.r * 2.1, 0, Math.PI * 2);
      ctx.fill();
      // Batu bersudut: poligon acak tapi tetap (dari rotasi).
      ctx.fillStyle = '#3a1020';
      ctx.strokeStyle = P.danger;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      var pts = 7;
      for (var i = 0; i < pts; i++) {
        var a = (i / pts) * Math.PI * 2;
        var rr2 = m.r * (0.78 + 0.28 * Math.abs(Math.sin(i * 2.7 + 1.3)));
        var px = Math.cos(a) * rr2, py = Math.sin(a) * rr2;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Retakan magma.
      ctx.strokeStyle = P.gold;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-m.r * 0.4, -m.r * 0.2);
      ctx.lineTo(0, m.r * 0.1);
      ctx.lineTo(m.r * 0.45, -m.r * 0.35);
      ctx.stroke();
      ctx.restore();
    }

    function drawBoss(b) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      var glow = ctx.createRadialGradient(0, 0, b.r * 0.4, 0, 0, b.r * 2);
      glow.addColorStop(0, 'rgba(255,47,179,0.5)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, b.r * 2, 0, Math.PI * 2);
      ctx.fill();
      // Cakram bergerigi VOID MAW.
      ctx.fillStyle = '#2a0a2e';
      ctx.strokeStyle = P.magenta;
      ctx.lineWidth = 4;
      ctx.beginPath();
      var teeth = 12;
      for (var i = 0; i < teeth * 2; i++) {
        var a = (i / (teeth * 2)) * Math.PI * 2;
        var rad = i % 2 === 0 ? b.r : b.r * 0.82;
        var px = Math.cos(a) * rad, py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Mata inti.
      var eye = ctx.createRadialGradient(0, 0, 0, 0, 0, b.r * 0.45);
      eye.addColorStop(0, P.white);
      eye.addColorStop(0.5, P.magenta);
      eye.addColorStop(1, 'rgba(255,47,179,0)');
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.arc(0, 0, b.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Nama boss + bar HP di BAWAH boss (atas layar ditempati HUD).
      ctx.fillStyle = P.magenta;
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VOID MAW', b.x, b.y + b.r + 34);
      // Bar HP boss.
      var bw = 260, bx = b.x - bw / 2, by = b.y + b.r + 44;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      rr(bx, by, bw, 14, 7);
      ctx.fill();
      ctx.fillStyle = P.magenta;
      rr(bx, by, bw * Math.max(0, b.hp / b.maxHp), 14, 7);
      ctx.fill();
      ctx.strokeStyle = P.magentaSoft;
      ctx.lineWidth = 1.5;
      rr(bx, by, bw, 14, 7);
      ctx.stroke();
    }

    function drawPowerup(p) {
      var col = p.kind === 'shield' ? P.shield : (p.kind === 'slow' ? P.slowmo : P.magnet);
      var bob = Math.sin(p.phase) * 4;
      var y = p.y + bob;
      var glow = ctx.createRadialGradient(p.x, y, 0, p.x, y, p.r * 2.6);
      glow.addColorStop(0, col);
      glow.addColorStop(0.4, col + '44');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, y, p.r * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(5,1,15,0.85)';
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var letter = p.kind === 'shield' ? 'S' : (p.kind === 'slow' ? 'T' : 'M');
      ctx.fillText(letter, p.x, y + 1);
      ctx.textBaseline = 'alphabetic';
    }

    function drawPlayer(world) {
      var pl = world.player;
      // Trail cahaya.
      for (var i = pl.trail.length - 1; i >= 0; i--) {
        var tp = pl.trail[i];
        var f = 1 - i / pl.trail.length;
        ctx.globalAlpha = f * 0.4;
        ctx.fillStyle = P.cyan;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, pl.r * f * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Perisai.
      if (pl.shield > 0) {
        ctx.strokeStyle = P.shield;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.55 + 0.35 * Math.sin(tGlobal * 6);
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, pl.r + 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Kedip saat kebal.
      if (pl.invuln > 0 && Math.floor(tGlobal * 12) % 2 === 0) return;
      var glow = ctx.createRadialGradient(pl.x, pl.y, 0, pl.x, pl.y, pl.r * 3);
      glow.addColorStop(0, 'rgba(255,255,255,0.95)');
      glow.addColorStop(0.3, P.cyan);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, pl.r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = P.white;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, pl.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = P.cyanSoft;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawParticles(world) {
      for (var i = 0; i < world.particles.length; i++) {
        var pt = world.particles[i];
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * (0.5 + pt.life / pt.maxLife), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawFloats(world) {
      ctx.textAlign = 'center';
      for (var i = 0; i < world.floats.length; i++) {
        var f = world.floats[i];
        ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    }

    function drawHud(world) {
      // Panel atas gelap tembus pandang.
      ctx.fillStyle = 'rgba(4,0,16,0.62)';
      ctx.fillRect(0, 0, W, 64);
      ctx.fillStyle = 'rgba(34,230,255,0.25)';
      ctx.fillRect(0, 64, W, 2);

      // Skor — kiri, BESAR.
      ctx.textAlign = 'left';
      ctx.fillStyle = P.cyanSoft;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('SCORE', 22, 26);
      ctx.fillStyle = P.white;
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.fillText(String(world.score), 20, 60);

      // Kombo + multiplier — tengah.
      var mult = world.multiplier();
      ctx.textAlign = 'center';
      if (world.combo >= 2) {
        ctx.fillStyle = world.combo >= 10 ? P.gold : P.magentaSoft;
        ctx.font = 'bold 34px system-ui, sans-serif';
        ctx.fillText('COMBO x' + mult + '  (' + world.combo + ')', W / 2, 44);
        // Bar sisa waktu kombo.
        var bw = 220;
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        rr(W / 2 - bw / 2, 52, bw, 7, 3);
        ctx.fill();
        ctx.fillStyle = world.combo >= 10 ? P.gold : P.magenta;
        rr(W / 2 - bw / 2, 52, bw * Math.max(0, world.comboTimer / CFG.lumen.comboWindow), 7, 3);
        ctx.fill();
      } else if (world.state !== 'over') {
        ctx.fillStyle = 'rgba(244,251,255,0.55)';
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.fillText('Kumpulkan lumen berantai untuk kombo!', W / 2, 40);
      }

      // Nyawa (hati) + gelombang — kanan.
      ctx.textAlign = 'right';
      var hearts = '';
      for (var h = 0; h < CFG.player.startLives; h++) hearts += h < world.lives ? '♥' : '♡';
      ctx.fillStyle = P.danger;
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.fillText(hearts, W - 22, 46);
      ctx.fillStyle = P.goldSoft;
      ctx.font = 'bold 22px system-ui, sans-serif';
      // Label gelombang + skor terbaik di bawah hati.
      ctx.fillStyle = P.gold;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('WAVE ' + world.wave + '   BEST ' + Math.max(world.best, world.score), W - 22, 62);

      // Bar progres gelombang di bawah panel atas (penuh = gelombang naik).
      var wp = Math.min(1, world.waveTime / CFG.wave.duration);
      ctx.fillStyle = 'rgba(155,92,255,0.35)';
      ctx.fillRect(0, 66, W * wp, 4);
      ctx.fillStyle = 'rgba(155,92,255,0.9)';
      ctx.fillRect(0, 66, 3, 4);

      // Indikator power-up aktif — kiri bawah.
      var pl = world.player;
      var y = H - 26;
      ctx.textAlign = 'left';
      ctx.font = 'bold 22px system-ui, sans-serif';
      var px = 22;
      if (pl.shield > 0) { ctx.fillStyle = P.shield; ctx.fillText('SHIELD ' + Math.ceil(pl.shield) + 's', px, y); px += 150; }
      if (pl.slow > 0) { ctx.fillStyle = P.slowmo; ctx.fillText('SLOW-MO ' + Math.ceil(pl.slow) + 's', px, y); px += 170; }
      if (pl.magnet > 0) { ctx.fillStyle = P.magnet; ctx.fillText('MAGNET ' + Math.ceil(pl.magnet) + 's', px, y); }
      // Petunjuk kontrol — kanan bawah, kecil.
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(244,251,255,0.5)';
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText('WASD / Panah / Mouse  •  P jeda  •  M suara', W - 22, y);
    }

    function centerText(text, y, size, color, font) {
      ctx.textAlign = 'center';
      ctx.font = font || ('bold ' + size + 'px system-ui, sans-serif');
      ctx.fillStyle = color;
      ctx.fillText(text, W / 2, y);
    }

    function drawTitle(world) {
      ctx.fillStyle = 'rgba(4,0,16,0.55)';
      ctx.fillRect(0, 0, W, H);
      var bob = Math.sin(tGlobal * 1.4) * 8;
      // Judul raksasa dengan glow.
      ctx.save();
      ctx.shadowColor = P.cyan;
      ctx.shadowBlur = 42;
      centerText('LUMEN', 218 + bob, 118, P.cyan);
      ctx.shadowColor = P.magenta;
      centerText('DRIFT', 322 + bob, 118, P.magenta);
      ctx.restore();
      centerText('— arcade neon: kumpulkan cahaya, hindari meteor —', 372, 26, P.goldSoft);
      // Panel cara main.
      ctx.fillStyle = 'rgba(10,4,32,0.78)';
      rr(W / 2 - 380, 408, 760, 150, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(34,230,255,0.5)';
      ctx.lineWidth = 2;
      rr(W / 2 - 380, 408, 760, 150, 16);
      ctx.stroke();
      centerText('Gerakkan orb dengan WASD / Panah / Mouse', 448, 24, P.white);
      centerText('Kumpulkan lumen berantai = kombo x8  •  Hindari meteor', 482, 22, P.cyanSoft);
      centerText('Power-up: S Perisai  •  T Slow-Mo  •  M Magnet  •  Boss tiap Wave 5', 516, 22, P.magentaSoft);
      // Ajakan mulai berkedip.
      if (Math.floor(tGlobal * 1.6) % 2 === 0) {
        centerText('TEKAN ENTER ATAU KLIK UNTUK MULAI', 612, 34, P.white);
      }
      centerText('Skor terbaik: ' + world.best, 664, 24, P.goldSoft);
    }

    function drawPaused() {
      ctx.fillStyle = 'rgba(4,0,16,0.66)';
      ctx.fillRect(0, 0, W, H);
      centerText('JEDA', 300, 84, P.cyan);
      centerText('Tekan P atau Spasi untuk lanjut  •  R untuk mulai ulang', 380, 28, P.white);
    }

    function drawGameOver(world) {
      ctx.fillStyle = 'rgba(8,0,20,0.72)';
      ctx.fillRect(0, 0, W, H);
      centerText('GAME OVER', 210, 96, P.danger);
      // Panel skor akhir.
      ctx.fillStyle = 'rgba(10,4,32,0.82)';
      rr(W / 2 - 320, 258, 640, 240, 18);
      ctx.fill();
      ctx.strokeStyle = P.magenta;
      ctx.lineWidth = 2.5;
      rr(W / 2 - 320, 258, 640, 240, 18);
      ctx.stroke();
      centerText('SKOR AKHIR', 300, 26, P.cyanSoft);
      centerText(String(world.score), 362, 64, P.white);
      var isBest = world.score >= world.best && world.score > 0;
      centerText(isBest ? '★ SKOR TERBAIK BARU! ★' : 'Skor terbaik: ' + world.best, 412, 28, P.gold);
      centerText('Wave ' + world.wave + '  •  Lumen ' + world.collected + '  •  Kombo terbaik x' + world.bestCombo, 456, 24, P.cyanSoft);
      if (Math.floor(tGlobal * 1.6) % 2 === 0) {
        centerText('TEKAN R UNTUK MAIN LAGI', 566, 34, P.white);
      }
      centerText('Enter juga bisa untuk mulai ulang', 612, 22, 'rgba(244,251,255,0.6)');
    }

    function render(world, dt) {
      tGlobal += dt;
      var sx = (world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0);
      var sy = (world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0);
      ctx.save();
      ctx.translate(sx, sy);
      drawBackground(dt, world.time * 0.4);
      // Entitas dunia (juga di title: arena demo di belakang panel).
      for (var i = 0; i < world.lumens.length; i++) drawLumen(world.lumens[i]);
      for (var j = 0; j < world.powerups.length; j++) drawPowerup(world.powerups[j]);
      for (var k = 0; k < world.meteors.length; k++) drawMeteor(world.meteors[k]);
      if (world.bossActive && world.boss) drawBoss(world.boss);
      if (world.state !== 'title') drawPlayer(world);
      drawParticles(world);
      drawFloats(world);
      if (world.state === 'playing' || world.state === 'paused') drawHud(world);
      if (world.state === 'title') drawTitle(world);
      if (world.state === 'paused') drawPaused();
      if (world.state === 'over') { drawHud(world); drawGameOver(world); }
      // Flash kombo.
      if (world.flash > 0) {
        ctx.fillStyle = 'rgba(255,210,63,' + (world.flash * 0.35) + ')';
        ctx.fillRect(-20, -20, W + 40, H + 40);
      }
      ctx.restore();
    }

    return { render: render };
  }

  global.createRenderer = createRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
