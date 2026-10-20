'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

/** Поставить шар прямо на игрока (остальные шары убираются). */
function hitPlayer(t, index = 0) {
  const p = t.g.players[index];
  t.g.currentLevel.length = 0;
  t.g.currentLevel.push(new t.g.Circle(2, { x: p.x, y: p.y }, 0, 'red'));
}

/** Поставить шар на игрока, не убирая остальные. */
function addBallOn(t, index = 0) {
  const p = t.g.players[index];
  t.g.currentLevel.push(new t.g.Circle(2, { x: p.x, y: p.y }, 0, 'red'));
}

test('касание шара: −1 жизнь у задетого, неуязвимость, возврат на старт; уровень не сбрасывается', () => {
  const t = loadGame();
  const p = t.g.players[0];
  const ballsBefore = t.g.currentLevel.slice();
  t.press('ArrowRight'); t.ticks(20); t.release('ArrowRight'); // отошли от старта
  assert.ok(p.x > p.spawnX);
  addBallOn(t);
  t.ticks(1);
  assert.equal(p.lives, t.g.MAX_LIVES - 1);
  assert.equal(t.g.gameState, 'playing');
  assert.ok(p.invulnerable > 0);
  assert.equal(p.x, p.spawnX, 'вернулся на старт');
  assert.equal(p.px, p.x, 'без скольжения при отрисовке');
  // прежние шары остались теми же объектами, новых не создано
  assert.ok(ballsBefore.every((b) => t.g.currentLevel.includes(b)));
  assert.equal(t.g.currentLevel.length, ballsBefore.length + 1);
});

test('при потере жизни снимаются гарпуны игрока и возвращается выстрел', () => {
  const t = loadGame();
  const p = t.g.players[0];
  t.press('ArrowUp'); t.ticks(1); t.release('ArrowUp');
  assert.equal(t.g.harpoons.length, 1);
  assert.equal(p.shots, 0);
  addBallOn(t);
  t.ticks(1);
  assert.equal(t.g.harpoons.length, 0);
  assert.equal(p.shots, p.modifiers.maxShots);
});

test('во время неуязвимости касание не отнимает жизнь', () => {
  const t = loadGame();
  const p = t.g.players[0];
  hitPlayer(t); t.ticks(1);
  hitPlayer(t); t.ticks(1);
  assert.equal(p.lives, t.g.MAX_LIVES - 1);
});

test('неуязвимость длится INVULNERABLE_FRAMES шагов (~2 с)', () => {
  const t = loadGame();
  const p = t.g.players[0];
  hitPlayer(t); t.ticks(1);
  assert.equal(p.invulnerable, t.g.INVULNERABLE_FRAMES);
  t.g.currentLevel.length = 0; t.g.levelCountdown = 999;
  t.ticks(t.g.INVULNERABLE_FRAMES - 1);
  assert.ok(p.invulnerable > 0);
  t.ticks(2);
  assert.ok(p.invulnerable <= 0);
});

test('после окончания неуязвимости касание снова отнимает жизнь', () => {
  const t = loadGame();
  const p = t.g.players[0];
  hitPlayer(t); t.ticks(1);
  t.g.currentLevel.length = 0; t.g.levelCountdown = 999;
  t.ticks(125);
  hitPlayer(t); t.ticks(1);
  assert.equal(p.lives, t.g.MAX_LIVES - 2);
});

test('три касания подряд → игрок выбывает → GAME OVER, логика останавливается', () => {
  const t = loadGame();
  const p = t.g.players[0];
  for (let i = 0; i < 3; i++) {
    p.invulnerable = 0;
    hitPlayer(t);
    t.ticks(1);
  }
  assert.equal(p.lives, 0);
  assert.equal(p.out, true);
  assert.equal(t.g.gameState, 'gameover');
  assert.equal(t.g.harpoons.length, 0);
});

