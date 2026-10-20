'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');
const { playLevel } = require('./oracle');

const base = loadGame().g;
const N = base.levels.length;
const work = (i) => base.levels[i].balls.reduce((s, b) => s + base.subtreeValue(b.size), 0);

// ===== Структура кампании =====

test('кампания: от 10 до 15 уровней, у каждого название', () => {
  assert.ok(N >= 10 && N <= 15);
  base.levels.forEach((l, i) => assert.ok(typeof l.name === 'string' && l.name.length > 0, `уровень ${i + 1}`));
  assert.equal(new Set(base.levels.map((l) => l.name)).size, N, 'названия уникальны');
});

test('уровни не дублируют друг друга по составу шаров', () => {
  const sig = (l) => JSON.stringify([!!l.spikes, l.balls.map((b) => [b.size, b.x, b.y, b.dx])]);
  assert.equal(new Set(base.levels.map(sig)).size, N);
});

test('обучение: первые три уровня с подсказками; шипы вводятся ровно на третьем', () => {
  const [l1, l2, l3] = base.levels;
  for (const l of [l1, l2, l3]) assert.ok(l.hint && l.hint.length <= base.MAX_HINT_LENGTH);
  assert.ok(l1.hint.includes('{shoot}'), 'первая подсказка объясняет выстрел');
  assert.ok(/подбрасыва/i.test(l2.hint), 'вторая — подбрасывание');
  assert.ok(/шип/i.test(l3.hint), 'третья — шипы');
  assert.deepEqual([!!l1.spikes, !!l2.spikes, !!l3.spikes], [false, false, true]);
  for (const l of [l1, l2, l3]) assert.ok(l.balls.length <= 1, 'в обучении один шар');
  assert.ok(base.levels.slice(3).every((l) => l.hint === undefined), 'дальше без подсказок');
});

test('сложность растёт: полная стоимость шаров в начале меньше, чем в конце', () => {
  const w = base.levels.map((_, i) => work(i));
  assert.ok(w[N - 1] >= 4 * w[0]);
  assert.equal(w.indexOf(Math.max(...w)), N - 1, 'финал самый насыщенный');
  const half = Math.floor(N / 2);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(avg(w.slice(half)) > avg(w.slice(0, half)));
  assert.ok(w.slice(0, 3).every((x) => x <= 2500), 'обучение лёгкое');
});

