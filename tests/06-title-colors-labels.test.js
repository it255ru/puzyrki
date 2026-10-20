'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

test('игра начинается с титульного экрана: нет игроков и шаров', () => {
  const t = loadGame({ title: true });
  assert.equal(t.g.gameState, 'title');
  assert.equal(t.g.players.length, 0);
  assert.equal(t.g.currentLevel.length, 0);
});

test('титульный экран показывает название, управление и подсказку; без HUD', () => {
  const t = loadGame({ title: true });
  t.clearCalls();
  t.frame();
  const texts = t.texts();
  assert.ok(texts.includes('ПУЗЫРЬКИ'));
  assert.ok(texts.some((s) => s.includes('Игрок 1') && s.includes('Пробел')));
  assert.ok(texts.some((s) => s.includes('Игрок 2') && s.includes('Enter')));
  assert.ok(texts.some((s) => s.includes('Пробел — играть одному')));
  assert.ok(texts.includes('Нажмите любую клавишу'));
  assert.ok(!texts.some((s) => s.startsWith('Уровень') || s.startsWith('Жизни')));
});

test('подсказка «Нажмите любую клавишу» мигает', () => {
  const t = loadGame({ title: true });
  t.g.time = 0; t.clearCalls(); t.g.drawTitle();
  const on = t.texts().includes('Нажмите любую клавишу');
  t.g.time = 30; t.clearCalls(); t.g.drawTitle();
  const off = t.texts().includes('Нажмите любую клавишу');
  assert.notEqual(on, off);
});

test('декоративные шары на титульном экране движутся', () => {
  const t = loadGame({ title: true });
  const before = t.g.titleBalls.map((b) => b.x);
  for (let i = 0; i < 10; i++) t.frame();
  assert.notDeepEqual(t.g.titleBalls.map((b) => b.x), before);
  assert.equal(t.g.gameState, 'title');
});

test('пробел запускает игру на одного: уровень 1, 3 жизни', () => {
  const t = loadGame({ title: true });
  t.frame();
  t.press('Space');
  t.frame();
  assert.equal(t.g.gameState, 'playing');
  assert.equal(t.g.players.length, 1);
  assert.equal(t.g.level, 0);
  assert.equal(t.g.lives, t.g.MAX_LIVES);
  assert.equal(t.g.currentLevel.length, t.g.levels[0].balls.length);
});

test('любая другая клавиша запускает игру на одного', () => {
  const t = loadGame({ title: true });
  t.press('KeyX'); t.frame();
  assert.equal(t.g.gameState, 'playing');
  assert.equal(t.g.players.length, 1);
});

test('кнопка выстрела игрока 2 запускает игру вдвоём', () => {
  for (const code of ['Enter', 'NumpadEnter', 'ControlRight']) {
    const t = loadGame({ title: true });
    t.press(code); t.frame();
    assert.equal(t.g.gameState, 'playing', code);
    assert.equal(t.g.players.length, 2, code);
  }
});

test('игра стартует только по свежему нажатию, а не на каждой удерживаемой клавише', () => {
  const t = loadGame({ title: true });
  t.frame(); t.frame();
  assert.equal(t.g.gameState, 'title');
});

test('удержание кнопки выстрела при старте не стреляет сразу', () => {
  const t = loadGame({ title: true });
  t.press('Space'); t.frame();
  t.frame();
  assert.equal(t.g.harpoons.length, 0);
  for (let i = 0; i < 25; i++) t.frame();
  assert.ok(t.g.harpoons.length >= 1);
});

test('restart сохраняет число игроков', () => {
  const t = loadGame({ title: true });
  t.press('Enter'); t.frame(); t.release('Enter'); t.frame();
  t.g.gameState = 'gameover';
  t.press('Enter'); t.frame();
  assert.equal(t.g.gameState, 'playing');
  assert.equal(t.g.players.length, 2);
});

test('пауза и блюр на титульном экране не включают паузу', () => {
  const t = loadGame({ title: true });
  t.fireWindow('blur');
  assert.equal(t.g.pause, false);
});

test('у игроков разные цвета: синий и оранжевый', () => {
  const t = loadGame({ players: 2 });
  assert.deepEqual(t.g.playerColors, ['#42a5f5', '#ff9800']);
  assert.notEqual(t.g.players[0].color, t.g.players[1].color);
});

test('цвета шаров на уровнях не совпадают с цветами игроков', () => {
  const t = loadGame();
  for (const lvl of t.g.levels) {
    for (const b of lvl.balls) assert.ok(!t.g.playerColors.includes(b.color), b.color);
  }
});

test('над каждым игроком рисуется метка с его номером', () => {
  const t = loadGame({ players: 2 });
  t.clearCalls();
  t.g.paint();
  const labels = t.ctx.calls.filter((c) => c[0] === 'fillText' && /^[12]$/.test(c[1]));
  assert.deepEqual(labels.map((c) => c[1]).sort(), ['1', '2']);
  assert.ok(labels.every((c) => c[3] < t.g.c.h - 25));
});

test('метка мигает вместе с игроком при неуязвимости', () => {
  const t = loadGame();
  t.g.invulnerableTimer = 100;
  t.g.time = 0; t.clearCalls(); t.g.paint();
  const hidden = !t.ctx.calls.some((c) => c[0] === 'fillText' && c[1] === '1');
  t.g.time = 5; t.clearCalls(); t.g.paint();
  const shown = t.ctx.calls.some((c) => c[0] === 'fillText' && c[1] === '1');
  assert.ok(hidden && shown);
});
