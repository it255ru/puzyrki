'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

/** Выстрелить гарпуном игрока по шару: гарпун с острием внутри шара, один шаг логики. */
function hitBall(t, player, size, opts = {}) {
  const ball = new t.g.Circle(size, { x: opts.x ?? player.x, y: opts.y ?? 300 }, 0, 'red');
  ball.dy = 0;
  if (opts.owner !== undefined) ball.owner = opts.owner;
  t.g.currentLevel.push(ball);
  const h = new t.g.Harpoon({ x: ball.x, y: t.g.c.h }, player, player.color);
  h.h = t.g.c.h - (ball.y + ball.r - 3) - 15;
  t.g.harpoons.push(h);
  player.shots = 0;
  return { ball, harpoon: h };
}

function field(t, spikes = false) {
  t.g.currentLevel.length = 0;
  t.g.currentSpikes = spikes;
  t.g.levelCountdown = 999;
}

// ===== Таблица очков =====

test('меньше шар — больше очков за попадание', () => {
  const t = loadGame();
  assert.equal(t.g.HIT_POINTS.length, t.g.sizes.length);
  for (let i = 1; i < t.g.HIT_POINTS.length; i++) {
    assert.ok(t.g.HIT_POINTS[i] < t.g.HIT_POINTS[i - 1], `размер ${i}`);
  }
});

test('subtreeValue: стоимость шара со всеми осколками', () => {
  const t = loadGame();
  assert.equal(t.g.subtreeValue(-1), 0);
  assert.equal(t.g.subtreeValue(0), 200);
  assert.equal(t.g.subtreeValue(1), 150 + 2 * 200);
  assert.equal(t.g.subtreeValue(2), 100 + 2 * (150 + 2 * 200));
  for (let i = 1; i < 7; i++) assert.ok(t.g.subtreeValue(i) > t.g.subtreeValue(i - 1));
});

test('множитель комбо: длина серии, от 1 до COMBO_MAX', () => {
  const t = loadGame();
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 50].map((n) => t.g.comboMultiplier(n)), [1, 1, 2, 3, 4, 5, 5, 5]);
});

// ===== Попадания =====

test('попадание по шару приносит очки размера владельцу гарпуна', () => {
  const t = loadGame();
  field(t);
  const p = t.g.players[0];
  hitBall(t, p, 2);
  t.ticks(1);
  assert.equal(p.score, t.g.HIT_POINTS[2]);
  assert.equal(p.combo, 1);
  assert.equal(t.g.totalScore(), t.g.HIT_POINTS[2]);
});

test('очки за каждый размер шара совпадают с таблицей', () => {
  for (let size = 0; size < 7; size++) {
    const t = loadGame();
    field(t);
    const p = t.g.players[0];
    hitBall(t, p, size);
    t.ticks(1);
    assert.equal(p.score, t.g.HIT_POINTS[size], `размер ${size}`);
  }
});

test('серия попаданий подряд: множители ×1, ×2, ×3, … до COMBO_MAX', () => {
  const t = loadGame();
  field(t);
  const p = t.g.players[0];
  let expected = 0;
  for (let n = 1; n <= 7; n++) {
    t.g.currentLevel.length = 0;
    hitBall(t, p, 2);
    t.ticks(1);
    expected += t.g.HIT_POINTS[2] * Math.min(n, t.g.COMBO_MAX);
    assert.equal(p.score, expected, `попадание ${n}`);
    assert.equal(p.combo, n);
  }
});

test('промах (гарпун исчез, ни во что не попав) обнуляет серию', () => {
  const t = loadGame();
  field(t);
  const p = t.g.players[0];
  hitBall(t, p, 2); t.ticks(1);
  hitBall(t, p, 2); t.ticks(1);
  assert.equal(p.combo, 2);
  t.g.currentLevel.length = 0;
  t.press('ArrowUp'); t.ticks(1); t.release('ArrowUp');
  assert.equal(p.combo, 2, 'пока гарпун в полёте, серия цела');
  for (let i = 0; i < 150; i++) t.ticks(1);
  assert.equal(t.g.harpoons.length, 0);
  assert.equal(p.combo, 0, 'промах');
  const before = p.score;
  hitBall(t, p, 2); t.ticks(1);
  assert.equal(p.score, before + t.g.HIT_POINTS[2], 'следующее попадание снова ×1');
});

