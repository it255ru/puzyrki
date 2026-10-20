'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

/** Подключить второго игрока его кнопкой выстрела (Enter) и отпустить её. */
function addSecondPlayer(t) {
  t.press('Enter');
  t.frame();
  t.release('Enter');
  t.frame();
  assert.equal(t.g.players.length, 2);
}

test('keyId использует физический код, символ — только как запасной вариант', () => {
  const t = loadGame();
  assert.equal(t.g.keyId({ key: 'ф', code: 'KeyA' }), 'keya');
  assert.equal(t.g.keyId({ key: 'Enter', code: '' }), 'enter');
  assert.equal(t.g.keyId({}), '');
});

test('keydown/keyup пишут физический код в currentKeys', () => {
  const t = loadGame();
  t.press('KeyA');
  assert.equal(t.g.currentKeys['keya'], true);
  t.release('KeyA');
  assert.equal(t.g.currentKeys['keya'], false);
});

test('символ клавиши игнорируется: управление не зависит от раскладки', () => {
  const t = loadGame();
  const x0 = t.g.players[0].x;
  t.down('ф', 'KeyA'); // русская раскладка, физическая клавиша A
  t.ticks(5);
  assert.equal(t.g.players[0].x, x0 - 25);
  t.up('ф', 'KeyA');
  t.down('a', ''); // запасной вариант без кода: символ как идентификатор
  assert.equal(t.g.currentKeys['a'], true);
});

test('пробел, стрелки и Enter блокируют действие браузера по умолчанию', () => {
  const t = loadGame();
  for (const code of ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']) {
    assert.equal(t.press(code).prevented, true, code);
    t.release(code);
  }
  assert.equal(t.press('KeyX').prevented, false);
});

test('в карте управления только два игрока и только left/right/shoot', () => {
  const t = loadGame();
  assert.equal(t.g.controls.players.length, 2);
  assert.equal(t.g.MAX_PLAYERS, 2);
  assert.equal(t.g.playerColors.length, 2);
  for (const map of t.g.controls.players) {
    for (const action of Object.values(map)) assert.ok(['left', 'right', 'shoot'].includes(action));
  }
});

test('игрок 1 двигается клавишами A/D в пределах экрана', () => {
  const t = loadGame();
  const p = t.g.players[0];
  const x0 = p.x;
  t.press('KeyD');
  t.ticks(10);
  assert.equal(p.x, x0 + 50);
  t.release('KeyD');
  t.press('KeyA');
  t.ticks(10);
  assert.equal(p.x, x0);
  t.ticks(1000);
  assert.equal(p.x, 15);
  t.press('KeyD'); // обе стороны — стоит
  const xs = p.x; t.ticks(5);
  assert.equal(p.x, xs);
});

test('стрелки больше не управляют игроком 1', () => {
  const t = loadGame();
  const x0 = t.g.players[0].x;
  t.press('ArrowRight');
  t.ticks(5);
  assert.equal(t.g.players[0].x, x0);
});

test('правая граница ограничивает игрока', () => {
  const t = loadGame();
  t.press('KeyD');
  t.ticks(1000);
  assert.equal(t.g.players[0].x, t.g.c.w - 15);
});

test('выстрел пробелом: гарпун цвета игрока, тратит выстрел; повтор — после возврата', () => {
  const t = loadGame();
  const p = t.g.players[0];
  t.press('Space');
  t.ticks(1);
  assert.equal(t.g.harpoons.length, 1);
  assert.equal(t.g.harpoons[0].color, p.color);
  assert.equal(p.shots, 0);
  t.ticks(30);
  assert.ok(t.g.harpoons.length <= 1);
});

test('Shift не стреляет', () => {
  const t = loadGame();
  t.press('ShiftLeft');
  t.ticks(2);
  assert.equal(t.g.harpoons.length, 0);
});

test('гарпун летит вверх, исчезает у потолка и возвращает выстрел', () => {
  const t = loadGame();
  const p = t.g.players[0];
  t.g.currentLevel.length = 0; t.g.levelCountdown = 99;
  t.press('Space');
  t.ticks(1);
  t.release('Space');
  assert.equal(p.shots, 0);
  t.ticks(100);
  assert.equal(t.g.harpoons.length, 0);
  assert.equal(p.shots, p.modifiers.maxShots);
});

