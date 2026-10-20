'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

test('split: шар размера 2 даёт два шара размера 1 с противоположным dx', () => {
  const t = loadGame();
  const arr = [new t.g.Circle(2, { x: 300, y: 300 }, 3, 'red')];
  t.g.split(0, arr);
  assert.equal(arr.length, 2);
  assert.deepEqual(arr.map((b) => b.size), [1, 1]);
  assert.deepEqual(arr.map((b) => b.dx).sort(), [-3, 3]);
  assert.ok(arr.every((b) => b.color === 'red' && b.y === 300));
});

test('split: осколки расходятся в стороны на половину своего радиуса', () => {
  const t = loadGame();
  const arr = [new t.g.Circle(2, { x: 300, y: 300 }, 3, 'red')];
  t.g.split(0, arr);
  const r = t.g.sizes[1].r;
  const xs = arr.map((b) => b.x).sort((a, b) => a - b);
  assert.deepEqual(xs, [300 - r / 2, 300 + r / 2]);
  const right = arr.find((b) => b.x > 300);
  assert.ok(right.dx > 0, 'правый осколок летит вправо');
});

test('split: осколки у стены остаются внутри поля', () => {
  const t = loadGame();
  for (const x of [32, 1248]) {
    const arr = [new t.g.Circle(2, { x, y: 300 }, 3, 'red')];
    t.g.split(0, arr);
    for (const b of arr) assert.ok(b.x >= b.r && b.x <= t.g.c.w - b.r, `x=${b.x}`);
  }
});

test('импульс попадания: падающий шар гасится и подбрасывается, летящий вверх — ускоряется', () => {
  const t = loadGame();
  const childDy = (size, dy) => {
    const b = new t.g.Circle(size, { x: 300, y: 300 }, 3, 'red');
    b.dy = dy;
    const arr = [b];
    t.g.split(0, arr);
    return arr.map((x) => x.dy);
  };
  const imp = t.g.hitImpulse(1);
  const [a1, a2] = childDy(2, 9); // падал вниз: остаток скорости гасится
  assert.ok(Math.abs(a1 + imp) < 1e-9 && a1 === a2);
  const [b1] = childDy(2, 0);
  assert.ok(Math.abs(b1 + imp) < 1e-9);
  const [c1] = childDy(2, -4); // уже летел вверх: импульсы складываются
  assert.ok(Math.abs(c1 - (-4 - imp)) < 1e-9);
});

test('импульс попадания ограничен: из любой точки поля хватает ровно до потолка', () => {
  const t = loadGame();
  const b = new t.g.Circle(2, { x: 300, y: 300 }, 3, 'red');
  b.dy = -100;
  const arr = [b];
  t.g.split(0, arr);
  assert.ok(arr.every((x) => Math.abs(x.dy - -t.g.maxRiseSpeed(1)) < 1e-9));
  assert.ok(t.g.maxRiseSpeed(1) < 20);
});

test('после попадания по падающему шару осколки поднимаются ровно на HIT_RISE над точкой попадания', () => {
  const t = loadGame();
  for (let size = 1; size <= 6; size++) {
    const b = new t.g.Circle(size, { x: 640, y: 400 }, 2, 'red');
    b.dy = 7; // падает
    const arr = [b];
    t.g.split(0, arr);
    const child = arr[0];
    const y0 = child.y;
    let minY = y0;
    for (let i = 0; i < 400 && (child.dy < 0 || i < 2); i++) { child.update(1); minY = Math.min(minY, child.y); }
    assert.ok(Math.abs((y0 - minY) - t.g.HIT_RISE) < 1.5, `размер ${size}: подъём ${y0 - minY}`);
  }
});

test('подъём одинаков для всех размеров, хотя импульс у «плавучих» шаров меньше', () => {
  const t = loadGame();
  assert.ok(t.g.hitImpulse(5) < t.g.hitImpulse(2));
  assert.ok(t.g.hitImpulse(1) === t.g.hitImpulse(2));
});

test('серия попаданий по летящему вверх шару поднимает его до потолка', () => {
  const t = loadGame();
  let ball = new t.g.Circle(4, { x: 640, y: 450 }, 2, 'red');
  ball.dy = 0;
  let arr = [ball];
  let minY = Infinity;
  for (let hit = 0; hit < 3; hit++) { // три попадания подряд, пока осколок летит вверх
    t.g.split(0, arr);
    arr = [arr[0]];
    for (let i = 0; i < 4; i++) { arr[0].update(1); minY = Math.min(minY, arr[0].y); }
  }
  for (let i = 0; i < 400; i++) { arr[0].update(1); minY = Math.min(minY, arr[0].y); }
  assert.ok(minY - arr[0].r < 3, `дошёл до потолка: верх шара на ${minY - arr[0].r} px ниже`);
});

