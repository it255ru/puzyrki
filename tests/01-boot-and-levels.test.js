'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

test('игра стартует: playing, уровень 1, 3 жизни, один игрок, цикл запланирован', () => {
  const t = loadGame();
  assert.equal(t.g.gameState, 'playing');
  assert.equal(t.g.level, 0);
  assert.equal(t.g.lives, 3);
  assert.equal(t.g.players.length, 1);
  assert.equal(t.g.currentLevel.length, 1);
  assert.equal(t.raf.length, 1);
});

test('определено 5 уровней, у каждого есть шары допустимых размеров', () => {
  const t = loadGame();
  assert.equal(t.g.levels.length, 5);
  for (const lvl of t.g.levels) {
    assert.ok(lvl.length > 0);
    for (const b of lvl) assert.ok(b.size >= 0 && b.size < t.g.sizes.length);
  }
});

test('Circle берёт параметры из таблицы sizes', () => {
  const t = loadGame();
  const b = new t.g.Circle(3, { x: 100, y: 100 }, 4, 'red');
  assert.equal(b.r, t.g.sizes[3].r);
  assert.equal(b.bs, t.g.sizes[3].bs);
  assert.equal(b.dx, 4);
  assert.equal(b.color, 'red');
});

test('шар без цвета получает цвет по умолчанию', () => {
  const t = loadGame();
  assert.equal(new t.g.Circle(0, { x: 1, y: 1 }, 1).color, '#666');
});

test('resize: размеры канваса масштабируются под окно, не больше 1.25x', () => {
  const small = loadGame({ width: 640, height: 360 });
  assert.equal(small.canvas.style.width, '640px');
  const huge = loadGame({ width: 4000, height: 3000 });
  assert.equal(huge.canvas.style.width, `${1280 * 1.25}px`);
});

test('resize учитывает devicePixelRatio', () => {
  const t = loadGame({ width: 1280, height: 720, dpr: 2 });
  assert.equal(t.canvas.width, 2560);
  assert.equal(t.canvas.style.width, '1280px');
});

// Известные дефекты: тесты проходят после исправления соответствующего issue.
test('после потери жизни шары возвращаются в исходные позиции',
  { todo: 'issue-high-level-state-not-reset' }, () => {
    const t = loadGame();
    const { x, y } = t.g.currentLevel[0];
    t.ticks(300);
    t.g.onPlayerHit();
    assert.equal(t.g.currentLevel[0].x, x);
    assert.equal(t.g.currentLevel[0].y, y);
  });
