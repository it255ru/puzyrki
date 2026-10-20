'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

/** Нажать и отпустить клавишу. */
function tap(t, code) { t.press(code); t.release(code); }

// ===== Титульный экран =====

test('игра начинается с титульного экрана: нет игроков и шаров', () => {
  const t = loadGame({ title: true });
  assert.equal(t.g.gameState, 'title');
  assert.equal(t.g.players.length, 0);
  assert.equal(t.g.currentLevel.length, 0);
});

test('шаг 1 меню: «Как управлять?», два пункта, подсказка по клавишам; без HUD', () => {
  const t = loadGame({ title: true });
  t.clearCalls(); t.frame();
  const texts = t.texts();
  assert.ok(texts.includes('ПУЗЫРЬКИ'));
  assert.ok(texts.includes('Как управлять?'));
  assert.ok(texts.some((s) => s.startsWith('Клавиатура:') && s.includes('↑')));
  assert.ok(texts.some((s) => s.startsWith('Мышь:') && s.includes('левая кнопка')));
  assert.ok(texts.some((s) => s.includes('Enter — подтвердить')));
  assert.ok(!texts.some((s) => s.startsWith('Уровень') || (s.startsWith('Игрок') && s.includes('♥'))));
});

test('шаг 2 меню: «Играть вдвоём?»', () => {
  const t = loadGame({ title: true });
  tap(t, 'Enter');
  t.clearCalls(); t.frame();
  assert.ok(t.texts().includes('Играть вдвоём?'));
  assert.ok(t.texts().some((s) => s.startsWith('Нет — один игрок')));
  assert.ok(t.texts().some((s) => s.startsWith('Да — вдвоём')));
});

test('декоративные шары на титульном экране движутся', () => {
  const t = loadGame({ title: true });
  const before = t.g.titleBalls.map((b) => b.x);
  for (let i = 0; i < 10; i++) t.frame();
  assert.notDeepEqual(t.g.titleBalls.map((b) => b.x), before);
  assert.equal(t.g.gameState, 'title');
});

test('произвольные клавиши игру не запускают', () => {
  const t = loadGame({ title: true });
  for (const code of ['KeyX', 'ArrowLeft', 'ArrowRight', 'ShiftLeft']) tap(t, code);
  t.frame(); t.frame();
  assert.equal(t.g.gameState, 'title');
  assert.equal(t.g.menu.step, 0);
});

// ===== Путь 1: клавиатура, один игрок =====

test('меню: клавиатура → один игрок', () => {
  const t = loadGame({ title: true });
  tap(t, 'Enter');                       // «Клавиатура»
  assert.equal(t.g.menu.step, 1);
  assert.equal(t.g.menu.control, 'keyboard');
  tap(t, 'Enter');                       // «Нет — один игрок»
  assert.equal(t.g.gameState, 'playing');
  assert.deepEqual(t.g.players.map((p) => p.control), ['keyboard']);
  assert.equal(t.g.level, 0);
  assert.equal(t.g.players[0].lives, t.g.MAX_LIVES);
  assert.equal(t.lockRequests.length, 0, 'курсор для клавиатуры не захватывается');
});

// ===== Путь 2: мышь, один игрок =====

test('меню: мышь → один игрок; захват курсора запрашивается', () => {
  const t = loadGame({ title: true });
  tap(t, 'ArrowDown'); tap(t, 'Enter');  // «Мышь»
  assert.equal(t.g.menu.control, 'mouse');
  tap(t, 'Enter');                       // «Нет — один игрок»
  assert.equal(t.g.gameState, 'playing');
  assert.deepEqual(t.g.players.map((p) => p.control), ['mouse']);
  assert.equal(t.lockRequests.length, 1);
  t.grantLock();
  assert.equal(t.g.pause, false);
});

// ===== Путь 3: клавиатура, вдвоём =====

test('меню: клавиатура → вдвоём: игрок 1 стрелки, игрок 2 мышь', () => {
  const t = loadGame({ title: true });
  tap(t, 'Enter');
  tap(t, 'ArrowDown'); tap(t, 'Enter');
  assert.equal(t.g.gameState, 'playing');
  assert.deepEqual(t.g.players.map((p) => p.control), ['keyboard', 'mouse']);
  assert.equal(t.lockRequests.length, 1);
});

// ===== Путь 4: мышь, вдвоём → первый автоматически клавиатура =====

