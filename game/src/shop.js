// LUMEN DRIFT — shop.js
// Toko upgrade antar-gelombang: belanja dengan bank lumen yang dikumpulkan.
// Tidak menggambar apa pun; render.js membaca items + bank untuk panel toko.
(function (global) {
  'use strict';

  var ITEMS = [
    {
      id: 'heart', key: '1', name: '+1 NYAWA', max: 2,
      desc: 'Satu hati ekstra (maks 5).',
      cost: function (lvl) { return 20 + lvl * 10; },
      apply: function (world) { world.lives = Math.min(5, world.lives + 1); }
    },
    {
      id: 'magnet', key: '2', name: 'MAGNET +90', max: 3,
      desc: 'Tarik lumen lebih jauh (+90).',
      cost: function (lvl) { return 12 + lvl * 8; },
      apply: function (world) { world.magnetBonus += 90; }
    },
    {
      id: 'aegis', key: '3', name: 'PERISAI AWAL +4s', max: 3,
      desc: 'Perisai 4 detik tiap gelombang.',
      cost: function (lvl) { return 15 + lvl * 8; },
      apply: function (world) { world.shieldBonus += 4; }
    },
    {
      id: 'guard', key: '4', name: 'PELINDUNG KOMBO', max: 2,
      desc: 'Kena meteor tak putus kombo.',
      cost: function (lvl) { return 18 + lvl * 10; },
      apply: function (world) { world.guardCharges += 1; }
    },
    {
      id: 'swift', key: '5', name: 'ORBIT +12%', max: 3,
      desc: 'Kecepatan orb naik 12%.',
      cost: function (lvl) { return 12 + lvl * 8; },
      apply: function (world) { world.speedBonus += 0.12; }
    }
  ];

  function createShop() {
    var selected = 0;

    function levelOf(world, id) {
      return (world.shopLevels && world.shopLevels[id]) || 0;
    }

    function canAfford(world, idx) {
      var it = ITEMS[idx];
      if (!it) return false;
      return levelOf(world, it.id) < it.max &&
        world.bank >= it.cost(levelOf(world, it.id));
    }

    // Beli satu tingkat; kembalikan true bila berhasil.
    function buy(world, idx) {
      var it = ITEMS[idx];
      if (!it) return false;
      var lvl = levelOf(world, it.id);
      if (lvl >= it.max || world.bank < it.cost(lvl)) return false;
      world.bank -= it.cost(lvl);
      world.shopLevels[it.id] = lvl + 1;
      world.upgradesBought++;
      it.apply(world);
      return true;
    }

    return {
      items: ITEMS,
      get selected() { return selected; },
      set selected(v) { selected = v; },
      levelOf: levelOf,
      canAfford: canAfford,
      buy: buy
    };
  }

  global.createShop = createShop;
})(typeof window !== 'undefined' ? window : globalThis);