test('попадание прилипшим гарпуном засчитывается как попадание, а не промах', () => {
  const t = loadGame();
  field(t);
  const p = t.g.players[0];
  t.press('ArrowUp'); t.ticks(1); t.release('ArrowUp');
  const h = t.g.harpoons[0];
  while (!h.isStuck) t.ticks(1);
  const ball = new t.g.Circle(2, { x: p.x, y: 150 }, 0, 'red');
  ball.dy = 3;
  t.g.currentLevel.push(ball);
  for (let i = 0; i < 40 && t.g.harpoons.length > 0; i++) t.ticks(1);
  assert.equal(p.score, t.g.HIT_POINTS[2]);
  assert.equal(p.combo, 1);
});

test('потеря жизни обнуляет серию, но не очки', () => {
  const t = loadGame();
  field(t);
  const p = t.g.players[0];
  hitBall(t, p, 2); t.ticks(1);
  hitBall(t, p, 2); t.ticks(1);
  const score = p.score;
  t.g.onPlayerHit(p);
  assert.equal(p.combo, 0);
  assert.equal(p.score, score);
});

test('касание игрока шаром очков не приносит', () => {
  const t = loadGame();
  field(t);
  const p = t.g.players[0];
  t.g.currentLevel.push(new t.g.Circle(2, { x: p.x, y: p.y }, 0, 'red'));
  t.ticks(1);
  assert.equal(p.score, 0);
});

test('гарпун без владельца очков не начисляет и не падает', () => {
  const t = loadGame();
  const target = [new t.g.Circle(2, { x: 500, y: 400 }, 0, 'red')];
  const h = new t.g.Harpoon({ x: 500, y: 720 }, null, 'green');
  h.h = 400;
  assert.doesNotThrow(() => t.g.checkHit([h], target, 1));
  assert.equal(t.g.totalScore(), 0);
});

// ===== Хозяин шара и бонус за шипы =====

test('осколки наследуют хозяина: тот, чей гарпун задел шар', () => {
  const t = loadGame({ players: 2 });
  field(t);
  const [p1, p2] = t.g.players;
  hitBall(t, p2, 3);
  t.ticks(1);
  assert.equal(t.g.currentLevel.length, 2);
  assert.ok(t.g.currentLevel.every((b) => b.owner === p2));
  assert.equal(p1.score, 0);
});

test('шар, лопнувший о шипы, приносит стоимость всех осколков × SPIKE_BONUS хозяину', () => {
  const t = loadGame();
  field(t, true);
  const p = t.g.players[0];
  const ball = new t.g.Circle(3, { x: 640, y: 60 }, 0, 'red');
  ball.owner = p;
  ball.dy = -3;
  t.g.currentLevel.push(ball);
  t.ticks(2);
  assert.equal(t.g.currentLevel.length, 0);
  assert.equal(p.score, Math.round(t.g.subtreeValue(3) * t.g.SPIKE_BONUS));
  assert.equal(p.combo, 0, 'шипы не меняют серию');
});

test('бонус за шипы больше, чем очки за простое попадание по такому же шару', () => {
  const t = loadGame();
  for (let size = 0; size < 7; size++) {
    assert.ok(Math.round(t.g.subtreeValue(size) * t.g.SPIKE_BONUS) > t.g.HIT_POINTS[size]);
  }
});

