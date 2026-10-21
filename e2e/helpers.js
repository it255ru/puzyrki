'use strict';
const { test: base, expect } = require('@playwright/test');

/** Страница, которая сама следит за ошибками: любая ошибка консоли или исключение валит тест. */
const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
    await use(page);
    expect(errors, 'ошибки страницы').toEqual([]);
  },
});

const HOLD_MS = 90;   // дольше одного шага логики (16,7 мс): нажатие точно будет замечено

async function open(page, url = '/') {
  await page.goto(url);
  await page.waitForFunction(() => typeof gameState !== 'undefined' && typeof tick === 'function');
}

/** Нажать клавишу и подержать — для клавиш, которые игра читает по шагам (стрельба, пауза, рестарт). */
async function hold(page, key, ms = HOLD_MS) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

/** Меню: «Клавиатура» → «Нет — один игрок». */
async function startKeyboardGame(page) {
  await open(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => gameState === 'playing');
  await waitCooldown(page);
}

/** Меню: «Мышь» → «Нет — один игрок»; ждёт захват курсора. */
async function startMouseGame(page) {
  await open(page);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => gameState === 'playing');
  await page.waitForFunction(() => document.pointerLockElement === canvas);
  await waitCooldown(page);
}

/** Меню: «Клавиатура» → «Да — вдвоём»; ждёт захват курсора. */
async function startTwoPlayerGame(page) {
  await open(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => gameState === 'playing');
  await page.waitForFunction(() => document.pointerLockElement === canvas);
  await waitCooldown(page);
}

/** Пройти защитную паузу выстрела после старта. */
async function waitCooldown(page) {
  await page.waitForFunction(() => players.every((p) => p.cooldown <= 0));
}

/** Статистика нарисованного на канвасе: сколько точек не фоновые, сколько разных цветов, есть ли золотые. */
async function canvasStats(page) {
  return page.evaluate(() => {
    const { width, height } = canvas;
    const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    const colors = new Set();
    let nonBackground = 0; let gold = 0;
    for (let i = 0; i < data.length; i += 4 * 7) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      colors.add((r >> 4) << 8 | (g >> 4) << 4 | (b >> 4));
      if (!(r === 0x44 && g === 0x44 && b === 0x44)) nonBackground++;
      if (r > 220 && g > 190 && g < 235 && b < 60) gold++;
    }
    return { width, height, colors: colors.size, nonBackground, gold };
  });
}

module.exports = { test, expect, open, hold, startKeyboardGame, startMouseGame, startTwoPlayerGame, canvasStats, waitCooldown, HOLD_MS };