test('GAME OVER: оверлей рисуется каждый кадр; Enter перезапускает игру', () => {
  const t = loadGame();
  t.g.players[0].lives = 1; hitPlayer(t); t.ticks(1);
  assert.equal(t.g.gameState, 'gameover');
  for (let i = 0; i < 3; i++) {
    t.clearCalls();
    t.frame();
    assert.ok(t.texts().includes('GAME OVER'), `кадр ${i}`);
  }
  t.press('Enter');
  t.frame();
  assert.equal(t.g.gameState, 'playing');
  assert.equal(t.g.players[0].lives, t.g.MAX_LIVES);
  assert.equal(t.g.players[0].out, false);
  assert.equal(t.g.level, 0);
});

// ===== Два игрока: раздельные жизни =====

test('два игрока: касание задевает только одного — жизни и неуязвимость раздельные', () => {
  const t = loadGame({ players: 2 });
  const [p1, p2] = t.g.players;
  hitPlayer(t, 0);
  t.ticks(1);
  assert.equal(p1.lives, t.g.MAX_LIVES - 1);
  assert.equal(p2.lives, t.g.MAX_LIVES);
  assert.ok(p1.invulnerable > 0);
  assert.equal(p2.invulnerable, 0);
});

test('два игрока: мигает только неуязвимый', () => {
  const t = loadGame({ players: 2 });
  const [p1, p2] = t.g.players;
  p1.invulnerable = 100;
  t.g.time = 0;
  t.clearCalls(); t.g.paint();
  const labels = t.ctx.calls.filter((c) => c[0] === 'fillText' && /^[12]$/.test(c[1])).map((c) => c[1]);
  assert.deepEqual(labels, ['2'], 'в фазе мигания виден только игрок 2');
  t.g.time = 5;
  t.clearCalls(); t.g.paint();
  const labels2 = t.ctx.calls.filter((c) => c[0] === 'fillText' && /^[12]$/.test(c[1])).map((c) => c[1]).sort();
  assert.deepEqual(labels2, ['1', '2']);
  assert.equal(p2.invulnerable, 0);
});

test('два игрока: выбывший не рисуется, не двигается, не стреляет и не мешает', () => {
  const t = loadGame({ players: 2 });
  const [p1, p2] = t.g.players;
  p1.lives = 1;
  hitPlayer(t, 0); t.ticks(1);
  assert.equal(p1.out, true);
  assert.equal(t.g.gameState, 'playing', 'второй продолжает');
  const x = p1.x;
  t.g.currentLevel.length = 0; t.g.currentLevel.push(new t.g.Circle(2, { x: 640, y: 200 }, 0, 'red'));
  t.press('ArrowRight'); t.press('ArrowUp'); t.ticks(20);
  assert.equal(p1.x, x);
  assert.equal(t.g.harpoons.filter((h) => h.owner === p1).length, 0);
  t.clearCalls(); t.g.paint();
  assert.ok(!t.ctx.calls.some((c) => c[0] === 'fillText' && c[1] === '1'), 'метка выбывшего не рисуется');
  // шар на месте выбывшего никого не задевает
  p1.invulnerable = 0;
  t.g.currentLevel.length = 0;
  t.g.currentLevel.push(new t.g.Circle(2, { x: p1.x, y: p1.y }, 0, 'red'));
  const lives1 = p1.lives;
  t.ticks(1);
  assert.equal(p1.lives, lives1);
  assert.equal(p2.lives, t.g.MAX_LIVES);
});

test('два игрока: GAME OVER только когда выбыли оба', () => {
  const t = loadGame({ players: 2 });
  const [p1, p2] = t.g.players;
  p1.lives = 1; p2.lives = 1;
  hitPlayer(t, 0); t.ticks(1);
  assert.equal(t.g.gameState, 'playing');
  p2.invulnerable = 0;
  hitPlayer(t, 1); t.ticks(1);
  assert.equal(t.g.gameState, 'gameover');
});

