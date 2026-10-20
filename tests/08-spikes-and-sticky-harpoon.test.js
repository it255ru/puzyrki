'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

/** Игра с чистым полем, шипы включены/выключены. */
function field(t, spikes = true) {
  t.g.currentLevel.length = 0;
  t.g.currentSpikes = spikes;
  t.g.levelCountdown = 999; // не переходить на следующий уровень
}

function ball(t, size, x, y, dx = 0, dy = 0) {
  const b = new t.g.Circle(size, { x, y }, dx, 'red');
  b.dy = dy;
  t.g.currentLevel.push(b);
  return b;
}

// ===== Данные уровней =====

test('шипы задаются в данных уровня; первый уровень без шипов, остальные с шипами', () => {
  const t = loadGame();
  assert.equal(t.g.levels[0].spikes, undefined);
  assert.equal(t.g.currentSpikes, false);
  for (let i = 1; i < t.g.levels.length; i++) assert.equal(t.g.levels[i].spikes, true);
  t.g.loadLevel(1);
  assert.equal(t.g.currentSpikes, true);
  t.g.loadLevel(0);
  assert.equal(t.g.currentSpikes, false);
});

test('validateLevel: spikes должен быть логическим', () => {
  const t = loadGame();
  const balls = [{ size: 1, x: 300, y: 200, dx: 2 }];
  assert.doesNotThrow(() => t.g.validateLevel({ balls, spikes: true }, 0));
  assert.doesNotThrow(() => t.g.validateLevel({ balls, spikes: false }, 0));
  assert.doesNotThrow(() => t.g.validateLevel({ balls }, 0));
  assert.throws(() => t.g.validateLevel({ balls, spikes: 'yes' }, 2), /уровень 3: spikes/);
  assert.throws(() => t.g.validateLevel({ balls, spikes: 1 }, 0), /spikes/);
});

// ===== Лопание о шипы =====

test('шар, коснувшийся шипов, лопается целиком, без осколков', () => {
  const t = loadGame();
  field(t);
  ball(t, 2, 640, t.g.SPIKE_HEIGHT + 30 - 1, 0, -1); // верх шара на 1 px выше границы после шага
  t.ticks(2);
  assert.equal(t.g.currentLevel.length, 0);
});

test('граница: верх шара ровно на шипах — лопается; на 1 px ниже — нет', () => {
  const t = loadGame();
  field(t);
  const edge = ball(t, 2, 300, t.g.SPIKE_HEIGHT + 30, 0, 0); // верх = SPIKE_HEIGHT
  const below = ball(t, 2, 900, t.g.SPIKE_HEIGHT + 30 + 1, 0, 0);
  below.dy = -0.0001; edge.dy = 0;
  t.g.burstAtSpikes();
  assert.ok(!t.g.currentLevel.includes(edge));
  assert.ok(t.g.currentLevel.includes(below));
});

test('без шипов шар у потолка не лопается, а отражается', () => {
  const t = loadGame();
  field(t, false);
  const b = ball(t, 2, 640, 45, 0, -20);
  t.ticks(3);
  assert.equal(t.g.currentLevel.length, 1);
  assert.ok(b.y >= b.r);
});

test('шар, летящий вверх, лопается о шипы по законам физики', () => {
  const t = loadGame();
  field(t);
  ball(t, 3, 640, 400, 2, -17);
  let ticks = 0;
  while (t.g.currentLevel.length > 0 && ticks < 200) { t.ticks(1); ticks++; }
  assert.equal(t.g.currentLevel.length, 0);
  assert.ok(ticks < 100, `за ${ticks} шагов`);
});

test('быстрый шар при высоком gameSpeed не «проскакивает» шипы', () => {
  const t = loadGame();
  t.g.gameSpeed = 3;
  field(t);
  ball(t, 1, 640, 60, 0, -25); // за шаг пролетает 75 px: больше высоты шипов
  t.ticks(1);
  assert.equal(t.g.currentLevel.length, 0);
});

test('лопнувший шар не оставляет осколков и не влияет на другие шары', () => {
  const t = loadGame();
  field(t);
  ball(t, 2, 640, 60, 0, -3);
  const other = ball(t, 2, 200, 400, 1, 0);
  t.ticks(5);
  assert.deepEqual(t.g.currentLevel, [other]);
});

test('шипы не наносят вреда игроку и гарпунам', () => {
  const t = loadGame();
  field(t);
  t.press('Space'); t.ticks(80);
  assert.equal(t.g.players[0].lives, t.g.MAX_LIVES);
  assert.equal(t.g.gameState, 'playing');
});

// ===== Попадание рядом с шипами =====