test('выстрел попадает в шар над игроком: шар делится, выстрел возвращён', () => {
  const t = loadGame();
  const p = t.g.players[0];
  t.g.currentLevel.length = 0;
  t.g.currentLevel.push(new t.g.Circle(2, { x: p.x, y: 300 }, 0, 'red'));
  t.g.currentLevel[0].dy = 0;
  t.press('Space');
  t.ticks(1);
  t.release('Space');
  t.ticks(60);
  assert.equal(t.g.harpoons.length, 0);
  assert.ok(t.g.currentLevel.every((b) => b.size === 1));
  assert.equal(p.shots, p.modifiers.maxShots);
});

test('второй игрок подключается нажатием своей кнопки выстрела', () => {
  const t = loadGame();
  const x1 = t.g.players[0].x;
  addSecondPlayer(t);
  assert.equal(t.g.players[0].x, x1, 'первый игрок не сдвигается');
  assert.ok(t.g.players[1].x !== x1);
  assert.equal(t.g.players[1].color, t.g.playerColors[1]);
});

test('второй игрок появляется на свободной половине поля', () => {
  const t = loadGame();
  t.press('KeyD'); t.ticks(400); t.release('KeyD'); // игрок 1 у правого края
  addSecondPlayer(t);
  assert.ok(t.g.players[1].x < t.g.c.w / 2);
});

test('больше двух игроков подключить нельзя', () => {
  const t = loadGame();
  addSecondPlayer(t);
  t.press('Enter'); t.frame(); t.release('Enter'); t.frame();
  t.press('ControlRight'); t.frame(); t.release('ControlRight'); t.frame();
  assert.equal(t.g.players.length, 2);
});

test('игрок 2 управляется стрелками и стреляет Enter, Ctrl справа или Enter на нумпаде', () => {
  const t = loadGame();
  addSecondPlayer(t);
  const p2 = t.g.players[1];
  const x0 = p2.x;
  t.press('ArrowLeft'); t.ticks(4); t.release('ArrowLeft');
  assert.equal(p2.x, x0 - 20);
  for (const code of ['Enter', 'ControlRight', 'NumpadEnter']) {
    t.g.harpoons.length = 0; p2.shots = 1; p2.cooldown = 0;
    t.press(code); t.ticks(1); t.release(code);
    assert.equal(t.g.harpoons.length, 1, code);
    assert.equal(t.g.harpoons[0].owner, p2);
  }
});

test('игроки управляются независимо', () => {
  const t = loadGame();
  addSecondPlayer(t);
  const [p1, p2] = t.g.players;
  const x1 = p1.x; const x2 = p2.x;
  t.press('KeyD'); t.ticks(3);
  assert.equal(p1.x, x1 + 15);
  assert.equal(p2.x, x2);
});

test('подключение не работает на паузе и на экране конца игры', () => {
  const t = loadGame();
  t.g.pause = true;
  t.press('Enter'); t.g.hotJoin();
  assert.equal(t.g.players.length, 1);
  t.g.pause = false; t.g.gameState = 'gameover';
  t.g.hotJoin();
  assert.equal(t.g.players.length, 1);
});

test('positionPlayers: два игрока равномерно распределены по ширине', () => {
  const t = loadGame();
  addSecondPlayer(t);
  t.g.positionPlayers();
  const [a, b] = t.g.players;
  assert.equal(Math.round(a.x), Math.round(t.g.c.w / 3));
  assert.equal(Math.round(b.x), Math.round(t.g.c.w * 2 / 3));
});

test('потеря фокуса окна сбрасывает нажатые клавиши и ставит игру на паузу', () => {
  const t = loadGame();
  t.press('KeyD');
  t.fireWindow('blur');
  assert.ok(!t.g.currentKeys['keyd']);
  assert.equal(t.g.pause, true);
  const x = t.g.players[0].x;
  t.frame(); t.frame();
  assert.equal(t.g.players[0].x, x);
});

test('скрытие вкладки тоже сбрасывает клавиши', () => {
  const t = loadGame();
  t.press('KeyA');
  t.document.hidden = true;
  t.fireDocument('visibilitychange');
  assert.ok(!t.g.currentKeys['keya']);
});

test('возврат фокуса не снимает паузу автоматически; снимается Esc', () => {
  const t = loadGame();
  t.fireWindow('blur');
  t.frame();
  assert.equal(t.g.pause, true);
  t.press('Escape'); t.frame(); t.release('Escape'); t.frame();
  assert.equal(t.g.pause, false);
});