test('два игрока: оба задеты в один шаг — GAME OVER один раз, без ошибок', () => {
  const t = loadGame({ players: 2 });
  const [p1, p2] = t.g.players;
  p1.lives = 1; p2.lives = 1;
  p1.x = p2.x = 640; p1.snap(); p2.snap();
  t.g.currentLevel.length = 0;
  t.g.currentLevel.push(new t.g.Circle(3, { x: 640, y: 695 }, 0, 'red'));
  t.ticks(1);
  assert.equal(t.g.gameState, 'gameover');
  assert.ok(p1.out && p2.out);
});

test('два игрока: рестарт возвращает жизни и выбывших', () => {
  const t = loadGame({ players: 2 });
  const [p1, p2] = t.g.players;
  p1.lives = 1; hitPlayer(t, 0); t.ticks(1);
  assert.ok(p1.out);
  t.g.restart();
  assert.equal(p1.out, false);
  assert.equal(p1.lives, t.g.MAX_LIVES);
  assert.equal(p2.lives, t.g.MAX_LIVES);
  assert.equal(p1.invulnerable, 0);
});

test('два игрока: следующий уровень расставляет только оставшихся', () => {
  const t = loadGame({ players: 2 });
  const [p1, p2] = t.g.players;
  p1.lives = 1; hitPlayer(t, 0); t.ticks(1);
  assert.ok(p1.out);
  t.g.currentLevel.length = 0;
  t.ticks(100); // очистка → пауза → уровень 2
  assert.equal(t.g.level, 1);
  assert.equal(Math.round(p2.x), Math.round(t.g.c.w / 2), 'единственный игрок по центру');
});

test('два игрока: победа возможна с одним оставшимся', () => {
  const t = loadGame({ players: 2 });
  const [p1] = t.g.players;
  p1.lives = 1; hitPlayer(t, 0); t.ticks(1);
  t.g.level = t.g.levels.length - 1;
  t.g.currentLevel.length = 0;
  t.g.levelCountdown = -1;
  t.ticks(1);
  assert.equal(t.g.gameState, 'win');
});

test('HUD: жизни каждого игрока своим цветом, у выбывшего — крест', () => {
  const t = loadGame({ players: 2 });
  const [p1, p2] = t.g.players;
  t.clearCalls(); t.g.paint();
  assert.ok(t.texts().includes('Игрок 1: ♥♥♥'));
  assert.ok(t.texts().includes('Игрок 2: ♥♥♥'));
  p1.lives = 1; hitPlayer(t, 0); t.ticks(1);
  p1.lives = 0; p1.out = true;
  p2.lives = 2;
  t.clearCalls(); t.g.paint();
  assert.ok(t.texts().includes('Игрок 1: ✖'));
  assert.ok(t.texts().includes('Игрок 2: ♥♥'));
});

test('HUD: блоки жизней не накладываются и помещаются на экране', () => {
  const t = loadGame({ players: 2 });
  t.clearCalls(); t.g.paint();
  const xs = t.ctx.calls.filter((c) => c[0] === 'fillText' && /^Игрок \d: [♥✖]/.test(c[1])).map((c) => c[2]);
  assert.equal(xs.length, 2);
  assert.ok(Math.abs(xs[0] - xs[1]) >= t.g.HUD_PLAYER_WIDTH);
  assert.ok(xs.every((x) => x <= t.g.c.w));
});

test('игрок возвращается на свою точку старта после потери жизни (не в центр)', () => {
  const t = loadGame({ players: 2 });
  const [, p2] = t.g.players;
  const start = p2.spawnX;
  t.press('ArrowLeft'); t.ticks(30); t.release('ArrowLeft');
  hitPlayer(t, 1); t.ticks(1);
  assert.equal(p2.x, start);
});

test('R тоже перезапускает игру', () => {
  const t = loadGame();
  t.g.gameState = 'gameover';
  t.press('KeyR');
  t.frame();
  assert.equal(t.g.gameState, 'playing');
});