test('шар, разбитый у самого потолка, лопается обеими половинами', () => {
  const t = loadGame();
  field(t);
  const p = t.g.players[0];
  const target = ball(t, 3, p.x, t.g.SPIKE_HEIGHT + 40 + 5, 0, 0); // r=40, верх на 5 px ниже шипов
  // гарпун, острие которого уже достаёт до нижней части шара
  const harpoon = new t.g.Harpoon({ x: p.x, y: t.g.c.h }, p, p.color);
  harpoon.h = t.g.c.h - (target.y + target.r - 5) - 15;
  t.g.harpoons.push(harpoon);
  p.shots = 0;
  t.ticks(1);
  assert.equal(t.g.currentLevel.length, 2, 'шар разделился');
  assert.ok(t.g.currentLevel.every((b) => b.size === 2));
  let ticks = 0;
  while (t.g.currentLevel.length > 0 && ticks < 60) { t.ticks(1); ticks++; }
  assert.equal(t.g.currentLevel.length, 0, 'обе половины лопнули о шипы');
  assert.ok(ticks <= 6, `за ${ticks} шагов`);
});

test('шар, разбитый далеко от потолка, делится как обычно и не лопается', () => {
  const t = loadGame();
  field(t);
  const p = t.g.players[0];
  ball(t, 3, p.x, 450, 0, 0);
  t.press('Space'); t.ticks(1); t.release('Space');
  for (let i = 0; i < 40; i++) t.ticks(1);
  assert.equal(t.g.currentLevel.length, 2);
  assert.ok(t.g.currentLevel.every((b) => b.size === 2));
});

test('осколки, родившиеся в зоне шипов, лопаются сразу в тот же шаг', () => {
  const t = loadGame();
  field(t);
  t.g.currentLevel.push(...[new t.g.Circle(1, { x: 300, y: t.g.SPIKE_HEIGHT + 5 }, 2, 'red')]);
  // осколок с верхом в зоне шипов (имитируем результат деления)
  t.g.burstAtSpikes();
  assert.equal(t.g.currentLevel.length, 0);
});

test('серия попаданий поднимает шар до шипов, и он лопается целиком', () => {
  const t = loadGame();
  field(t);
  let arr = [ball(t, 4, 640, 450, 2, 0)];
  t.g.currentLevel.length = 0;
  let b = arr[0];
  for (let hit = 0; hit < 3; hit++) { // три попадания подряд, пока осколок летит вверх
    const list = [b];
    t.g.split(0, list);
    b = list[0];
    for (let i = 0; i < 4; i++) b.update(1);
  }
  t.g.currentLevel.push(b);
  let ticks = 0;
  while (t.g.currentLevel.length > 0 && ticks < 200) { t.ticks(1); ticks++; }
  assert.equal(t.g.currentLevel.length, 0);
});

test('уровень, очищенный шипами, засчитывается как пройденный', () => {
  const t = loadGame();
  t.g.level = 1;
  t.g.loadLevel(1);
  t.g.levelCountdown = -1;
  t.g.currentLevel.length = 0;
  ball(t, 1, 640, 60, 0, -10);
  t.ticks(3);
  assert.equal(t.g.currentLevel.length, 0);
  t.ticks(2);
  assert.equal(t.g.level, 2);
  assert.equal(t.g.levelCountdown > 0, true);
});

// ===== Отрисовка =====

test('шипы рисуются только на уровнях с шипами', () => {
  const t = loadGame();
  t.g.currentLevel.length = 0;
  t.g.currentSpikes = true; t.clearCalls(); t.g.paint();
  const lines = t.ctx.calls.filter((c) => c[0] === 'lineTo').length;
  assert.equal(lines, 2 * Math.ceil(t.g.c.w / t.g.SPIKE_WIDTH));
  t.g.currentSpikes = false; t.clearCalls(); t.g.paint();
  assert.equal(t.ctx.calls.filter((c) => c[0] === 'lineTo').length, 0);
});

// ===== Прилипающий гарпун =====

function shoot(t) { t.press('Space'); t.ticks(1); t.release('Space'); return t.g.harpoons[0]; }

test('гарпун долетает до потолка без шипов: острие на верху экрана, затем прилипает', () => {
  const t = loadGame();
  field(t, false);
  const h = shoot(t);
  for (let i = 0; i < 100 && !h.isStuck; i++) t.ticks(1);
  assert.equal(h.isStuck, true);
  assert.equal(h.bounds().y1, 0);
  assert.equal(h.stuck, t.g.STICK_FRAMES);
});