test('цвета всех шаров заданы, читаются на фоне и не совпадают с цветами игроков', () => {
  for (const [i, l] of base.levels.entries()) {
    for (const b of l.balls) {
      assert.ok(/^#[0-9a-f]{6}$/i.test(b.color), `уровень ${i + 1}: цвет ${b.color}`);
      assert.ok(!base.playerColors.includes(b.color), `уровень ${i + 1}: совпал с цветом игрока`);
      assert.notEqual(b.color.toLowerCase(), '#444444', 'не сливается с фоном');
      assert.notEqual(b.color.toLowerCase(), '#666666');
    }
  }
});

test('шары стартуют внутри поля, выше игрока и не лопнут о шипы сами', () => {
  for (const [i, l] of base.levels.entries()) {
    assert.doesNotThrow(() => base.validateLevel(l, i));
    for (const b of l.balls) {
      const r = base.sizes[b.size].r;
      assert.ok(b.y + r <= base.c.h - base.PLAYER_ZONE, `уровень ${i + 1}`);
    }
  }
});

test('валидация: нелепые название и подсказка отвергаются', () => {
  const ball = { size: 1, x: 300, y: 300, dx: 2 };
  assert.throws(() => base.validateLevel({ name: '', balls: [ball] }, 0), /name/);
  assert.throws(() => base.validateLevel({ name: 5, balls: [ball] }, 0), /name/);
  assert.throws(() => base.validateLevel({ name: 'x'.repeat(41), balls: [ball] }, 0), /name/);
  assert.throws(() => base.validateLevel({ hint: '', balls: [ball] }, 0), /hint/);
  assert.throws(() => base.validateLevel({ hint: 'x'.repeat(base.MAX_HINT_LENGTH + 1), balls: [ball] }, 0), /hint/);
  assert.doesNotThrow(() => base.validateLevel({ name: 'ok', hint: 'ok', balls: [ball] }, 0));
});

test('валидация: шар у шипов, который поднимется до них сам, отвергается', () => {
  const ok = { size: 2, x: 640, y: 220, dx: 2 };
  assert.doesNotThrow(() => base.validateLevel({ spikes: true, balls: [ok] }, 0));
  assert.throws(() => base.validateLevel({ spikes: true, balls: [{ ...ok, y: 100 }] }, 4), /уровень 5.*до шипов сам/);
  assert.doesNotThrow(() => base.validateLevel({ balls: [{ ...ok, y: 100 }] }, 0), 'без шипов ограничения нет');
});

// ===== Проходимость: идеальный стрелок =====

test('каждый уровень проходим идеальным стрелком за разумное время', () => {
  for (let i = 0; i < N; i++) {
    const r = playLevel(i);
    assert.ok(r.cleared, `уровень ${i + 1} «${base.levels[i].name}» не пройден за ${r.ticks} шагов`);
    const sec = r.ticks / 60;
    assert.ok(sec >= 3, `уровень ${i + 1}: слишком быстро (${sec.toFixed(1)} с)`);
    assert.ok(sec <= 60, `уровень ${i + 1}: слишком долго (${sec.toFixed(1)} с)`);
    assert.ok(r.shots >= 5, `уровень ${i + 1}: проходится ${r.shots} выстрелами — слишком просто`);
  }
});

test('идеальная игра приносит очки на каждом уровне', () => {
  for (let i = 0; i < N; i++) assert.ok(playLevel(i).score > 0, `уровень ${i + 1}`);
});

test('идеальная игра на уровнях с шипами достигает шипов (механика достижима): шипы на 3-м уровне', () => {
  const r = playLevel(2);
  assert.ok(r.bursts >= 1, `лопнувших о шипы: ${r.bursts}`);
});

test('прохождение всех уровней подряд идёт до победы', () => {
  const t = loadGame();
  const g = t.g;
  g.players[0].invulnerable = Infinity;
  let guard = 0;
  while (g.gameState === 'playing' && guard++ < 200) {
    // быстро очищаем уровень идеальным стрелком, затем даём игре перейти дальше
    const r = playLevel(g.level);
    assert.ok(r.cleared);
    g.currentLevel.length = 0;
    t.ticks(100);
  }
  assert.equal(g.gameState, 'win');
  assert.equal(g.level, N - 1);
});

// ===== Справедливость старта =====

function graceTicks(index, players) {
  const t = loadGame({ players });
  const g = t.g;
  g.level = index; g.loadLevel(index); g.levelCountdown = -1;
  const lives = g.players.map((p) => p.lives);
  for (let n = 0; n < 3000; n++) {
    g.logic();
    if (g.players.some((p, k) => p.lives < lives[k])) return n;
  }
  return Infinity;
}

test('на старте у стоящего на месте игрока есть не менее секунды: ни на одном уровне нет мгновенной гибели', () => {
  for (let i = 0; i < N; i++) {
    for (const players of [1, 2]) {
      assert.ok(graceTicks(i, players) >= 60, `уровень ${i + 1}, игроков ${players}: ${graceTicks(i, players)} шагов`);
    }
  }
});

test('на первых уровнях у стоящего одиночного игрока запас не меньше двух секунд', () => {
  for (let i = 0; i < 3; i++) assert.ok(graceTicks(i, 1) >= 120, `уровень ${i + 1}`);
});

// ===== Подсказки и название на экране =====

test('при загрузке уровня запускается показ названия; с подсказкой — дольше', () => {
  const t = loadGame();
  t.g.loadLevel(3);
  assert.equal(t.g.introTimer, t.g.INTRO_FRAMES);
  t.g.loadLevel(0);
  assert.equal(t.g.introTimer, t.g.INTRO_HINT_FRAMES);
  assert.ok(t.g.INTRO_HINT_FRAMES > t.g.INTRO_FRAMES);
});

test('баннер уровня: название и подсказка с подстановкой кнопки выстрела', () => {
  const t = loadGame();
  t.g.loadLevel(0);
  t.clearCalls(); t.g.paint();
  const texts = t.texts();
  assert.ok(texts.includes('Уровень 1: Первый выстрел'));
  assert.ok(texts.some((s) => s.includes('↑ — выстрел')), texts.join(' | '));
  assert.ok(!texts.some((s) => s.includes('{shoot}')));
});

test('подсказка под схему управления: клавиатура, мышь, оба', () => {
  const kb = loadGame();
  assert.equal(kb.g.shootHint(), '↑');
  const ms = loadGame({ controls: ['mouse'] });
  assert.equal(ms.g.shootHint(), 'левая кнопка мыши');
  const both = loadGame({ players: 2 });
  assert.equal(both.g.shootHint(), '↑ / левая кнопка мыши');
});

test('баннер исчезает после показа и не рисуется на экране конца игры', () => {
  const t = loadGame();
  t.g.level = 3;
  t.g.loadLevel(3);
  t.clearCalls(); t.g.paint();
  assert.ok(t.texts().includes(`Уровень 4: ${t.g.levels[3].name}`));
  t.g.introTimer = 0;
  t.clearCalls(); t.g.paint();
  assert.ok(!t.texts().some((s) => s.startsWith('Уровень 4:')));
  t.g.introTimer = 100;
  t.g.gameState = 'gameover';
  t.clearCalls(); t.g.paint();
  assert.ok(!t.texts().some((s) => s.startsWith('Уровень 4:')));
});

test('таймер баннера идёт только пока игра идёт (не на паузе)', () => {
  const t = loadGame();
  t.g.loadLevel(0);
  const before = t.g.introTimer;
  t.ticks(10);
  assert.ok(Math.abs(t.g.introTimer - (before - 10)) < 1e-9);
  t.g.pause = true;
  t.frame(); t.frame(); t.frame();
  assert.ok(t.g.introTimer > before - 20, 'на паузе логика не идёт');
});

test('wrapText переносит по словам и не превышает ширину строки', () => {
  const t = loadGame();
  const lines = t.g.wrapText('раз два три четыре пять шесть семь', 12);
  assert.ok(lines.every((l) => l.length <= 12), lines.join('|'));
  assert.equal(lines.join(' '), 'раз два три четыре пять шесть семь');
  assert.deepEqual(t.g.wrapText('', 10), []);
  assert.deepEqual(t.g.wrapText('длинноеслововсамомделе', 5), ['длинноеслововсамомделе']);
});

test('все подсказки умещаются в баннер (не больше 3 строк)', () => {
  for (const [i, l] of base.levels.entries()) {
    if (!l.hint) continue;
    assert.ok(base.wrapText(l.hint.replace('{shoot}', '↑ / левая кнопка мыши'), 70).length <= 3, `уровень ${i + 1}`);
  }
});
