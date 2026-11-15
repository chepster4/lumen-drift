// LUMEN DRIFT — input.js
// Membaca keyboard (panah / WASD) dan mouse, lalu menyajikan satu
// vektor arah + posisi pointer yang sudah dinormalisasi ke arena.
// Tidak tahu apa-apa soal aturan game; hanya soal tombol dan pointer.
(function (global) {
  'use strict';

  var KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right'
  };

  function createInput(canvas) {
    var keys = { up: false, down: false, left: false, right: false };
    var pressed = {};   // tombol yang baru ditekan (sekali pakai, dibaca game)
    var mouse = { x: 0, y: 0, inside: false, moved: false, down: false };
    var anyKey = false;

    function toArena(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      return {
        x: (clientX - r.left) * (1280 / r.width),
        y: (clientY - r.top) * (720 / r.height)
      };
    }

    function onKeyDown(e) {
      var action = KEYMAP[e.code];
      if (action) {
        keys[action] = true;
        e.preventDefault();
      }
      if (!pressed[e.code]) pressed[e.code] = true;
      anyKey = true;
      // Mencegah scroll halaman dengan spasi / panah saat bermain.
      if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    }

    function onKeyUp(e) {
      var action = KEYMAP[e.code];
      if (action) keys[action] = false;
    }

    function onMouseMove(e) {
      var p = toArena(e.clientX, e.clientY);
      mouse.x = p.x; mouse.y = p.y;
      mouse.inside = true; mouse.moved = true;
    }

    function onMouseDown(e) {
      var p = toArena(e.clientX, e.clientY);
      mouse.x = p.x; mouse.y = p.y;
      mouse.down = true; mouse.inside = true; mouse.moved = true;
    }

    function onMouseUp() { mouse.down = false; }

    function onBlur() {
      keys.up = keys.down = keys.left = keys.right = false;
      mouse.down = false;
    }

    // Sentuhan = mouse: ketuk layar untuk menggerakkan orb.
    function onTouch(e) {
      var t = e.touches[0];
      if (!t) return;
      var p = toArena(t.clientX, t.clientY);
      mouse.x = p.x; mouse.y = p.y;
      mouse.inside = true; mouse.moved = true;
      if (e.type === 'touchstart') mouse.down = true;
      e.preventDefault();
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    canvas.addEventListener('touchmove', onTouch, { passive: false });
    canvas.addEventListener('touchend', function () { mouse.down = false; });
    // Klik kanan tidak membuka menu konteks di atas arena.
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    return {
      // Vektor arah -1..1 dari keyboard, sudah dinormalisasi.
      direction: function () {
        var dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        var dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
        if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }
        return { x: dx, y: dy, active: dx !== 0 || dy !== 0 };
      },
      // Cek apakah tombol sedang ditahan (bukan baru ditekan).
      isDown: function (code) { return !!pressed[code] || !!KEYMAP[code] && keys[KEYMAP[code]]; },
      mouse: mouse,
      // true sekali saat tombol baru ditekan; konsumsi dengan take().
      wasPressed: function (code) { return !!pressed[code]; },
      take: function (code) {
        var hit = !!pressed[code];
        if (hit) delete pressed[code];
        return hit;
      },
      // true sekali saat tombol apa pun ditekan.
      takeAnyKey: function () {
        var hit = anyKey;
        anyKey = false;
        return hit;
      },
      clearPresses: function () { pressed = {}; anyKey = false; },
      // Mouse baru saja bergerak (dipakai untuk alih kontrol ke mouse).
      consumeMouseMoved: function () {
        var hit = mouse.moved;
        mouse.moved = false;
        return hit;
      }
    };
  }

  global.createInput = createInput;
})(typeof window !== 'undefined' ? window : globalThis);
