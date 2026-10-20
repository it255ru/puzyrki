'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

// ===== Идентификаторы клавиш и события =====

test('keyId использует физический код, символ — только как запасной вариант', () => {
  const t = loadGame();
  assert.equal(t.g.keyId({ key: 'ф', code: 'KeyA' }), 'keya');
  assert.equal(t.g.keyId({ key: 'Enter', code: '' }), 'enter');
  assert.equal(t.g.keyId({}), '');
});

test('keydown/keyup пишут физический код в currentKeys', () => {
  const t = loadGame();
  t.press('ArrowLeft');
  assert.equal(t.g.currentKeys['arrowleft'], true);
  t.release('ArrowLeft');
  assert.equal(t.g.currentKeys['arrowleft'], false);
});

test('символ клавиши игнорируется: управление не зависит от раскладки', () => {
  const t = loadGame();
  const x0 = t.g.players[0].x;
  t.down('какой-то символ', 'ArrowLeft');
  t.ticks(5);
  assert.equal(t.g.players[0].x, x0 - 25);
});

test('пробел, стрелки и Enter блокируют действие браузера по умолчанию', () => {
  const t = loadGame();
  for (const code of ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']) {
    assert.equal(t.press(code).prevented, true, code);
    t.release(code);
  }
  assert.equal(t.press('KeyX').prevented, false);
});

// ===== Клавиатура: ← → движение, ↑ выстрел =====

test('схемы управления: клавиатура — только стрелки, действия left/right/shoot', () => {
  const t = loadGame();
  assert.deepEqual(t.g.controls.keyboard, { arrowleft: 'left', arrowright: 'right', arrowup: 'shoot' });
  assert.equal(t.g.MAX_PLAYERS, 2);
  assert.equal(t.g.playerColors.length, 2);
});

test('клавиатура: ←/→ двигают игрока в пределах экрана', () => {
  const t = loadGame();
  const p = t.g.players[0];
  const x0 = p.x;
  t.press('ArrowRight'); t.ticks(10); t.release('ArrowRight');
  assert.equal(p.x, x0 + 50);
  t.press('ArrowLeft'); t.ticks(10); t.release('ArrowLeft');
  assert.equal(p.x, x0);
  t.press('ArrowLeft'); t.ticks(1000);
  assert.equal(p.x, 15);
  t.release('ArrowLeft'); t.press('ArrowRight'); t.ticks(1000);
  assert.equal(p.x, t.g.c.w - 15);
});

test('клавиатура: обе стороны одновременно — игрок стоит', () => {
  const t = loadGame();
  const p = t.g.players[0];
  t.press('ArrowLeft'); t.press('ArrowRight');
  const x = p.x; t.ticks(5);
  assert.equal(p.x, x);
});

test('клавиатура: ↑ стреляет гарпуном цвета игрока и тратит выстрел', () => {
  const t = loadGame();
  const p = t.g.players[0];
  t.press('ArrowUp'); t.ticks(1);
  assert.equal(t.g.harpoons.length, 1);
  assert.equal(t.g.harpoons[0].color, p.color);
  assert.equal(p.shots, 0);
  t.ticks(30);
  assert.ok(t.g.harpoons.length <= 1, 'пока гарпун в полёте, второго нет');
});

test('старые клавиши не действуют: A/D, пробел, Shift, Enter, Ctrl', () => {
  const t = loadGame();
  const p = t.g.players[0];
  const x0 = p.x;
  for (const code of ['KeyA', 'KeyD', 'Space', 'ShiftLeft', 'Enter', 'NumpadEnter', 'ControlRight', 'ArrowDown']) {
    t.press(code); t.ticks(3); t.release(code);
  }
  assert.equal(p.x, x0);
  assert.equal(t.g.harpoons.length, 0);
});

test('гарпун летит вверх, прилипает у потолка и возвращает выстрел', () => {
  const t = loadGame();
  const p = t.g.players[0];
  t.g.currentLevel.length = 0; t.g.levelCountdown = 99;
  t.press('ArrowUp'); t.ticks(1); t.release('ArrowUp');
  assert.equal(p.shots, 0);
  t.ticks(120);
  assert.equal(t.g.harpoons.length, 0);
  assert.equal(p.shots, p.modifiers.maxShots);
});

