'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

/** Поставить шар прямо на игрока. */
function hitPlayer(t) {
  const p = t.g.players[0];
  t.g.currentLevel.length = 0;
  t.g.currentLevel.push(new t.g.Circle(2, { x: p.x, y: p.y }, 0, 'red'));
}

test('касание шара: −1 жизнь, уровень перезапущен, включена неуязвимость', () => {
  const t = loadGame();
  hitPlayer(t);
  t.ticks(1);
  assert.equal(t.g.lives, 2);
  assert.equal(t.g.gameState, 'playing');
  assert.ok(t.g.invulnerableTimer > 0);
  assert.equal(t.g.harpoons.length, 0);
  assert.equal(t.g.currentLevel.length, t.g.levels[0].length);
});

test('во время неуязвимости касание не отнимает жизнь', () => {
  const t = loadGame();
  hitPlayer(t); t.ticks(1);
  hitPlayer(t); t.ticks(1);
  assert.equal(t.g.lives, 2);
});

test('неуязвимость истекает через ~120 кадров', () => {
  const t = loadGame();
  hitPlayer(t); t.ticks(1);
  t.g.currentLevel.length = 0; t.g.levelCountdown = 999;
  t.ticks(125);
  assert.ok(t.g.invulnerableTimer <= 0);
});

test('три касания подряд → GAME OVER, логика останавливается', () => {
  const t = loadGame();
  for (let i = 0; i < 3; i++) {
    t.g.invulnerableTimer = 0;
    hitPlayer(t);
    t.ticks(1);
  }
  assert.equal(t.g.lives, 0);
  assert.equal(t.g.gameState, 'gameover');
  assert.equal(t.g.harpoons.length, 0);
});

test('GAME OVER: оверлей рисуется каждый кадр; Enter перезапускает игру', () => {
  const t = loadGame();
  t.g.lives = 1; hitPlayer(t); t.ticks(1);
  assert.equal(t.g.gameState, 'gameover');
  for (let i = 0; i < 3; i++) {
    t.clearCalls();
    t.frame();
    assert.ok(t.texts().includes('GAME OVER'), `кадр ${i}`);
  }
  t.down('Enter');
  t.frame();
  assert.equal(t.g.gameState, 'playing');
  assert.equal(t.g.lives, t.g.MAX_LIVES);
  assert.equal(t.g.level, 0);
});

test('R тоже перезапускает игру', () => {
  const t = loadGame();
  t.g.gameState = 'gameover';
  t.down('r');
  t.frame();
  assert.equal(t.g.gameState, 'playing');
});

test('очистка уровня: пауза 90 кадров, затем следующий уровень', () => {
  const t = loadGame();
  t.g.levelCountdown = -1; // состояние «уровень уже загружен» (см. todo ниже про старт)
  t.g.currentLevel.length = 0;
  t.ticks(1);
  assert.equal(t.g.level, 1);
  assert.equal(t.g.levelCountdown, 90);
  t.ticks(95);
  assert.equal(t.g.currentLevel.length, t.g.levels[1].length);
  assert.equal(t.g.gameState, 'playing');
});

test('очистка последнего уровня → ПОБЕДА; Enter начинает заново', () => {
  const t = loadGame();
  t.g.level = t.g.levels.length - 1;
  t.g.currentLevel.length = 0;
  t.g.levelCountdown = -1;
  t.ticks(1);
  assert.equal(t.g.gameState, 'win');
  t.clearCalls();
  t.frame();
  assert.ok(t.texts().includes('ПОБЕДА!'));
  t.down('Enter');
  t.frame();
  assert.equal(t.g.gameState, 'playing');
  assert.equal(t.g.level, 0);
});

test('можно пройти все уровни подряд', () => {
  const t = loadGame();
  t.g.levelCountdown = -1;
  for (let i = 0; i < t.g.levels.length; i++) {
    assert.equal(t.g.level, i);
    t.g.currentLevel.length = 0;
    t.ticks(100);
  }
  assert.equal(t.g.gameState, 'win');
});

