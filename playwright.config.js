'use strict';
// Браузерные (e2e) тесты игры: реальный Chromium, реальная отрисовка, клавиатура,
// мышь с захватом курсора. Запуск: npm run test:e2e
// Локально можно использовать установленный Chrome без загрузки браузера: PW_CHANNEL=chrome npm run test:e2e
const { defineConfig } = require('@playwright/test');

const PORT = Number(process.env.E2E_PORT || 4173);

module.exports = defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // «chromium» — полноценный Chromium в новом headless-режиме, ближе к настоящему браузеру игрока
    channel: process.env.PW_CHANNEL || 'chromium',
    viewport: { width: 1400, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node e2e/serve.js',
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    env: { E2E_PORT: String(PORT) },
  },
});
