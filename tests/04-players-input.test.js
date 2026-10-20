'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

function addSecondPlayer(t) {
  t.down('*');
  t.g.time = 100; // выдержать задержку joinTimer
  t.g.hotJoin();
  t.up('*');
  assert.equal(t.g.players.length, 2);
}

test('keydown/keyup пишут клавиши в currentKeys в нижнем регистре', () => {
  const t = loadGame();
  t.down('A', 'KeyA');
  assert.equal(t.g.currentKeys['a'], true);
  assert.equal(t.g.currentKeys['keya'], true);
  t.up('A', 'KeyA');
  assert.equal(t.g.currentKeys['a'], false);
});

test('стрелки и пробел блокируют прокрутку страницы', () => {
  const t = loadGame();
  for (const k of [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    assert.equal(t.down(k).prevented, true, k);
    t.up(k);
  }
  assert.equal(t.down('x').prevented, false);
});

test('Shift и Space по коду клавиши включают соответствующие ключи', () => {
  const t = loadGame();
  t.down('Shift', 'ShiftLeft');
  assert.equal(t.g.currentKeys['shift'], true);
  t.up('Shift', 'ShiftLeft');
  assert.equal(t.g.currentKeys['shift'], false);
  t.down(' ', 'Space');
  assert.equal(t.g.currentKeys[' '], true);
});

test('игрок 1 двигается клавишами A/D и стрелками, в пределах экрана', () => {
  const t = loadGame();
  const p = t.g.players[0];
  const x0 = p.x;
  t.down('d');
  t.ticks(10);
  assert.equal(p.x, x0 + 50);
  t.up('d');
  t.down('ArrowLeft');
  t.ticks(10);
  assert.equal(p.x, x0);
  t.ticks(1000);
  assert.equal(p.x, 15);
  t.up('ArrowLeft');
  t.down('a'); t.down('d'); // обе стороны — стоит
  const xs = p.x; t.ticks(5);
  assert.equal(p.x, xs);
});

test('правая граница ограничивает игрока', () => {
  const t = loadGame();
  t.down('d');
  t.ticks(1000);
  assert.equal(t.g.players[0].x, t.g.c.w - 15);
});

test('выстрел создаёт гарпун цвета игрока, тратит выстрел; повтор — только после возврата', () => {
  const t = loadGame();
  const p = t.g.players[0];
  t.down(' ');
  t.ticks(1);
  assert.equal(t.g.harpoons.length, 1);
  assert.equal(t.g.harpoons[0].color, p.color);
  assert.equal(p.shots, 0);
  t.ticks(30); // кулдаун истёк, но выстрела нет, пока гарпун в полёте
  assert.ok(t.g.harpoons.length <= 1);
});

test('Shift тоже стреляет (игрок 1)', () => {
  const t = loadGame();
  t.down('Shift', 'ShiftLeft');
  t.ticks(1);
  assert.equal(t.g.harpoons.length, 1);
});

test('гарпун летит вверх, исчезает у потолка и возвращает выстрел', () => {
  const t = loadGame();
  const p = t.g.players[0];
  t.g.currentLevel.length = 0; t.g.levelCountdown = 99; // убрать шары, чтобы не мешали
  t.down(' ');
  t.ticks(1);
  t.up(' ');
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
  t.down(' ');
  t.ticks(1);
  t.up(' ');
  t.ticks(60);
  assert.equal(t.g.harpoons.length, 0);
  assert.ok(t.g.currentLevel.every((b) => b.size === 1));
  assert.equal(p.shots, p.modifiers.maxShots);
});

test('игрок 2 управляется J/L и стреляет «-»', () => {
  const t = loadGame();
  addSecondPlayer(t);
  const p2 = t.g.players[1];
  const x0 = p2.x;
  t.down('l'); t.ticks(4); t.up('l');
  assert.equal(p2.x, x0 + 20);
  t.down('-'); t.ticks(1); t.up('-');
  assert.equal(t.g.harpoons.length, 1);
  assert.equal(t.g.harpoons[0].owner, p2);
});

test('игроки управляются независимо', () => {
  const t = loadGame();
  addSecondPlayer(t);
  const [p1, p2] = t.g.players;
  const x1 = p1.x; const x2 = p2.x;
  t.down('d'); t.ticks(3);
  assert.equal(p1.x, x1 + 15);
  assert.equal(p2.x, x2);
});

test('hotJoin: * добавляет игрока, / убирает; последнего убрать нельзя', () => {
  const t = loadGame();
  addSecondPlayer(t);
  t.down('/'); t.g.time = 200; t.g.hotJoin(); t.up('/');
  assert.equal(t.g.players.length, 1);
  t.down('/'); t.g.time = 300; t.g.hotJoin(); t.up('/');
  assert.equal(t.g.players.length, 1);
});

test('hotJoin: повторное нажатие срабатывает не чаще, чем раз в 30 кадров', () => {
  const t = loadGame();
  t.g.time = 100;
  t.down('*');
  t.g.hotJoin();
  t.g.time = 110;
  t.g.hotJoin();
  assert.equal(t.g.players.length, 2);
});

test('positionPlayers: игроки равномерно распределены по ширине',  () => {
  const t = loadGame();
  addSecondPlayer(t);
  t.g.positionPlayers();
  const [a, b] = t.g.players;
  assert.ok(a.x < b.x);
  assert.equal(Math.round(a.x), Math.round(t.g.c.w / 3));
  assert.equal(Math.round(b.x), Math.round(t.g.c.w * 2 / 3));
});

// Известные дефекты ввода.
test('управление работает на русской раскладке (WASD по коду клавиши)',
  { todo: 'issue-high-keyboard-layout-dependent' }, () => {
    const t = loadGame();
    const x0 = t.g.players[0].x;
    t.down('ф', 'KeyA');
    t.ticks(5);
    assert.ok(t.g.players[0].x < x0);
  });

test('«_» (Shift+-) не заставляет стрелять игрока 1',
  { todo: 'issue-medium-shifted-keys-trigger-shoot' }, () => {
    const t = loadGame();
    t.down('Shift', 'ShiftLeft');
    t.down('_', 'Minus');
    t.ticks(1);
    assert.equal(t.g.harpoons.filter((h) => h.owner === t.g.players[0]).length, 0);
  });

test('при потере фокуса окна нажатые клавиши сбрасываются',
  { todo: 'issue-medium-stuck-keys' }, () => {
    const t = loadGame();
    t.down('d');
    (t.winListeners.blur || []).forEach((fn) => fn());
    assert.ok(!t.g.currentKeys['d']);
  });
