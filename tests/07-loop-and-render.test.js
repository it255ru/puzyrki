'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

/** Сколько шагов логики выполнится за `seconds` секунд при частоте кадров `hz`. */
function ticksOver(hz, seconds = 1) {
  const t = loadGame();
  const before = t.g.time;
  const frames = Math.round(hz * seconds);
  for (let i = 0; i < frames; i++) t.frame(1000 / hz);
  return t.g.time - before;
}

test('один кадр при 60 Гц — ровно один шаг логики', () => {
  const t = loadGame();
  const time = t.g.time;
  t.frame();
  assert.equal(t.g.time, time + 1);
});

test('скорость игры не зависит от частоты кадров (30 / 60 / 75 / 120 / 144 / 240 Гц)', () => {
  for (const hz of [30, 60, 75, 120, 144, 240]) {
    const n = ticksOver(hz);
    assert.ok(Math.abs(n - 60) <= 1, `${hz} Гц: ${n} шагов за секунду`);
  }
});

test('кадр с двойным интервалом даёт два шага, с половинным — ноль, затем один', () => {
  const t = loadGame();
  t.frame(); // первый кадр
  let time = t.g.time;
  t.frame(2 * t.g.STEP_MS);
  assert.equal(t.g.time, time + 2);
  time = t.g.time;
  t.frame(t.g.STEP_MS / 2);
  assert.equal(t.g.time, time);
  t.frame(t.g.STEP_MS / 2);
  assert.equal(t.g.time, time + 1);
});

test('одинаковая симуляция при разной частоте кадров', () => {
  const run = (hz) => {
    const t = loadGame();
    t.g.currentLevel.length = 0;
    t.g.currentLevel.push(new t.g.Circle(2, { x: 300, y: 200 }, 3, 'red'));
    for (let i = 0; i < hz; i++) t.frame(1000 / hz);
    return [t.g.time, t.g.currentLevel[0].x, t.g.currentLevel[0].y];
  };
  const [t60, x60] = run(60);
  const [t144, x144] = run(144);
  assert.ok(Math.abs(t60 - t144) <= 1);
  assert.ok(Math.abs(x60 - x144) <= 4 * Math.abs(t60 - t144) + 0.001);
});

test('после долгой паузы (вкладка в фоне) шаги ограничены, игра не «догоняет» минуты', () => {
  const t = loadGame();
  t.frame();
  const time = t.g.time;
  t.frame(60 * 1000);
  const steps = t.g.time - time;
  assert.ok(steps <= Math.ceil(t.g.MAX_FRAME_MS / t.g.STEP_MS), `шагов: ${steps}`);
  assert.ok(steps >= 1);
});

test('время, идущее назад, не приводит к шагам и ошибкам', () => {
  const t = loadGame();
  t.frame();
  const time = t.g.time;
  t.frame(-100);
  assert.equal(t.g.time, time);
  assert.equal(t.g.fatalError, null);
});

test('advance без метки времени делает ровно один шаг', () => {
  const t = loadGame();
  assert.equal(t.g.advance(undefined), 1);
});

test('renderAlpha всегда в диапазоне [0, 1]', () => {
  const t = loadGame();
  for (const dt of [1, 5, 10, 16.7, 17, 33.4, 50, 400]) {
    t.frame(dt);
    assert.ok(t.g.renderAlpha >= 0 && t.g.renderAlpha <= 1, `dt ${dt}: ${t.g.renderAlpha}`);
  }
});

function arcX(t) {
  t.clearCalls();
  t.g.currentLevel[0].draw(t.ctx);
  return t.ctx.calls.find((c) => c[0] === 'arc')[1];
}

test('интерполяция: шар рисуется между предыдущей и текущей позицией', () => {
  const t = loadGame();
  t.g.currentLevel.length = 0;
  const b = new t.g.Circle(2, { x: 300, y: 200 }, 10, 'red');
  t.g.currentLevel.push(b);
  b.savePrev();
  b.update(1); // x = 310
  t.g.renderAlpha = 0; assert.equal(arcX(t), 300);
  t.g.renderAlpha = 0.5; assert.equal(arcX(t), 305);
  t.g.renderAlpha = 1; assert.equal(arcX(t), 310);
});

test('интерполяция работает через цикл: смещение шара на экране монотонно растёт между шагами', () => {
  const t = loadGame();
  t.g.currentLevel.length = 0;
  t.g.currentLevel.push(new t.g.Circle(2, { x: 300, y: 200 }, 6, 'red'));
  t.g.currentLevel[0].dy = 0;
  t.frame(); // инициализация
  const xs = [];
  for (let i = 0; i < 12; i++) { t.frame(1000 / 144); xs.push(arcXAfterPaint(t)); }
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] >= xs[i - 1] - 1e-9, `${xs}`);
  assert.ok(xs[11] > xs[0]);
});

function arcXAfterPaint(t) {
  t.clearCalls();
  t.g.paint();
  const a = t.ctx.calls.filter((c) => c[0] === 'arc');
  return a.length ? a[0][1] : NaN;
}