test('шар без хозяина лопается о шипы без очков', () => {
  const t = loadGame();
  field(t, true);
  const ball = new t.g.Circle(3, { x: 640, y: 60 }, 0, 'red');
  ball.dy = -3;
  t.g.currentLevel.push(ball);
  t.ticks(2);
  assert.equal(t.g.currentLevel.length, 0);
  assert.equal(t.g.totalScore(), 0);
});

test('серия попаданий до шипов: полный сценарий — подъём шара и бонус', () => {
  const t = loadGame();
  field(t, true);
  const p = t.g.players[0];
  const { ball } = hitBall(t, p, 3, { y: 110 }); // шар прямо под шипами
  t.ticks(1);                                    // попадание: осколки с импульсом вверх
  const hitScore = p.score;
  assert.equal(hitScore, t.g.HIT_POINTS[3]);
  for (let i = 0; i < 10; i++) t.ticks(1);       // осколки взлетают и лопаются о шипы
  assert.equal(t.g.currentLevel.length, 0);
  assert.equal(p.score, hitScore + 2 * Math.round(t.g.subtreeValue(2) * t.g.SPIKE_BONUS));
});

// ===== Два игрока =====

test('у двух игроков свои очки и свои серии; всего — сумма', () => {
  const t = loadGame({ players: 2 });
  field(t);
  const [p1, p2] = t.g.players;
  hitBall(t, p1, 2, { x: 300 }); t.ticks(1);
  hitBall(t, p2, 1, { x: 900 }); t.ticks(1);
  assert.equal(p1.score, t.g.HIT_POINTS[2]);
  assert.equal(p2.score, t.g.HIT_POINTS[1]);
  assert.equal(p1.combo, 1);
  assert.equal(p2.combo, 1);
  assert.equal(t.g.totalScore(), p1.score + p2.score);
  t.g.onPlayerHit(p1);
  assert.equal(p2.combo, 1, 'потеря жизни первого не сбрасывает серию второго');
});

test('очки выбывшего игрока сохраняются в общем счёте', () => {
  const t = loadGame({ players: 2 });
  field(t);
  const [p1] = t.g.players;
  hitBall(t, p1, 2, { x: 300 }); t.ticks(1);
  p1.lives = 1;
  t.g.onPlayerHit(p1);
  assert.equal(p1.out, true);
  assert.equal(t.g.totalScore(), t.g.HIT_POINTS[2]);
});

test('рестарт обнуляет очки и серии, рекорд остаётся', () => {
  const t = loadGame();
  field(t);
  const p = t.g.players[0];
  hitBall(t, p, 2); t.ticks(1);
  const record = t.g.highScore;
  assert.ok(record > 0);
  t.g.restart();
  assert.equal(p.score, 0);
  assert.equal(p.combo, 0);
  assert.equal(t.g.highScore, record);
  assert.equal(t.g.recordAtStart, record);
  assert.equal(t.g.recordBeaten, false);
});

test('очки не превышают MAX_SCORE', () => {
  const t = loadGame();
  const p = t.g.players[0];
  p.score = t.g.MAX_SCORE - 10;
  t.g.addScore(p, 1000);
  assert.equal(p.score, t.g.MAX_SCORE);
  t.g.addScore(p, -5); t.g.addScore(p, NaN); t.g.addScore(null, 100);
  assert.equal(p.score, t.g.MAX_SCORE);
});

// ===== Рекорд и localStorage =====

test('рекорд читается из localStorage при старте', () => {
  const t = loadGame({ storage: new Map([['puzyrki.highScore', '4200']]) });
  assert.equal(t.g.highScore, 4200);
  assert.equal(t.g.recordAtStart, 4200);
});

test('без сохранённого рекорда он равен нулю', () => {
  const t = loadGame();
  assert.equal(t.g.highScore, 0);
});

test('мусор в хранилище игнорируется: нечисло, отрицательное, ноль, бесконечность, дробь, огромное', () => {
  const read = (v) => loadGame({ storage: new Map([['puzyrki.highScore', v]]) }).g.highScore;
  assert.equal(read('abc'), 0);
  assert.equal(read('-50'), 0);
  assert.equal(read('0'), 0);
  assert.equal(read('Infinity'), 0);
  assert.equal(read(''), 0);
  assert.equal(read('12.9'), 12);
  assert.equal(read('1e30'), 999999999);
});