test('пауза: Esc останавливает логику, повторное нажатие снимает; удержание не мерцает', () => {
  const t = loadGame();
  t.frame();
  const b = t.g.currentLevel[0];
  t.down('Escape');
  t.frame(); t.frame();
  assert.equal(t.g.pause, true);
  const y = b.y;
  t.frame();
  assert.equal(b.y, y);
  t.clearCalls(); t.frame();
  assert.ok(t.texts().includes('PAUSE'));
  t.up('Escape');
  t.frame();
  t.down('p');
  t.frame();
  assert.equal(t.g.pause, false);
});

test('HUD показывает уровень и жизни', () => {
  const t = loadGame();
  t.clearCalls();
  t.frame();
  const texts = t.texts();
  assert.ok(texts.some((s) => s.startsWith('Уровень: 1/5')));
  assert.ok(texts.some((s) => s.includes('Жизни: ♥♥♥')));
});

test('отладка: F2 переключает режим, PageUp/PageDown меняют скорость', () => {
  const t = loadGame();
  t.down('F2'); t.frame(); t.up('F2'); t.frame(); // кадр без клавиши снимает «удержание»
  assert.equal(t.g.debug, true);
  t.down('F2'); t.frame(); t.up('F2'); t.frame();
  assert.equal(t.g.debug, false);
  const before = t.g.gameSpeed;
  t.down('PageUp'); t.frame(); t.up('PageUp');
  assert.ok(t.g.gameSpeed > before);
  t.down('PageDown'); t.frame(); t.frame(); t.up('PageDown');
  assert.ok(t.g.gameSpeed < before + 0.01);
});

test('paint в режиме отладки рисует нажатые клавиши', () => {
  const t = loadGame();
  t.g.debug = true;
  t.down('q');
  t.clearCalls();
  t.frame();
  assert.ok(t.texts().some((s) => s.includes('q')));
});

test('step планирует следующий кадр и увеличивает счётчик времени', () => {
  const t = loadGame();
  const time = t.g.time;
  t.frame();
  assert.equal(t.g.time, time + 1);
  assert.equal(t.raf.length, 1);
});

test('полный кадр отрисовки не падает во всех состояниях', () => {
  const t = loadGame();
  for (const s of ['playing', 'gameover', 'win']) {
    t.g.gameState = s;
    t.g.paint();
  }
  t.g.pause = true;
  t.g.gameState = 'playing';
  t.g.paint();
});

// Известные дефекты.
test('сразу после старта очистка уровня 1 ведёт на уровень 2, а не повторяет 1',
  { todo: 'issue-high-first-level-played-twice' }, () => {
    const t = loadGame();
    t.g.currentLevel.length = 0;
    t.ticks(100);
    assert.equal(t.g.level, 1);
  });

test('после restart() очистка уровня 1 ведёт на уровень 2',
  { todo: 'issue-high-first-level-played-twice' }, () => {
    const t = loadGame();
    t.g.restart();
    t.g.currentLevel.length = 0;
    t.ticks(100);
    assert.equal(t.g.level, 1);
  });

test('hotJoin не работает на паузе и на экране GAME OVER',
  { todo: 'issue-medium-hotjoin-issues' }, () => {
    const t = loadGame();
    t.g.gameState = 'gameover';
    t.down('*'); t.g.time = 100;
    t.frame();
    assert.equal(t.g.players.length, 1);
  });

test('PageUp/PageDown меняют скорость только в режиме отладки',
  { todo: 'issue-low-debug-speed-always-active' }, () => {
    const t = loadGame();
    t.down('PageUp'); t.frame();
    assert.equal(t.g.gameSpeed, 1);
  });

test('ошибка в логике не останавливает игровой цикл',
  { todo: 'issue-medium-game-loop-crash-halts-game' }, () => {
    const t = loadGame();
    t.g.currentLevel.push({ update() { throw new Error('boom'); }, draw() {}, bounds() { return { x1: 0, x2: 0, y1: 0, y2: 0 }; }, intersects() { return false; } });
    try { t.frame(); } catch { /* ожидаемо до исправления */ }
    assert.equal(t.raf.length, 1);
  });