test('перенос игрока (positionPlayers) не «скользит» по экрану', () => {
  const t = loadGame({ players: 2 });
  t.g.players[0].x = 100;
  t.g.positionPlayers();
  const p = t.g.players[0];
  assert.equal(p.px, p.x);
  assert.equal(p.py, p.y);
});

test('на паузе позиции статичны: предыдущая равна текущей', () => {
  const t = loadGame();
  t.frame();
  t.press('Escape'); t.frame(); t.release('Escape');
  t.frame(); t.frame();
  const b = t.g.currentLevel[0];
  assert.equal(b.px, b.x);
  assert.equal(b.py, b.y);
});

test('осколки после деления появляются без смещения (prev = текущая)', () => {
  const t = loadGame();
  const arr = [new t.g.Circle(2, { x: 300, y: 300 }, 3, 'red')];
  t.g.split(0, arr);
  assert.ok(arr.every((b) => b.px === b.x && b.py === b.y));
});

test('гарпун: длина интерполируется между шагами', () => {
  const t = loadGame();
  const h = new t.g.Harpoon({ x: 500, y: 720 }, null, 'green');
  h.h = 100; h.savePrev(); h.h = 112;
  t.g.renderAlpha = 0.5;
  t.clearCalls(); h.draw(t.ctx);
  const rect = t.ctx.calls.find((c) => c[0] === 'fillRect');
  assert.equal(rect[4], 106);
});

test('savePrevAll запоминает позиции шаров, игроков, гарпунов и шаров титула', () => {
  const t = loadGame();
  t.press('ArrowRight'); t.ticks(1);
  t.g.currentLevel[0].x += 7;
  t.g.savePrevAll();
  assert.equal(t.g.currentLevel[0].px, t.g.currentLevel[0].x);
  assert.equal(t.g.players[0].px, t.g.players[0].x);
});

// ===== Устойчивость цикла =====

function silenceConsole(fn) {
  const orig = console.error;
  const calls = [];
  console.error = (...a) => calls.push(a);
  try { fn(calls); } finally { console.error = orig; }
}

const bomb = () => ({
  update() { throw new Error('boom'); }, draw() {}, savePrev() {},
  bounds() { return { x1: 0, x2: 0, y1: 0, y2: 0 }; }, intersects() { return false; },
});

test('исключение в логике: цикл продолжается, ошибка показана на экране', () => {
  silenceConsole((calls) => {
    const t = loadGame();
    t.g.currentLevel.push(bomb());
    t.frame();
    assert.ok(t.g.fatalError instanceof Error);
    assert.equal(t.raf.length, 1, 'следующий кадр запланирован');
    assert.equal(calls.length, 1);
    t.clearCalls(); t.frame();
    assert.ok(t.texts().includes('ОШИБКА'));
    assert.ok(t.texts().some((s) => s.includes('boom')));
  });
});

test('исключение при отрисовке тоже не останавливает цикл', () => {
  silenceConsole(() => {
    const t = loadGame();
    t.g.currentLevel.push({ ...bomb(), update() {}, draw() { throw new Error('draw failed'); } });
    t.frame();
    assert.equal(t.raf.length, 1);
    assert.ok(t.g.fatalError);
  });
});

test('после ошибки логика не выполняется (нет лавины повторных ошибок)', () => {
  silenceConsole((calls) => {
    const t = loadGame();
    t.g.currentLevel.push(bomb());
    t.frame();
    const time = t.g.time;
    for (let i = 0; i < 5; i++) t.frame();
    assert.equal(t.g.time, time);
    assert.equal(calls.length, 1);
  });
});

test('Enter после ошибки начинает игру заново; удержанный Enter не срабатывает сразу', () => {
  silenceConsole(() => {
    const t = loadGame({ players: 2 });
    t.press('Enter'); // удерживаем до ошибки
    t.g.currentLevel.push(bomb());
    t.frame();
    assert.ok(t.g.fatalError);
    t.frame(); t.frame();
    assert.ok(t.g.fatalError, 'удержание не восстанавливает');
    t.release('Enter'); t.frame();
    t.press('Enter'); t.frame();
    assert.equal(t.g.fatalError, null);
    assert.equal(t.g.gameState, 'playing');
    assert.equal(t.g.players.length, 2);
    assert.equal(t.g.level, 0);
  });
});

test('ошибка внутри самого экрана ошибки не роняет цикл', () => {
  silenceConsole(() => {
    const t = loadGame();
    t.g.currentLevel.push(bomb());
    t.ctx.fillRect = () => { throw new Error('canvas gone'); };
    t.frame();
    assert.equal(t.raf.length, 1);
  });
});

test('валидные данные уровня загружаются без ошибок в цикле', () => {
  const t = loadGame({ title: true });
  for (let i = 0; i < 30; i++) t.frame();
  assert.equal(t.g.fatalError, null);
});
