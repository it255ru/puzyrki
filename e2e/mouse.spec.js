'use strict';
const { test, expect, open, startMouseGame, startTwoPlayerGame, hold } = require('./helpers');

test('меню: мышь → один игрок, курсор захвачен', async ({ page }) => {
  await startMouseGame(page);
  const s = await page.evaluate(() => ({ controls: players.map((p) => p.control), locked: mouseLocked(), pause }));
  expect(s).toEqual({ controls: ['mouse'], locked: true, pause: false });
});

test('смещение мыши двигает игрока в обе стороны', async ({ page }) => {
  await startMouseGame(page);
  const x = () => page.evaluate(() => players[0].x);
  await page.mouse.move(700, 450);
  const x0 = await x();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(700 + i * 12, 450); await page.waitForTimeout(25); }
  const right = (await x()) - x0;
  expect(right).toBeGreaterThan(40);
  const x1 = await x();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(820 - i * 12, 450); await page.waitForTimeout(25); }
  expect(x1 - (await x())).toBeGreaterThan(40);
});

test('левая кнопка стреляет, правая нет', async ({ page }) => {
  await startMouseGame(page);
  await page.mouse.click(600, 400, { button: 'right' });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => harpoons.length)).toBe(0);
  await page.mouse.click(600, 400);
  await page.waitForFunction(() => harpoons.length > 0);
});

test('потеря захвата ставит паузу, клик возвращает управление без выстрела', async ({ page }) => {
  await startMouseGame(page);
  await page.evaluate(() => document.exitPointerLock());
  await page.waitForFunction(() => pause === true && pausedByLockLoss === true);
  await page.mouse.click(600, 400);
  await page.waitForFunction(() => document.pointerLockElement === canvas && pause === false);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => harpoons.length)).toBe(0);
});

test('игра вдвоём: игрок 1 — стрелки, игрок 2 — мышь, управляются независимо', async ({ page }) => {
  await startTwoPlayerGame(page);
  expect(await page.evaluate(() => players.map((p) => p.control))).toEqual(['keyboard', 'mouse']);
  const xs = () => page.evaluate(() => players.map((p) => p.x));
  const [a0, b0] = await xs();
  await hold(page, 'ArrowRight', 300);
  const [a1, b1] = await xs();
  expect(a1 - a0).toBeGreaterThan(60);
  expect(b1).toBe(b0);
  await page.mouse.move(700, 450);
  for (let i = 1; i <= 8; i++) { await page.mouse.move(700 + i * 12, 450); await page.waitForTimeout(25); }
  const [a2, b2] = await xs();
  expect(b2 - b1).toBeGreaterThan(30);
  expect(a2).toBe(a1);
});

test('игра вдвоём: каждый стреляет своей кнопкой; подсказка уровня называет обе', async ({ page }) => {
  await startTwoPlayerGame(page);
  expect(await page.evaluate(() => shootHint())).toBe('↑ / левая кнопка мыши');
  await hold(page, 'ArrowUp');
  await page.mouse.click(600, 400);
  await page.waitForFunction(() => new Set(harpoons.map((h) => h.owner.number)).size === 2);
});

test('меню: мышь — наведение и клик, мышь → вдвоём автоматически даёт игроку 1 клавиатуру', async ({ page }) => {
  await open(page);
  const rect = await page.evaluate(() => canvas.getBoundingClientRect().toJSON());
  const at = (lx, ly) => ({ x: rect.x + 5 + lx * (rect.width - 10) / 1280, y: rect.y + 5 + ly * (rect.height - 10) / 720 });
  const item = (i) => at(640, 330 + i * 64 + 10);
  const p1 = item(1);
  await page.mouse.move(p1.x, p1.y);
  await page.waitForFunction(() => menu.index === 1);
  await page.mouse.click(p1.x, p1.y);                       // «Мышь»
  await page.waitForFunction(() => menu.step === 1 && menu.control === 'mouse');
  const p2 = item(1);
  await page.mouse.click(p2.x, p2.y);                       // «Да — вдвоём»
  await page.waitForFunction(() => gameState === 'playing');
  expect(await page.evaluate(() => players.map((p) => p.control))).toEqual(['keyboard', 'mouse']);
});

test('клик на экране конца игры перезапускает игру и сохраняет схемы', async ({ page }) => {
  await startTwoPlayerGame(page);
  await page.evaluate(() => { players.forEach((p) => { p.lives = 1; p.invulnerable = 0; });
    currentLevel.length = 0;
    for (const p of players) currentLevel.push(new Circle(2, { x: p.x, y: p.y }, 0, '#e91e63')); });
  await page.waitForFunction(() => gameState === 'gameover');
  await page.mouse.click(600, 400);
  await page.waitForFunction(() => gameState === 'playing');
  expect(await page.evaluate(() => players.map((p) => p.control))).toEqual(['keyboard', 'mouse']);
});