test('очистка уровня: пауза 90 кадров, затем следующий уровень', () => {
  const t = loadGame();
  t.g.currentLevel.length = 0;
  t.ticks(1);
  assert.equal(t.g.level, 1);
  assert.equal(t.g.levelCountdown, 90);
  t.ticks(95);
  assert.equal(t.g.currentLevel.length, t.g.levels[1].balls.length);
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
  t.press('Enter');
  t.frame();
  assert.equal(t.g.gameState, 'playing');
  assert.equal(t.g.level, 0);
});

test('можно пройти все уровни подряд', () => {
  const t = loadGame();
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
  t.press('Escape');
  t.frame(); t.frame();
  assert.equal(t.g.pause, true);
  const y = b.y;
  t.frame();
  assert.equal(b.y, y);
  t.clearCalls(); t.frame();
  assert.ok(t.texts().includes('PAUSE'));
  t.release('Escape');
  t.frame();
  t.press('KeyP');
  t.frame();
  assert.equal(t.g.pause, false);
});

test('HUD показывает уровень и жизни', () => {
  const t = loadGame();
  t.clearCalls();
  t.frame();
  const texts = t.texts();
  assert.ok(texts.some((s) => s.startsWith('Уровень: 1/5')));
  assert.ok(texts.includes('Игрок 1: ♥♥♥'));
});

test('отладка: F2 переключает режим, PageUp/PageDown меняют скорость', () => {
  const t = loadGame();
  t.press('F2'); t.frame(); t.release('F2'); t.frame(); // кадр без клавиши снимает «удержание»
  assert.equal(t.g.debug, true);
  t.press('F2'); t.frame(); t.release('F2'); t.frame();
  assert.equal(t.g.debug, false);
  const before = t.g.gameSpeed;
  t.press('PageUp'); t.frame(); t.release('PageUp');
  assert.ok(t.g.gameSpeed > before);
  t.press('PageDown'); t.frame(); t.frame(); t.release('PageDown');
  assert.ok(t.g.gameSpeed < before + 0.01);
});

test('paint в режиме отладки рисует нажатые клавиши', () => {
  const t = loadGame();
  t.g.debug = true;
  t.press('KeyQ');
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
  () => {
    const t = loadGame();
    t.g.currentLevel.length = 0;
    t.ticks(100);
    assert.equal(t.g.level, 1);
  });

test('после restart() очистка уровня 1 ведёт на уровень 2',
  () => {
    const t = loadGame();
    t.g.restart();
    t.g.currentLevel.length = 0;
    t.ticks(100);
    assert.equal(t.g.level, 1);
  });

test('PageUp/PageDown меняют скорость только в режиме отладки',
  { todo: 'issue-low-debug-speed-always-active' }, () => {
    const t = loadGame();
    t.press('PageUp'); t.frame();
    assert.equal(t.g.gameSpeed, 1);
  });

// Регрессия: Enter больше не подключает второго игрока (закрыто новой схемой управления).
test('после победы рестарт Enter не добавляет второго игрока в одиночной игре', () => {
  const t = loadGame();
  t.g.level = t.g.levels.length - 1; t.g.currentLevel.length = 0; t.g.levelCountdown = -1;
  t.frame();
  assert.equal(t.g.gameState, 'win');
  t.press('Enter'); t.frame();
  assert.equal(t.g.gameState, 'playing');
  assert.equal(t.g.players.length, 1);
  t.frame(); t.frame();
  assert.equal(t.g.players.length, 1);
});

test('после GAME OVER рестарт Enter не добавляет второго игрока в одиночной игре', () => {
  const t = loadGame();
  t.g.players[0].lives = 1;
  hitPlayer(t); t.frame();
  assert.equal(t.g.gameState, 'gameover');
  t.press('Enter'); t.frame();
  assert.equal(t.g.gameState, 'playing');
  assert.equal(t.g.players.length, 1);
  t.frame(); t.frame();
  assert.equal(t.g.players.length, 1);
});
