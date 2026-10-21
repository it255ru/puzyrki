'use strict';
const { test, expect, open, hold, startKeyboardGame, canvasStats } = require('./helpers');

test('меню: клавиатура → один игрок, баннер первого уровня', async ({ page }) => {
  await startKeyboardGame(page);
  const s = await page.evaluate(() => ({ state: gameState, controls: players.map((p) => p.control), level, balls: currentLevel.length, intro: introTimer > 0, lives: players[0].lives }));
  expect(s).toEqual({ state: 'playing', controls: ['keyboard'], level: 0, balls: 1, intro: true, lives: 3 });
});

test('стрелки ← → двигают игрока, A/D не действуют', async ({ page }) => {
  await startKeyboardGame(page);
  const x = () => page.evaluate(() => players[0].x);
  let x0 = await x();
  await hold(page, 'KeyD', 300);
  await hold(page, 'KeyA', 300);
  expect(await x()).toBe(x0);
  await hold(page, 'ArrowRight', 300);
  const right = (await x()) - x0;
  expect(right).toBeGreaterThan(60);
  x0 = await x();
  await hold(page, 'ArrowLeft', 300);
  expect(x0 - (await x())).toBeGreaterThan(60);
});

test('↑ стреляет гарпуном, пробел и Enter не стреляют', async ({ page }) => {
  await startKeyboardGame(page);
  await hold(page, 'Space'); await hold(page, 'Enter'); await hold(page, 'ShiftLeft');
  expect(await page.evaluate(() => harpoons.length)).toBe(0);
  await hold(page, 'ArrowUp');
  expect(await page.evaluate(() => harpoons.length)).toBeGreaterThan(0);
  const stats = await canvasStats(page);
  expect(stats.nonBackground).toBeGreaterThan(200);
});

test('гарпун прилипает к потолку и возвращает выстрел', async ({ page }) => {
  await startKeyboardGame(page);
  await page.evaluate(() => { currentLevel.length = 0; levelCountdown = 999; });
  await hold(page, 'ArrowUp');
  await page.waitForFunction(() => harpoons.length > 0 && harpoons[0].isStuck, null, { timeout: 15000 });
  expect(await page.evaluate(() => players[0].shots)).toBe(0);
  await page.waitForFunction(() => harpoons.length === 0 && players[0].shots === 1, null, { timeout: 15000 });
});

test('пауза: P останавливает игру и снимается тем же P', async ({ page }) => {
  await startKeyboardGame(page);
  await hold(page, 'KeyP');
  await page.waitForFunction(() => pause === true);
  const y = await page.evaluate(() => currentLevel[0].y);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => currentLevel[0].y)).toBe(y);
  await hold(page, 'KeyP');
  await page.waitForFunction(() => pause === false);
});

test('потеря фокуса окна ставит игру на паузу и сбрасывает клавиши', async ({ page }) => {
  await startKeyboardGame(page);
  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(() => pause === true);
  expect(await page.evaluate(() => Object.values(currentKeys).some(Boolean))).toBe(false);
  await page.keyboard.up('ArrowRight');
});

test('пауза: на экране паузы видна метка версии', async ({ page }) => {
  await startKeyboardGame(page);
  await hold(page, 'KeyP');
  await page.waitForFunction(() => pause === true);
  const light = await page.evaluate(() => {
    // правый нижний угол: серый текст метки на тёмном оверлее
    const w = canvas.width, h = canvas.height;
    const d = canvas.getContext('2d').getImageData(Math.round(w * 0.78), Math.round(h * 0.93), Math.round(w * 0.2), Math.round(h * 0.06)).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 90) n++;
    return n;
  });
  expect(light).toBeGreaterThan(30);
});

test('потеря жизни: возврат на старт, неуязвимость, шары не сбрасываются', async ({ page }) => {
  await startKeyboardGame(page);
  await hold(page, 'ArrowRight', 300);
  const before = await page.evaluate(() => {
    currentLevel.push(new Circle(2, { x: players[0].x, y: players[0].y }, 0, '#e91e63'));
    return currentLevel.length;
  });
  await page.waitForFunction(() => players[0].lives === 2);
  const s = await page.evaluate(() => ({ x: players[0].x, spawn: players[0].spawnX, inv: players[0].invulnerable > 0, balls: currentLevel.length, state: gameState }));
  expect(s.x).toBe(s.spawn);
  expect(s.inv).toBe(true);
  expect(s.balls).toBe(before);
  expect(s.state).toBe('playing');
});

test('GAME OVER и победа: Enter перезапускает, второй игрок не появляется', async ({ page }) => {
  await startKeyboardGame(page);
  await page.evaluate(() => { players[0].lives = 1; currentLevel.push(new Circle(2, { x: players[0].x, y: players[0].y }, 0, '#e91e63')); });
  await page.waitForFunction(() => gameState === 'gameover');
  await hold(page, 'Enter');
  await page.waitForFunction(() => gameState === 'playing');
  expect(await page.evaluate(() => players.length)).toBe(1);
  await page.evaluate(() => { level = levels.length - 1; levelCountdown = -1; currentLevel.length = 0; });
  await page.waitForFunction(() => gameState === 'win');
  await hold(page, 'Enter');
  await page.waitForFunction(() => gameState === 'playing');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => ({ players: players.length, controls: players.map((p) => p.control), level }))).toEqual({ players: 1, controls: ['keyboard'], level: 0 });
});

test('меню: навигация, назад, недопустимые клавиши игру не запускают', async ({ page }) => {
  await open(page);
  for (const k of ['KeyX', 'ArrowLeft', 'ArrowRight']) await page.keyboard.press(k);
  expect(await page.evaluate(() => gameState)).toBe('title');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => menu.step)).toBe(1);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => menu.step)).toBe(0);
});
