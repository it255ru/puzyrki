'use strict';
// «Идеальный стрелок» для проверки уровней: за каждым шагом знает будущее шара
// (симулирует его по тем же правилам физики) и мгновенно ставит игрока под точку
// встречи с гарпуном. Игрок неуязвим — проверяется, что каждый шар можно поразить
// и уровень не заходит в тупик; уворачиваться он не умеет и не должен.

const { loadGame } = require('./harness');

const HARPOON_SPEED = 12;

/** Лучшая цель: { x, j } — позиция игрока и число шагов до попадания; null, если бить некуда. */
function plan(g) {
  let best = null;
  for (const target of g.currentLevel) {
    const sim = new g.Circle(target.size, { x: target.x, y: target.y }, target.dx, 'x');
    sim.dy = target.dy;
    for (let j = 1; j <= 140; j++) {
      sim.update(1);
      if (g.currentSpikes && (sim.y - sim.r <= g.SPIKE_HEIGHT || sim.touchedCeiling)) break; // сам лопнет
      const tip = g.c.h - HARPOON_SPEED * j - g.HARPOON_TIP;
      if (sim.y + sim.r >= tip) {
        if (!best || j < best.j) best = { x: Math.min(Math.max(sim.x, 15), g.c.w - 15), j };
        break;
      }
    }
  }
  return best;
}

/**
 * Пройти уровень идеальным стрелком.
 * @returns {{cleared:boolean, ticks:number, shots:number, bursts:number, score:number}}
 */
function playLevel(index, { maxTicks = 9000, controls = ['keyboard'] } = {}) {
  const t = loadGame({ controls });
  const g = t.g;
  g.level = index;
  g.loadLevel(index);
  g.levelCountdown = -1;
  const p = g.players[0];
  p.invulnerable = Infinity;
  let shots = 0;
  let ticks = 0;
  while (g.currentLevel.length > 0 && ticks < maxTicks) {
    let fire = false;
    if (p.shots > 0 && p.cooldown <= 0) {
      const target = plan(g);
      if (target) {
        p.x = target.x; p.snap();
        fire = true;
      }
    }
    const before = g.harpoons.length;
    if (fire) g.currentKeys['arrowup'] = true;
    g.logic();
    g.currentKeys['arrowup'] = false;
    if (g.harpoons.length > before) shots++;
    ticks++;
  }
  return { cleared: g.currentLevel.length === 0, ticks, shots, bursts: g.burstCount, score: p.score, t };
}

module.exports = { playLevel, plan };
