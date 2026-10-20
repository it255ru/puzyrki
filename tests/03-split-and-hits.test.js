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

test('split: осколки наследуют подъём родителя, но подпрыгивают не слабее SPLIT_KICK', () => {
  const t = loadGame();
  const make = (dy) => {
    const b = new t.g.Circle(2, { x: 300, y: 300 }, 3, 'red');
    b.dy = dy;
    const arr = [b];
    t.g.split(0, arr);
    return arr.map((x) => x.dy);
  };
  assert.deepEqual(make(-12), [-12, -12]); // быстрый подъём сохраняется
  assert.deepEqual(make(-2), [-t.g.SPLIT_KICK, -t.g.SPLIT_KICK]); // слабый — подтягивается
  assert.deepEqual(make(9), [-t.g.SPLIT_KICK, -t.g.SPLIT_KICK]); // падающий — подбрасывается
});

test('split: шар размера 0 исчезает без осколков', () => {
  const t = loadGame();
  const arr = [new t.g.Circle(0, { x: 300, y: 300 }, 3, 'red')];
  t.g.split(0, arr);
  assert.equal(arr.length, 0);
});

test('split: при dx=0 выбирается случайное направление ±2', () => {
  const t = loadGame();
  const arr = [new t.g.Circle(1, { x: 300, y: 300 }, 0, 'red')];
  t.g.split(0, arr);
  assert.deepEqual(arr.map((b) => Math.abs(b.dx)), [2, 2]);
  assert.equal(arr[0].dx, -arr[1].dx);
});

test('split: неверный индекс ничего не делает', () => {
  const t = loadGame();
  const arr = [new t.g.Circle(1, { x: 300, y: 300 }, 1, 'red')];
  t.g.split(5, arr);
  assert.equal(arr.length, 1);
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