test('новый рекорд записывается в localStorage сразу и растёт вместе со счётом', () => {
  const storage = new Map();
  const t = loadGame({ storage });
  field(t);
  const p = t.g.players[0];
  hitBall(t, p, 2); t.ticks(1);
  assert.equal(t.g.highScore, 100);
  assert.equal(storage.get('puzyrki.highScore'), '100');
  hitBall(t, p, 2); t.ticks(1);
  assert.equal(storage.get('puzyrki.highScore'), '300');
});

test('рекорд не уменьшается: меньший счёт его не затирает', () => {
  const storage = new Map([['puzyrki.highScore', '5000']]);
  const t = loadGame({ storage });
  field(t);
  hitBall(t, t.g.players[0], 2); t.ticks(1);
  assert.equal(t.g.highScore, 5000);
  assert.equal(storage.get('puzyrki.highScore'), '5000');
  assert.equal(t.g.recordBeaten, false);
});

test('рекорд — сумма очков всех игроков', () => {
  const t = loadGame({ players: 2 });
  field(t);
  const [p1, p2] = t.g.players;
  hitBall(t, p1, 2, { x: 300 }); t.ticks(1);
  hitBall(t, p2, 2, { x: 900 }); t.ticks(1);
  assert.equal(t.g.highScore, 200);
});

test('recordBeaten включается, только если побит ранее установленный рекорд', () => {
  const t = loadGame({ storage: new Map([['puzyrki.highScore', '150']]) });
  field(t);
  const p = t.g.players[0];
  hitBall(t, p, 2); t.ticks(1);                 // 100 < 150
  assert.equal(t.g.recordBeaten, false);
  hitBall(t, p, 2); t.ticks(1);                 // 100 + 200 = 300 > 150
  assert.equal(t.g.recordBeaten, true);
  const first = loadGame();                     // первая игра: рекорда не было
  field(first);
  hitBall(first, first.g.players[0], 2); first.ticks(1);
  assert.equal(first.g.recordBeaten, false, 'нулевой рекорд побивать «рекордом» не считаем');
});

test('рекорд сохраняется между запусками игры (общее хранилище)', () => {
  const storage = new Map();
  const a = loadGame({ storage });
  field(a);
  hitBall(a, a.g.players[0], 1); a.ticks(1);
  const b = loadGame({ storage });
  assert.equal(b.g.highScore, 150);
});

test('недоступное хранилище не ломает игру: рекорд живёт в сессии', () => {
  for (const storage of ['broken', 'throws', null]) {
    const t = loadGame({ storage });
    assert.equal(t.g.highScore, 0, String(storage));
    field(t);
    assert.doesNotThrow(() => { hitBall(t, t.g.players[0], 2); t.ticks(1); }, String(storage));
    assert.equal(t.g.highScore, 100, String(storage));
    t.clearCalls();
    assert.doesNotThrow(() => t.frame(), String(storage));
    assert.equal(t.g.fatalError, null);
  }
});

test('запись рекорда с ошибкой квоты не падает и не теряет счёт', () => {
  const t = loadGame({ storage: 'broken' });
  const p = t.g.players[0];
  assert.doesNotThrow(() => t.g.addScore(p, 500));
  assert.equal(p.score, 500);
});

// ===== HUD и экран конца =====

test('HUD: очки каждого игрока, комбо при серии от 2, рекорд', () => {
  const t = loadGame({ storage: new Map([['puzyrki.highScore', '777']]) });
  const p = t.g.players[0];
  p.score = 1250;
  t.clearCalls(); t.g.paint();
  assert.ok(t.texts().includes('Игрок 1: 1250'));
  assert.ok(t.texts().includes('Рекорд: 777'));
  p.combo = 3;
  t.clearCalls(); t.g.paint();
  assert.ok(t.texts().includes('Игрок 1: 1250  ×3'));
  p.combo = 1;
  t.clearCalls(); t.g.paint();
  assert.ok(!t.texts().some((s) => s.includes('×')));
});