test('выстрел попадает в шар над игроком: шар делится, выстрел возвращён', () => {
  const t = loadGame();
  const p = t.g.players[0];
  t.g.currentLevel.length = 0;
  t.g.currentLevel.push(new t.g.Circle(2, { x: p.x, y: 300 }, 0, 'red'));
  t.g.currentLevel[0].dy = 0;
  t.press('ArrowUp'); t.ticks(1); t.release('ArrowUp');
  t.ticks(60);
  assert.equal(t.g.harpoons.length, 0);
  assert.ok(t.g.currentLevel.every((b) => b.size === 1));
  assert.equal(p.shots, p.modifiers.maxShots);
});

// ===== Мышь: смещение — движение, левая кнопка — выстрел =====

function mouseGame(extra = {}) {
  const t = loadGame({ controls: ['mouse'], ...extra });
  return t;
}

test('мышь: у игрока схема mouse, курсор захвачен', () => {
  const t = mouseGame();
  assert.equal(t.g.players[0].control, 'mouse');
  assert.equal(t.g.mouseLocked(), true);
});

test('мышь: смещение двигает игрока на movementX / масштаб', () => {
  const t = mouseGame();
  const p = t.g.players[0];
  const x0 = p.x;
  t.mouseMove(40);
  t.ticks(1);
  assert.ok(Math.abs(p.x - (x0 + 40 / t.g.viewScale * t.g.MOUSE_SENSITIVITY)) < 1e-9);
  const x1 = p.x;
  t.mouseMove(-20);
  t.ticks(1);
  assert.ok(Math.abs(p.x - (x1 - 20 / t.g.viewScale)) < 1e-9);
});

test('мышь: несколько событий между шагами суммируются, без движения игрок стоит', () => {
  const t = mouseGame();
  const p = t.g.players[0];
  const x0 = p.x;
  t.mouseMove(5); t.mouseMove(5); t.mouseMove(-2);
  t.ticks(1);
  assert.ok(Math.abs(p.x - (x0 + 8 / t.g.viewScale)) < 1e-9);
  const x1 = p.x;
  t.ticks(5);
  assert.equal(p.x, x1);
});

test('мышь: движение не накапливается между шагами без логики (пауза)', () => {
  const t = mouseGame();
  const p = t.g.players[0];
  t.press('KeyP'); t.frame(); t.release('KeyP'); t.frame();
  assert.equal(t.g.pause, true);
  const x0 = p.x;
  t.mouseMove(500); t.frame(); t.frame();
  t.press('KeyP'); t.frame(); t.release('KeyP'); t.frame(); t.frame();
  assert.equal(t.g.pause, false);
  assert.equal(p.x, x0, 'накопленное на паузе смещение не применилось');
});

test('мышь: резкий взмах ограничен MOUSE_MAX_STEP за шаг', () => {
  const t = mouseGame();
  const p = t.g.players[0];
  p.x = 300; p.snap();
  t.mouseMove(100000);
  t.ticks(1);
  assert.equal(p.x, 300 + t.g.MOUSE_MAX_STEP);
  t.mouseMove(-100000);
  t.ticks(1);
  assert.equal(p.x, 300);
});

test('мышь: игрок не выходит за границы поля', () => {
  const t = mouseGame();
  const p = t.g.players[0];
  for (let i = 0; i < 100; i++) { t.mouseMove(500); t.ticks(1); }
  assert.equal(p.x, t.g.c.w - 15);
  for (let i = 0; i < 100; i++) { t.mouseMove(-500); t.ticks(1); }
  assert.equal(p.x, 15);
});

test('мышь: движение без захвата курсора игнорируется', () => {
  const t = mouseGame();
  const p = t.g.players[0];
  t.loseLock();
  const x0 = p.x;
  t.mouseMove(50); t.ticks(1);
  assert.equal(p.x, x0);
});

