'use strict';
const { test, expect, hold, startKeyboardGame, open } = require('./helpers');

test('попадание даёт очки, рекорд пишется в localStorage и переживает перезагрузку', async ({ page }) => {
  await startKeyboardGame(page);
  await page.evaluate(() => {
    currentLevel.length = 0; currentSpikes = false; levelCountdown = 999;
    const ball = new Circle(2, { x: players[0].x, y: 300 }, 0, '#e91e63');
    ball.dy = 0;
    currentLevel.push(ball);
  });
  await hold(page, 'ArrowUp');
  await page.waitForFunction(() => players[0].score > 0, null, { timeout: 15000 });
  const s = await page.evaluate(() => ({ score: players[0].score, combo: players[0].combo, high: highScore, stored: localStorage.getItem('puzyrki.highScore') }));
  expect(s.score).toBe(100);
  expect(s.combo).toBe(1);
  expect(s.high).toBe(100);
  expect(s.stored).toBe('100');
  await open(page);
  expect(await page.evaluate(() => highScore)).toBe(100);
});

test('повреждённый рекорд в localStorage игнорируется', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('puzyrki.highScore', 'мусор'));
  await open(page);
  expect(await page.evaluate(() => highScore)).toBe(0);
});

test('рекорд из localStorage показывается в HUD и на экране конца игры', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('puzyrki.highScore', '4200'));
  await startKeyboardGame(page);
  expect(await page.evaluate(() => highScore)).toBe(4200);
  await page.evaluate(() => { players[0].lives = 1; currentLevel.push(new Circle(2, { x: players[0].x, y: players[0].y }, 0, '#e91e63')); });
  await page.waitForFunction(() => gameState === 'gameover');
  expect(await page.evaluate(() => resultLines().map((l) => l.text))).toEqual(['Счёт: 0', 'Рекорд: 4200']);
});

test('шар, лопнувший о шипы, приносит бонус', async ({ page }) => {
  await startKeyboardGame(page);
  await page.evaluate(() => {
    level = 2; loadLevel(2); introTimer = 0; levelCountdown = 999;
    currentLevel.length = 0;
    const ball = new Circle(3, { x: 640, y: 120 }, 0, '#009688');
    ball.owner = players[0]; ball.dy = -8;
    currentLevel.push(ball);
  });
  await page.waitForFunction(() => currentLevel.length === 0 && burstCount === 1, null, { timeout: 15000 });
  const { score, expected } = await page.evaluate(() => ({ score: players[0].score, expected: Math.round(subtreeValue(3) * SPIKE_BONUS) }));
  expect(score).toBe(expected);
});

test('серия попаданий: комбо растёт, промах его обнуляет', async ({ page }) => {
  await startKeyboardGame(page);
  const shoot = async () => {
    await page.waitForFunction(() => players[0].shots === 1 && players[0].cooldown <= 0);
    await hold(page, 'ArrowUp');
  };
  for (let n = 1; n <= 2; n++) {
    await page.evaluate(() => {
      currentLevel.length = 0; currentSpikes = false; levelCountdown = 999;
      const ball = new Circle(2, { x: players[0].x, y: 300 }, 0, '#e91e63');
      ball.dy = 0; currentLevel.push(ball);
    });
    await shoot();
    await page.waitForFunction((c) => players[0].combo === c, n, { timeout: 15000 });
  }
  await page.evaluate(() => { currentLevel.length = 0; });
  await shoot();                                        // промах: гарпун ни во что не попадёт
  await page.waitForFunction(() => players[0].combo === 0, null, { timeout: 15000 });
});
