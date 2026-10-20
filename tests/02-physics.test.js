'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

test('шар всегда остаётся внутри боковых стен', () => {
  const t = loadGame();
  for (let size = 0; size < t.g.sizes.length; size++) {
    const b = new t.g.Circle(size, { x: 200, y: 200 }, 4, 'red');
    for (let i = 0; i < 3000; i++) {
      b.update(1);
      assert.ok(b.x >= b.r - 4 && b.x <= t.g.c.w - b.r + 4, `size ${size}, frame ${i}, x=${b.x}`);
    }
  }
});

test('шар отскакивает от пола и не проваливается глубоко', () => {
  const t = loadGame();
  for (let size = 0; size < t.g.sizes.length; size++) {
    const b = new t.g.Circle(size, { x: 640, y: 200 }, 0, 'red');
    let bounced = false;
    for (let i = 0; i < 3000; i++) {
      b.update(1);
      assert.ok(b.y <= t.g.c.h - b.r + 20, `size ${size}: y=${b.y}`);
      if (b.dy < 0 && i > 5 && b.y > t.g.c.h - b.r - 30) bounced = true;
    }
    assert.ok(bounced, `размер ${size} не отскочил`);
  }
});

test('шар не вылетает за верх экрана при отскоках (размеры 0–5)', () => {
  const t = loadGame();
  for (let size = 0; size < t.g.sizes.length - 1; size++) {
    const b = new t.g.Circle(size, { x: 640, y: 200 }, 3, 'red');
    let minY = Infinity;
    for (let i = 0; i < 4000; i++) { b.update(1); minY = Math.min(minY, b.y - b.r); }
    assert.ok(minY > -5, `size ${size}: верх шара ${minY}`);
  }
});

test('gameSpeed масштабирует перемещение по x', () => {
  const t = loadGame();
  const a = new t.g.Circle(2, { x: 300, y: 200 }, 4, 'red');
  const b = new t.g.Circle(2, { x: 300, y: 200 }, 4, 'red');
  a.update(1);
  b.update(0.5);
  assert.equal(a.x - 300, 4);
  assert.equal(b.x - 300, 2);
});

test('intersects: пересечение и непересечение прямоугольников', () => {
  const t = loadGame();
  const b = new t.g.Circle(2, { x: 500, y: 300 }, 0, 'red'); // r=30
  assert.ok(b.intersects({ x1: 490, x2: 510, y1: 280, y2: 320 }));
  assert.ok(!b.intersects({ x1: 0, x2: 100, y1: 0, y2: 100 }));
});

test('выпуклость: попадание в угол квадрата засчитывается (известное поведение AABB)',
  { todo: 'issue-medium-aabb-circle-collision' }, () => {
    const t = loadGame();
    const b = new t.g.Circle(2, { x: 500, y: 300 }, 0, 'red');
    // точка у угла bounding box, вне окружности
    assert.ok(!b.intersects({ x1: 528, x2: 529, y1: 328, y2: 329 }));
  });

test('самый большой шар (размер 6) не вылетает за верх экрана',
  { todo: 'issue-low-biggest-ball-exits-top' }, () => {
    const t = loadGame();
    const b = new t.g.Circle(6, { x: 640, y: 200 }, 3, 'red');
    let minY = Infinity;
    for (let i = 0; i < 4000; i++) { b.update(1); minY = Math.min(minY, b.y - b.r); }
    assert.ok(minY > -5, `верх шара ${minY}`);
  });