test('мышь: левая кнопка стреляет, удержание — стрельба по перезарядке', () => {
  const t = mouseGame();
  const p = t.g.players[0];
  t.mouseDown(); t.ticks(1);
  assert.equal(t.g.harpoons.length, 1);
  assert.equal(t.g.harpoons[0].owner, p);
  assert.equal(p.shots, 0);
  t.mouseUp();
});

test('мышь: быстрый щелчок (нажал и отпустил между шагами) не теряется', () => {
  const t = mouseGame();
  t.mouseDown(); t.mouseUp();
  t.ticks(1);
  assert.equal(t.g.harpoons.length, 1);
  t.ticks(1);
  assert.equal(t.g.harpoons.length, 1, 'щелчок не стреляет повторно');
});

test('мышь: правая и средняя кнопки и колесо не стреляют', () => {
  const t = mouseGame();
  t.mouseDown({ button: 2 }); t.mouseDown({ button: 1 });
  t.ticks(3);
  assert.equal(t.g.harpoons.length, 0);
  t.mouseUp({ button: 2 });
});

test('мышь: контекстное меню на странице отключено', () => {
  const t = mouseGame();
  assert.equal(t.contextMenu().prevented, true);
});

test('мышь: клавиши игрока с клавиатурой на мышиного игрока не влияют', () => {
  const t = mouseGame();
  const p = t.g.players[0];
  const x0 = p.x;
  t.press('ArrowLeft'); t.press('ArrowUp'); t.ticks(5);
  assert.equal(p.x, x0);
  assert.equal(t.g.harpoons.length, 0);
});

test('мышь: без нажатия кнопка не «залипает» — после mouseUp выстрелов нет', () => {
  const t = mouseGame();
  const p = t.g.players[0];
  t.mouseDown(); t.ticks(1); t.mouseUp();
  t.g.harpoons.length = 0; p.shots = 1; p.cooldown = 0;
  t.ticks(30);
  assert.equal(t.g.harpoons.length, 0);
});

test('потеря фокуса окна сбрасывает кнопку мыши и смещение', () => {
  const t = mouseGame();
  t.mouseDown(); t.mouseMove(100);
  t.fireWindow('blur');
  assert.equal(t.g.mouse.held, false);
  assert.equal(t.g.mouse.dx, 0);
});

// ===== Два игрока: клавиатура + мышь =====

test('два игрока: первый с клавиатурой, второй с мышью, независимо', () => {
  const t = loadGame({ players: 2 });
  const [p1, p2] = t.g.players;
  assert.deepEqual([p1.control, p2.control], ['keyboard', 'mouse']);
  const x1 = p1.x; const x2 = p2.x;
  t.press('ArrowRight'); t.ticks(3);
  assert.equal(p1.x, x1 + 15);
  assert.equal(p2.x, x2);
  t.release('ArrowRight');
  t.mouseMove(30); t.ticks(1);
  assert.equal(p1.x, x1 + 15);
  assert.ok(p2.x > x2);
});

test('два игрока: выстрелы привязаны к владельцам', () => {
  const t = loadGame({ players: 2 });
  const [p1, p2] = t.g.players;
  t.press('ArrowUp'); t.ticks(1); t.release('ArrowUp');
  assert.deepEqual(t.g.harpoons.map((h) => h.owner), [p1]);
  t.mouseDown(); t.ticks(1); t.mouseUp();
  assert.deepEqual(t.g.harpoons.map((h) => h.owner).sort((a, b) => a.number - b.number), [p1, p2]);
});

test('positionPlayers: два игрока равномерно распределены по ширине', () => {
  const t = loadGame({ players: 2 });
  t.g.positionPlayers();
  const [a, b] = t.g.players;
  assert.equal(Math.round(a.x), Math.round(t.g.c.w / 3));
  assert.equal(Math.round(b.x), Math.round(t.g.c.w * 2 / 3));
});

test('горячего подключения нет: щелчок мыши в игре на одного не добавляет игрока', () => {
  const t = loadGame();
  t.mouseDown(); t.mouseUp(); t.ticks(3);
  assert.equal(t.g.players.length, 1);
  t.press('Enter'); t.frame(); t.release('Enter');
  assert.equal(t.g.players.length, 1);
});