test('меню: мышь → вдвоём: первый игрок автоматически переключается на клавиатуру', () => {
  const t = loadGame({ title: true });
  tap(t, 'ArrowDown'); tap(t, 'Enter');  // «Мышь»
  t.clearCalls(); t.frame();
  tap(t, 'ArrowDown');                   // «Да — вдвоём»
  t.clearCalls(); t.frame();
  assert.ok(t.texts().some((s) => s.includes('игрок 1 переключается на стрелки')), 'пояснение показано');
  tap(t, 'Enter');
  assert.deepEqual(t.g.players.map((p) => p.control), ['keyboard', 'mouse']);
});

test('пояснение про переключение не показывается, если выбрана клавиатура', () => {
  const t = loadGame({ title: true });
  tap(t, 'Enter'); tap(t, 'ArrowDown');
  t.clearCalls(); t.frame();
  assert.ok(!t.texts().some((s) => s.includes('переключается на стрелки')));
});

// ===== Навигация =====

test('навигация клавишами: ↑/↓ по кругу, Space и Num Enter подтверждают, Esc/Backspace — назад', () => {
  const t = loadGame({ title: true });
  assert.equal(t.g.menu.index, 0);
  tap(t, 'ArrowUp');
  assert.equal(t.g.menu.index, 1, 'вверх с первого — на последний');
  tap(t, 'ArrowDown');
  assert.equal(t.g.menu.index, 0);
  tap(t, 'Space');
  assert.equal(t.g.menu.step, 1);
  tap(t, 'Escape');
  assert.equal(t.g.menu.step, 0);
  tap(t, 'NumpadEnter');
  assert.equal(t.g.menu.step, 1);
  tap(t, 'Backspace');
  assert.equal(t.g.menu.step, 0);
});

test('Назад возвращает курсор меню на выбранный ранее пункт', () => {
  const t = loadGame({ title: true });
  tap(t, 'ArrowDown'); tap(t, 'Enter'); // мышь
  tap(t, 'Escape');
  assert.equal(t.g.menu.index, 1);
});

test('Esc на первом шаге ничего не ломает', () => {
  const t = loadGame({ title: true });
  tap(t, 'Escape');
  assert.equal(t.g.menu.step, 0);
  assert.equal(t.g.gameState, 'title');
});

test('автоповтор удерживаемой клавиши не листает меню и не подтверждает пункты', () => {
  const t = loadGame({ title: true });
  t.press('ArrowDown');
  for (let i = 0; i < 10; i++) t.repeat('ArrowDown');
  assert.equal(t.g.menu.index, 1, 'сдвинулось один раз');
  t.release('ArrowDown');
  t.press('Enter');
  for (let i = 0; i < 10; i++) t.repeat('Enter');
  assert.equal(t.g.menu.step, 1, 'подтвердилось один раз');
  assert.equal(t.g.gameState, 'title');
});

test('навигация мышью: наведение выбирает пункт, клик подтверждает', () => {
  const t = loadGame({ title: true });
  const second = { x: t.g.c.w / 2, y: t.g.MENU_TOP + t.g.MENU_ITEM_H + 10 };
  t.mouseMove(0, t.at(second.x, second.y));
  assert.equal(t.g.menu.index, 1);
  t.mouseDown(t.at(second.x, second.y));       // «Мышь»
  assert.equal(t.g.menu.step, 1);
  assert.equal(t.g.menu.control, 'mouse');
  const first = { x: t.g.c.w / 2, y: t.g.MENU_TOP + 10 };
  t.mouseDown(t.at(first.x, first.y));         // «Нет — один игрок»
  assert.equal(t.g.gameState, 'playing');
  assert.deepEqual(t.g.players.map((p) => p.control), ['mouse']);
});

test('клик мимо пунктов и правая кнопка ничего не выбирают', () => {
  const t = loadGame({ title: true });
  t.mouseDown(t.at(50, 50));
  t.mouseDown({ button: 2, ...t.at(t.g.c.w / 2, t.g.MENU_TOP + 10) });
  assert.equal(t.g.menu.step, 0);
  assert.equal(t.g.gameState, 'title');
});

test('координаты клика пересчитываются с учётом масштаба и рамки канваса', () => {
  for (const [w, h] of [[640, 360], [1280, 720], [1920, 1080]]) {
    const t = loadGame({ title: true, width: w, height: h });
    const p = t.g.canvasPoint(t.at(400, 300));
    assert.ok(Math.abs(p.x - 400) < 3 && Math.abs(p.y - 300) < 3, `${w}x${h}: ${p.x},${p.y}`);
    const q = t.g.menuItemAt(t.g.canvasPoint(t.at(t.g.c.w / 2, t.g.MENU_TOP + t.g.MENU_ITEM_H + 10)));
    assert.equal(q, 1, `${w}x${h}`);
  }
});

