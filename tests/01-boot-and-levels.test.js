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
  t.g.levels.forEach((lvl, i) => {
    assert.ok(lvl.balls.length > 0);
    assert.doesNotThrow(() => t.g.validateLevel(lvl, i));
  });
});

test('Circle берёт параметры из таблицы sizes', () => {
  const t = loadGame();
  const b = new t.g.Circle(3, { x: 100, y: 100 }, 4, 'red');
  assert.equal(b.r, t.g.sizes[3].r);
  assert.equal(b.weightMod, t.g.sizes[3].weightMod);
  assert.equal(b.dy, t.g.INITIAL_DY);
  assert.equal(b.dx, 4);
  assert.equal(b.color, 'red');
});

test('шар без цвета получает цвет по умолчанию', () => {
  const t = loadGame();
  assert.equal(new t.g.Circle(0, { x: 1, y: 1 }, 1).color, '#666');
});

test('resize: канвас вместе с рамкой помещается в окно (без прокрутки) и сохраняет пропорции 16:9', () => {
  for (const [w, h] of [[640, 360], [1280, 720], [1920, 1080], [900, 900], [500, 1200]]) {
    const t = loadGame({ width: w, height: h });
    const cssW = parseInt(t.canvas.style.width, 10);
    const cssH = parseInt(t.canvas.style.height, 10);
    assert.ok(cssW + 2 * t.g.CANVAS_BORDER <= w, `${w}x${h}: ширина ${cssW}`);
    assert.ok(cssH + 2 * t.g.CANVAS_BORDER <= h, `${w}x${h}: высота ${cssH}`);
    assert.ok(Math.abs(cssW / cssH - 16 / 9) < 0.02, `${w}x${h}: пропорции ${cssW}x${cssH}`);
  }
});

test('resize: масштаб не больше 1.25x', () => {
  const t = loadGame({ width: 4000, height: 3000 });
  assert.equal(t.canvas.style.width, `${1280 * 1.25}px`);
  assert.equal(t.canvas.style.height, `${720 * 1.25}px`);
});

test('resize: размеры канваса целые, матрица согласована с размером', () => {
  for (const dpr of [1, 1.25, 1.5, 2, 2.625]) {
    const t = loadGame({ width: 1111, height: 777, dpr });
    const cssW = parseInt(t.canvas.style.width, 10);
    assert.ok(Number.isInteger(t.canvas.width) && Number.isInteger(t.canvas.height));
    assert.equal(t.canvas.width, Math.round(cssW * dpr));
    const m = t.ctx.calls.filter((c) => c[0] === 'setTransform').pop();
    assert.ok(Math.abs(m[1] - t.canvas.width / 1280) < 1e-9);
    assert.ok(Math.abs(m[4] - t.canvas.height / 720) < 1e-9);
  }
});

test('resize: крошечное окно не даёт нулевой или отрицательный размер', () => {
  const t = loadGame({ width: 5, height: 5 });
  assert.ok(t.canvas.width > 0 && t.canvas.height > 0);
});

test('после потери жизни шары возвращаются в исходные позиции', () => {
  const t = loadGame();
  const { x, y, dx, dy } = t.g.currentLevel[0];
  t.ticks(300);
  t.g.onPlayerHit();
  const b = t.g.currentLevel[0];
  assert.deepEqual([b.x, b.y, b.dx, b.dy], [x, y, dx, dy]);
});

test('после рестарта уровни начинаются с исходного состояния', () => {
  const t = loadGame();
  const start = t.g.currentLevel.map((b) => [b.x, b.y, b.dx, b.dy]);
  t.ticks(200);
  t.g.gameState = 'win';
  t.g.restart();
  assert.deepEqual(t.g.currentLevel.map((b) => [b.x, b.y, b.dx, b.dy]), start);
});

test('loadLevel создаёт новые объекты и не меняет данные уровня', () => {
  const t = loadGame();
  const before = JSON.stringify(t.g.levels);
  t.g.loadLevel(1);
  const first = t.g.currentLevel;
  t.ticks(100);
  t.g.loadLevel(1);
  assert.notEqual(t.g.currentLevel[0], first[0]);
  assert.equal(JSON.stringify(t.g.levels), before);
});

test('createBalls создаёт шары по описанию', () => {
  const t = loadGame();
  const balls = t.g.createBalls({ balls: [{ size: 1, x: 100, y: 200, dx: -2, color: 'red' }] });
  assert.equal(balls.length, 1);
  assert.ok(balls[0] instanceof t.g.Circle);
  assert.deepEqual([balls[0].size, balls[0].x, balls[0].y, balls[0].dx, balls[0].color], [1, 100, 200, -2, 'red']);
});

test('ни один шар не стартует над игроком или вне поля', () => {
  const t = loadGame();
  for (const lvl of t.g.levels) {
    for (const b of t.g.createBalls(lvl)) {
      assert.ok(b.x >= b.r && b.x <= t.g.c.w - b.r);
      assert.ok(b.y >= b.r && b.y + b.r <= t.g.c.h - 50);
    }
  }
});

test('validateLevel отвергает некорректные данные с понятным сообщением', () => {
  const t = loadGame();
  const ok = { size: 1, x: 300, y: 200, dx: 2 };
  const bad = (ball, re) => assert.throws(() => t.g.validateLevel({ balls: [{ ...ok, ...ball }] }, 6), re);
  assert.doesNotThrow(() => t.g.validateLevel({ balls: [ok] }, 0));
  assert.throws(() => t.g.validateLevel(null, 0), /уровень 1/);
  assert.throws(() => t.g.validateLevel({ balls: [] }, 2), /уровень 3/);
  assert.throws(() => t.g.validateLevel({}, 0), /balls/);
  bad({ size: 7 }, /уровень 7, шар 1: size/);
  bad({ size: -1 }, /size/);
  bad({ size: 1.5 }, /size/);
  bad({ x: 5 }, /x=5/);
  bad({ x: 1275 }, /x=1275/);
  bad({ y: 5 }, /y=5/);
  bad({ y: 690 }, /y=690/);
  bad({ dx: NaN }, /dx/);
  bad({ dx: undefined }, /dx/);
  bad({ color: 5 }, /color/);
});

test('Circle с неизвестным размером бросает понятную ошибку', () => {
  const t = loadGame();
  assert.throws(() => new t.g.Circle(99, { x: 1, y: 1 }, 1), /неизвестный размер 99/);
});