// ===== Захват курсора и пауза =====

test('потеря захвата во время игры ставит паузу «Кликните, чтобы продолжить»', () => {
  const t = mouseGame();
  t.loseLock();
  t.frame();
  assert.equal(t.g.pause, true);
  assert.equal(t.g.pausedByLockLoss, true);
  t.clearCalls(); t.frame();
  assert.ok(t.texts().includes('PAUSE'));
  assert.ok(t.texts().includes('Кликните, чтобы продолжить'));
});

test('клик запрашивает захват, возврат захвата снимает паузу; клик не стреляет', () => {
  const t = mouseGame();
  t.loseLock(); t.frame();
  const requests = t.lockRequests.length;
  t.mouseDown(); t.mouseUp();
  assert.equal(t.lockRequests.length, requests + 1);
  assert.equal(t.g.pause, true, 'пока захват не выдан — пауза');
  t.grantLock();
  assert.equal(t.g.pause, false);
  assert.equal(t.g.pausedByLockLoss, false);
  t.ticks(3);
  assert.equal(t.g.harpoons.length, 0, 'клик возврата захвата не выстрелил');
});

test('пауза клавишей P при захваченной мыши снимается той же клавишей', () => {
  const t = mouseGame();
  t.press('KeyP'); t.frame(); t.release('KeyP'); t.frame();
  assert.equal(t.g.pause, true);
  t.clearCalls(); t.frame();
  assert.ok(t.texts().includes('ESC / P — продолжить'));
  t.press('KeyP'); t.frame(); t.release('KeyP'); t.frame();
  assert.equal(t.g.pause, false);
});

test('пауза клавишей, затем потеря захвата: снятие паузы клавишей возвращает паузу до клика', () => {
  const t = mouseGame();
  t.press('KeyP'); t.frame(); t.release('KeyP'); t.frame();
  t.loseLock();
  t.press('KeyP'); t.frame(); t.release('KeyP'); t.frame();
  assert.equal(t.g.pause, true, 'без захвата играть с мышью нельзя');
  assert.equal(t.g.pausedByLockLoss, true);
  t.mouseDown(); t.grantLock();
  assert.equal(t.g.pause, false);
});

test('отказ в захвате показывает сообщение и оставляет паузу', () => {
  const t = mouseGame();
  t.loseLock(); t.frame();
  t.mouseDown();
  t.lockFailed();
  t.frame();
  assert.equal(t.g.lockError, true);
  assert.equal(t.g.pause, true);
  t.clearCalls(); t.frame();
  assert.ok(t.texts().includes('Не удалось захватить мышь — кликните ещё раз'));
});

test('игра с клавиатурой не зависит от захвата курсора', () => {
  const t = loadGame();
  t.fireDocument('pointerlockchange');
  t.frame(); t.frame();
  assert.equal(t.g.pause, false);
});

test('пауза при ожидании захвата не включается до истечения LOCK_WAIT_FRAMES', () => {
  const t = loadGame({ title: true });
  t.press('Enter'); t.release('Enter');         // клавиатура
  t.press('ArrowDown'); t.release('ArrowDown'); // «вдвоём»
  t.press('Enter'); t.release('Enter');
  assert.equal(t.g.gameState, 'playing');
  assert.equal(t.lockRequests.length, 1);
  for (let i = 0; i < 30; i++) t.frame();
  assert.equal(t.g.pause, false, 'ждём ответа браузера');
  for (let i = 0; i < t.g.LOCK_WAIT_FRAMES; i++) t.frame();
  assert.equal(t.g.pause, true, 'захвата нет — пауза');
});

test('потеря захвата на экране конца игры не ломает рестарт кликом', () => {
  const t = loadGame({ players: 2 });
  t.g.gameState = 'gameover';
  t.loseLock();
  t.mouseDown();
  assert.equal(t.g.gameState, 'playing');
  assert.equal(t.lockRequests.length > 0, true);
});

test('клик на экране конца игры перезапускает игру', () => {
  const t = loadGame();
  t.g.gameState = 'win';
  t.mouseDown();
  assert.equal(t.g.gameState, 'playing');
});