// ===== Браузер без Pointer Lock =====

test('без Pointer Lock пункты с мышью недоступны, выбрать их нельзя', () => {
  const t = loadGame({ title: true, pointerLock: false });
  assert.equal(t.g.lockSupported(), false);
  assert.equal(t.g.menuItems()[1].disabled, true);
  tap(t, 'ArrowDown'); tap(t, 'Enter');
  assert.equal(t.g.menu.step, 0, 'шаг не сменился');
  t.clearCalls(); t.frame();
  assert.ok(t.texts().some((s) => s.includes('недоступно в этом браузере')));
  // клавиатура работает; вдвоём недоступно
  tap(t, 'ArrowUp'); tap(t, 'Enter');
  assert.equal(t.g.menuItems()[1].disabled, true);
  tap(t, 'ArrowDown'); tap(t, 'Enter');
  assert.equal(t.g.gameState, 'title');
  tap(t, 'ArrowUp'); tap(t, 'Enter');
  assert.equal(t.g.gameState, 'playing');
  assert.deepEqual(t.g.players.map((p) => p.control), ['keyboard']);
});

test('наведение мыши на недоступный пункт его не выбирает', () => {
  const t = loadGame({ title: true, pointerLock: false });
  t.mouseMove(0, t.at(t.g.c.w / 2, t.g.MENU_TOP + t.g.MENU_ITEM_H + 10));
  assert.equal(t.g.menu.index, 0);
});

// ===== Старт игры =====

test('после старта кнопка выстрела, которой подтверждали меню, не стреляет сразу', () => {
  const t = loadGame({ title: true });
  tap(t, 'Enter'); tap(t, 'Enter');
  t.press('ArrowUp'); t.frame(); t.frame();
  assert.equal(t.g.harpoons.length, 0);
  for (let i = 0; i < 25; i++) t.frame();
  assert.ok(t.g.harpoons.length >= 1);
});

test('restart сохраняет число игроков и схемы управления', () => {
  const t = loadGame({ title: true });
  tap(t, 'Enter'); tap(t, 'ArrowDown'); tap(t, 'Enter');   // клавиатура + мышь
  t.grantLock();
  t.g.gameState = 'gameover';
  t.press('Enter'); t.frame(); t.release('Enter');
  assert.equal(t.g.gameState, 'playing');
  assert.deepEqual(t.g.players.map((p) => p.control), ['keyboard', 'mouse']);
});

test('перезапуск после ошибки сохраняет схемы управления', () => {
  const orig = console.error; console.error = () => {};
  try {
    const t = loadGame({ players: 2 });
    t.g.currentLevel.push({ update() { throw new Error('boom'); }, draw() {}, savePrev() {}, bounds() { return { x1: 0, x2: 0, y1: 0, y2: 0 }; }, intersects() { return false; } });
    t.frame();
    assert.ok(t.g.fatalError);
    t.press('Enter'); t.frame();
    assert.equal(t.g.fatalError, null);
    assert.deepEqual(t.g.players.map((p) => p.control), ['keyboard', 'mouse']);
  } finally { console.error = orig; }
});

test('ошибка на титульном экране возвращает в меню', () => {
  const orig = console.error; console.error = () => {};
  try {
    const t = loadGame({ title: true });
    t.g.titleBalls.push({ update() { throw new Error('boom'); }, draw() {}, savePrev() {} });
    t.frame();
    assert.ok(t.g.fatalError);
    t.press('Enter'); t.frame();
    assert.equal(t.g.gameState, 'title');
    assert.equal(t.g.menu.step, 0);
  } finally { console.error = orig; }
});

// ===== Цвета и метки =====

test('у игроков разные цвета: голубой и оранжевый', () => {
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
  t.g.players[0].invulnerable = 100;
  t.g.time = 0; t.clearCalls(); t.g.paint();
  const hidden = !t.ctx.calls.some((c) => c[0] === 'fillText' && c[1] === '1');
  t.g.time = 5; t.clearCalls(); t.g.paint();
  const shown = t.ctx.calls.some((c) => c[0] === 'fillText' && c[1] === '1');
  assert.ok(hidden && shown);
});
