'use strict';
const { test, expect, open, canvasStats, startKeyboardGame } = require('./helpers');

test('страница загружается без ошибок, заголовок и титульный экран', async ({ page }) => {
  await open(page);
  await expect(page).toHaveTitle('Пузырьки');
  expect(await page.evaluate(() => ({ state: gameState, step: menu.step, players: players.length }))).toEqual({ state: 'title', step: 0, players: 0 });
  const s = await canvasStats(page);
  expect(s.nonBackground).toBeGreaterThan(s.width * s.height / 7 / 4);
  expect(s.gold, 'золотой заголовок «ПУЗЫРЬКИ»').toBeGreaterThan(50);
  expect(s.colors).toBeGreaterThan(5);
});

test('метка версии подставлена при публикации и видна в игре', async ({ page }) => {
  await open(page);
  expect(await page.evaluate(() => BUILD)).toBe('e2e-test 2026-01-01 00:00');
  expect(await page.evaluate(() => buildLabel())).toBe('e2e-test 2026-01-01 00:00');
});

test('нет полос прокрутки, канвас помещается в окно', async ({ page }) => {
  await open(page);
  const m = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
    scrollH: document.documentElement.scrollHeight, clientH: document.documentElement.clientHeight,
    rect: canvas.getBoundingClientRect().toJSON(),
  }));
  expect(m.scrollW).toBeLessThanOrEqual(m.clientW);
  expect(m.scrollH).toBeLessThanOrEqual(m.clientH);
  expect(m.rect.width).toBeLessThanOrEqual(m.clientW);
  expect(m.rect.height).toBeLessThanOrEqual(m.clientH);
});

test('декоративные шары на титульном экране движутся', async ({ page }) => {
  await open(page);
  const before = await page.evaluate(() => titleBalls.map((b) => Math.round(b.x)));
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => titleBalls.map((b) => Math.round(b.x)))).not.toEqual(before);
});

test('логика идёт с частотой около 60 шагов в секунду', async ({ page }) => {
  await open(page);
  // время меряем внутри страницы: задержки между вызовами Playwright не искажают результат
  const rate = await page.evaluate(() => new Promise((resolve) => {
    const t0 = time; const p0 = performance.now();
    setTimeout(() => resolve((time - t0) / ((performance.now() - p0) / 1000)), 1000);
  }));
  expect(rate).toBeGreaterThan(55);
  expect(rate).toBeLessThan(65);
});

test('все 12 уровней загружаются и рисуются; число шаров совпадает с данными', async ({ page }) => {
  await startKeyboardGame(page);
  const count = await page.evaluate(() => levels.length);
  expect(count).toBe(12);
  for (let i = 0; i < count; i++) {
    const info = await page.evaluate((n) => {
      level = n; loadLevel(n);
      players[0].invulnerable = 1e9;
      return { balls: currentLevel.length, expected: levels[n].balls.length, name: levels[n].name, spikes: currentSpikes === !!levels[n].spikes };
    }, i);
    expect(info.balls, `уровень ${i + 1}`).toBe(info.expected);
    expect(info.spikes).toBe(true);
    await page.waitForTimeout(120);
    const s = await canvasStats(page);
    expect(s.nonBackground, `уровень ${i + 1} «${info.name}» нарисован`).toBeGreaterThan(200);
  }
});

test('шипы рисуются только на уровнях с шипами', async ({ page }) => {
  await startKeyboardGame(page);
  const spikePixels = async (n) => {
    await page.evaluate((i) => { level = i; loadLevel(i); introTimer = 0; players[0].invulnerable = 1e9; }, n);
    await page.waitForTimeout(100);
    // светлая полоса шипов у верхней границы канваса
    return page.evaluate(() => {
      const ctxData = canvas.getContext('2d').getImageData(0, 0, canvas.width, Math.round(canvas.height * 0.04)).data;
      let light = 0;
      for (let i = 0; i < ctxData.length; i += 4) if (ctxData[i] > 180 && ctxData[i + 1] > 190 && ctxData[i + 2] > 190) light++;
      return light;
    });
  };
  expect(await spikePixels(0)).toBeLessThan(50);
  expect(await spikePixels(2)).toBeGreaterThan(500);
});

test('адаптация к размеру окна: пропорции 16:9, без прокрутки', async ({ page }) => {
  for (const [w, h] of [[800, 450], [1920, 1080], [500, 1000], [1366, 768], [1000, 400]]) {
    await page.setViewportSize({ width: w, height: h });
    await open(page);
    const m = await page.evaluate(() => {
      const r = canvas.getBoundingClientRect();
      return { w: r.width, h: r.height, vw: innerWidth, vh: innerHeight,
        sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight };
    });
    expect(m.w, `${w}x${h}`).toBeLessThanOrEqual(m.vw);
    expect(m.h, `${w}x${h}`).toBeLessThanOrEqual(m.vh);
    expect(m.sw).toBeLessThanOrEqual(m.vw);
    expect(m.sh).toBeLessThanOrEqual(m.vh);
    expect(Math.abs((m.w - 10) / (m.h - 10) - 16 / 9)).toBeLessThan(0.03);
  }
});