test('одно попадание с нижней точки не достаёт до потолка', () => {
  const t = loadGame();
  const b = new t.g.Circle(3, { x: 640, y: 600 }, 2, 'red');
  b.dy = 5;
  const arr = [b];
  t.g.split(0, arr);
  let minY = Infinity;
  for (let i = 0; i < 400; i++) { arr[0].update(1); minY = Math.min(minY, arr[0].y); }
  assert.ok(minY > 600 - t.g.HIT_RISE - 3 - 1e-6 && minY < 600 - t.g.HIT_RISE + 3);
});

test('осколки одного шара получают одинаковую вертикальную скорость', () => {
  const t = loadGame();
  const b = new t.g.Circle(3, { x: 640, y: 300 }, 2, 'red');
  b.dy = 3;
  const arr = [b];
  t.g.split(0, arr);
  assert.equal(arr[0].dy, arr[1].dy);
});

test('касание игрока не подбрасывает шар и не делит его', () => {
  const t = loadGame();
  const p = new t.g.Player({ x: 500, y: 695 }, 0);
  const b = new t.g.Circle(2, { x: 500, y: 680 }, 0, 'red');
  b.dy = 4;
  const arr = [b];
  t.g.checkHit([p], arr, 1);
  assert.equal(arr.length, 1);
  assert.equal(b.dy, 4);
});

test('попадание гарпуном в падающий шар: оба осколка летят вверх', () => {
  const t = loadGame();
  const p = t.g.players[0];
  t.g.currentLevel.length = 0;
  const ball = new t.g.Circle(2, { x: p.x, y: 300 }, 0, 'red');
  ball.dy = 3;
  t.g.currentLevel.push(ball);
  t.press('ArrowUp'); t.ticks(1); t.release('ArrowUp');
  for (let i = 0; i < 60 && t.g.currentLevel.length !== 2; i++) t.ticks(1);
  assert.equal(t.g.currentLevel.length, 2);
  assert.ok(t.g.currentLevel.every((b) => b.size === 1));
  // в тот же шаг, когда попал гарпун, осколки получили импульс вверх
  assert.ok(t.g.currentLevel.every((b) => Math.abs(b.dy + t.g.hitImpulse(1)) < 1e-9), t.g.currentLevel.map((b) => b.dy).join());
});

test('checkHit: гарпун попадает в шар и делит его', () => {
  const t = loadGame();
  const target = [new t.g.Circle(2, { x: 500, y: 400 }, 0, 'red')];
  const h = new t.g.Harpoon({ x: 500, y: 720 }, null, 'green');
  h.h = 400;
  const hits = t.g.checkHit([h], target, 1);
  assert.equal(hits, 1);
  assert.equal(target.length, 2);
  assert.ok(target.every((b) => b.size === 1));
});

test('checkHit: гарпун мимо — попаданий нет', () => {
  const t = loadGame();
  const target = [new t.g.Circle(2, { x: 900, y: 400 }, 0, 'red')];
  const h = new t.g.Harpoon({ x: 100, y: 720 }, null, 'green');
  h.h = 400;
  assert.equal(t.g.checkHit([h], target, 1), 0);
  assert.equal(target.length, 1);
});

test('checkHit: игрок засчитывает касание, но шар не делится', () => {
  const t = loadGame();
  const p = new t.g.Player({ x: 500, y: 695 }, 0);
  const target = [new t.g.Circle(2, { x: 500, y: 680 }, 0, 'red')];
  assert.equal(t.g.checkHit([p], target, 1), 1);
  assert.equal(target.length, 1);
});

test('checkHit: maxHits ограничивает число пораженных шаров', () => {
  const t = loadGame();
  const target = [
    new t.g.Circle(1, { x: 500, y: 400 }, 0, 'red'),
    new t.g.Circle(1, { x: 502, y: 400 }, 0, 'red'),
  ];
  const h = new t.g.Harpoon({ x: 500, y: 720 }, null, 'green');
  h.h = 400;
  assert.equal(t.g.checkHit([h], target, 1), 1);
  assert.equal(target.length, 3); // один разделён (−1 +2)
});

test('checkHit: несколько шаров делятся корректно при удалении по индексам', () => {
  const t = loadGame();
  const target = [
    new t.g.Circle(1, { x: 500, y: 400 }, 0, 'a'),
    new t.g.Circle(1, { x: 1000, y: 400 }, 0, 'b'),
    new t.g.Circle(1, { x: 505, y: 400 }, 0, 'c'),
  ];
  const h = new t.g.Harpoon({ x: 500, y: 720 }, null, 'green');
  h.h = 400;
  h.modifiers.maxHits = 3;
  assert.equal(t.g.checkHit([h], target, 3), 2);
  assert.equal(target.filter((b) => b.color === 'b').length, 1);
  assert.equal(target.length, 1 + 2 * 2);
});