test('с шипами гарпун упирается в нижнюю границу шипов', () => {
  const t = loadGame();
  field(t, true);
  const h = shoot(t);
  for (let i = 0; i < 100 && !h.isStuck; i++) t.ticks(1);
  assert.equal(h.bounds().y1, t.g.SPIKE_HEIGHT);
});

test('гарпун никогда не превышает предельную длину', () => {
  const t = loadGame();
  field(t, true);
  const h = shoot(t);
  const max = h.y - (t.g.SPIKE_HEIGHT + t.g.HARPOON_TIP);
  for (let i = 0; i < 100; i++) {
    t.ticks(1);
    assert.ok(h.h <= max + 1e-9);
  }
});

test('прилипший гарпун держится STICK_FRAMES шагов, затем исчезает и возвращает выстрел', () => {
  const t = loadGame();
  field(t, false);
  const p = t.g.players[0];
  const h = shoot(t);
  let flight = 0;
  while (!h.isStuck && flight < 200) { t.ticks(1); flight++; }
  assert.equal(p.shots, 0);
  let stuckTicks = 0;
  while (t.g.harpoons.length > 0 && stuckTicks < 200) { t.ticks(1); stuckTicks++; }
  assert.ok(Math.abs(stuckTicks - t.g.STICK_FRAMES) <= 1, `прилип на ${stuckTicks} шагов`);
  assert.equal(p.shots, p.modifiers.maxShots);
});

test('пока гарпун прилип, второй выстрел невозможен', () => {
  const t = loadGame();
  field(t, false);
  const h = shoot(t);
  while (!h.isStuck) t.ticks(1);
  t.press('Space'); t.ticks(20); t.release('Space');
  assert.equal(t.g.harpoons.length, 1);
});

test('прилипший гарпун делит шар, который его задел, и сразу исчезает', () => {
  const t = loadGame();
  field(t, false);
  const p = t.g.players[0];
  const h = shoot(t);
  while (!h.isStuck) t.ticks(1);
  ball(t, 2, p.x, 150, 0, 3); // падает на прилипший гарпун
  for (let i = 0; i < 40 && t.g.currentLevel.length === 1; i++) t.ticks(1);
  assert.equal(t.g.currentLevel.length, 2);
  assert.ok(t.g.currentLevel.every((b) => b.size === 1));
  assert.equal(t.g.harpoons.length, 0);
  assert.equal(p.shots, p.modifiers.maxShots);
});

test('время прилипания масштабируется gameSpeed', () => {
  const t = loadGame();
  field(t, false);
  const h = shoot(t);
  while (!h.isStuck) t.ticks(1);
  t.g.gameSpeed = 0.5;
  let n = 0;
  while (t.g.harpoons.length > 0 && n < 300) { t.ticks(1); n++; }
  assert.ok(Math.abs(n - 2 * t.g.STICK_FRAMES) <= 2, `${n}`);
});

test('прилипший гарпун мигает перед исчезновением', () => {
  const t = loadGame();
  field(t, false);
  const h = shoot(t);
  while (!h.isStuck) t.ticks(1);
  const drawn = [];
  for (let s = t.g.STICK_FRAMES; s > 0; s--) {
    h.stuck = s;
    t.clearCalls(); h.draw(t.ctx);
    drawn.push(t.ctx.calls.some((c) => c[0] === 'fillRect'));
  }
  assert.ok(drawn.slice(0, 20).every(Boolean), 'сначала рисуется постоянно');
  assert.ok(drawn.slice(20).some((d) => !d) && drawn.slice(20).some(Boolean), 'в конце мигает');
});

test('потеря жизни убирает прилипшие гарпуны игрока, выстрел возвращён', () => {
  const t = loadGame();
  field(t, false);
  const h = shoot(t);
  while (!h.isStuck) t.ticks(1);
  t.g.onPlayerHit(t.g.players[0]);
  assert.equal(t.g.harpoons.length, 0);
  assert.equal(t.g.players[0].shots, t.g.players[0].modifiers.maxShots);
});

test('два игрока: каждый прилипший гарпун занимает выстрел только своего владельца', () => {
  const t = loadGame({ players: 2 });
  field(t, false);
  const [p1, p2] = t.g.players;
  p1.x = 300; p2.x = 900;
  t.press('Space'); t.ticks(1); t.release('Space');
  t.press('Enter'); t.ticks(1); t.release('Enter');
  assert.equal(t.g.harpoons.length, 2);
  for (let i = 0; i < 100; i++) t.ticks(1);
  assert.equal(t.g.harpoons.length, 0);
  assert.equal(p1.shots, 1);
  assert.equal(p2.shots, 1);
});