test('HUD: при двух игроках показан общий счёт, блоки не накладываются', () => {
  const t = loadGame({ players: 2 });
  t.g.players[0].score = 300; t.g.players[1].score = 450;
  t.clearCalls(); t.g.paint();
  assert.ok(t.texts().includes('Игрок 1: 300'));
  assert.ok(t.texts().includes('Игрок 2: 450'));
  assert.ok(t.texts().includes('Всего: 750'));
  const xs = t.ctx.calls.filter((c) => c[0] === 'fillText' && /^Игрок [12]: \d+/.test(c[1])).map((c) => c[2]);
  assert.ok(Math.abs(xs[0] - xs[1]) >= t.g.HUD_SCORE_WIDTH);
});

test('HUD: верхняя строка ниже полосы шипов', () => {
  const t = loadGame();
  assert.ok(t.g.HUD_TOP_Y - 24 >= t.g.SPIKE_HEIGHT, 'текст не перекрывает шипы');
});

test('HUD: выбывший игрок остаётся в списке очков', () => {
  const t = loadGame({ players: 2 });
  t.g.players[0].score = 100; t.g.players[0].out = true;
  t.clearCalls(); t.g.paint();
  assert.ok(t.texts().includes('Игрок 1: 100'));
});

test('экран GAME OVER показывает счёт и рекорд; обычный случай', () => {
  const t = loadGame({ storage: new Map([['puzyrki.highScore', '9000']]) });
  t.g.players[0].score = 1234;
  t.g.gameState = 'gameover';
  t.clearCalls(); t.g.paint();
  assert.ok(t.texts().includes('GAME OVER'));
  assert.ok(t.texts().includes('Счёт: 1234'));
  assert.ok(t.texts().includes('Рекорд: 9000'));
});

test('экран победы при двух игроках: очки каждого и общий, новый рекорд золотом', () => {
  const t = loadGame({ players: 2, storage: new Map([['puzyrki.highScore', '100']]) });
  field(t);
  const [p1, p2] = t.g.players;
  hitBall(t, p1, 2, { x: 300 }); t.ticks(1);
  hitBall(t, p2, 2, { x: 900 }); t.ticks(1);
  t.g.gameState = 'win';
  t.clearCalls(); t.g.paint();
  assert.ok(t.texts().includes('ПОБЕДА!'));
  assert.ok(t.texts().includes(`Игрок 1: ${p1.score}   ·   Игрок 2: ${p2.score}`));
  assert.ok(t.texts().includes(`Всего: ${p1.score + p2.score}`));
  assert.ok(t.texts().includes(`Новый рекорд: ${t.g.highScore}!`));
});

test('resultLines: без нового рекорда показывает обычный рекорд', () => {
  const t = loadGame();
  const lines = t.g.resultLines();
  assert.deepEqual(lines.map((l) => l.text), ['Счёт: 0', 'Рекорд: 0']);
});

test('полный цикл: очки копятся за игру, GAME OVER, рестарт с нуля, рекорд сохранён', () => {
  const storage = new Map();
  const t = loadGame({ storage });
  field(t);
  const p = t.g.players[0];
  hitBall(t, p, 2); t.ticks(1);
  hitBall(t, p, 2); t.ticks(1);
  p.lives = 1; t.g.onPlayerHit(p);
  assert.equal(t.g.gameState, 'gameover');
  assert.equal(storage.get('puzyrki.highScore'), '300');
  t.press('Enter'); t.frame();
  assert.equal(t.g.gameState, 'playing');
  assert.equal(t.g.players[0].score, 0);
  assert.equal(t.g.highScore, 300);
});
