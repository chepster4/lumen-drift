// LUMEN DRIFT — difficulty.js
// Tiga tingkat kesulitan yang dipilih di title screen.
// world.js menerapkan pengalinya saat reset & spawn.
(function (global) {
  'use strict';

  var LIST = [
    {
      id: 'calm', name: 'TENANG', lives: 4,
      speedMul: 0.8, spawnMul: 1.3, valueMul: 1,
      desc: 'Santai: meteor lambat, 4 nyawa.'
    },
    {
      id: 'drift', name: 'DRIFT', lives: 3,
      speedMul: 1, spawnMul: 1, valueMul: 1,
      desc: 'Klasik: tantangan seimbang.'
    },
    {
      id: 'storm', name: 'BADAI', lives: 2,
      speedMul: 1.25, spawnMul: 0.75, valueMul: 1.5,
      desc: 'Ganas: meteor cepat, lumen bernilai 1,5x.'
    }
  ];

  function apply(world, idx) {
    // Jaga-jaga: idx bukan angka / di luar jangkauan -> kembali ke DRIFT.
    idx = idx | 0;
    if (idx < 0 || idx >= LIST.length) idx = 1;
    world.diffIndex = idx;
    world.diff = LIST[idx];
  }

  function byId(id) {
    for (var i = 0; i < LIST.length; i++) {
      if (LIST[i].id === id) return LIST[i];
    }
    return LIST[1];
  }

  global.LUMEN_DIFFICULTY = {
    LIST: LIST,
    apply: apply,
    byId: byId
  };
})(typeof window !== 'undefined' ? window : globalThis);
