'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadGame } = require('./harness');

test('в index.html ровно одна метка сборки-заглушка, её подставляет workflow Pages', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.equal((html.match(/"__BUILD__"/g) || []).length, 1);
  const wf = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'pages.yml'), 'utf8');
  assert.ok(wf.includes('__BUILD__'), 'workflow подставляет метку');
  assert.ok(wf.includes('GITHUB_SHA'));
});

test('локально метка сборки — «dev»', () => {
  const t = loadGame({ title: true });
  assert.equal(t.g.buildLabel(), 'dev');
});

test('на титульном экране показана версия сборки', () => {
  const t = loadGame({ title: true });
  t.clearCalls(); t.frame();
  assert.ok(t.texts().includes('версия: dev'));
});

test('подставленная при публикации метка отображается как есть', () => {
  const t = loadGame({ title: true, build: 'abc1234 2026-10-21 00:10' });
  assert.equal(t.g.buildLabel(), 'abc1234 2026-10-21 00:10');
  t.clearCalls(); t.frame();
  assert.ok(t.texts().includes('версия: abc1234 2026-10-21 00:10'));
});

test('версия показана на паузе, но не мешает игре', () => {
  const t = loadGame({ build: 'abc1234 2026-10-21 00:10' });
  t.clearCalls(); t.frame();
  assert.ok(!t.texts().some((s) => s.startsWith('версия')), 'в игре метки нет');
  t.g.pause = true;
  t.clearCalls(); t.frame();
  assert.ok(t.texts().includes('версия: abc1234 2026-10-21 00:10'));
});

test('метка в правом нижнем углу поля', () => {
  const t = loadGame({ title: true });
  t.clearCalls(); t.g.paint();
  const call = t.ctx.calls.find((c) => c[0] === 'fillText' && c[1].startsWith('версия'));
  assert.ok(call[2] <= t.g.c.w && call[2] > t.g.c.w - 30);
  assert.ok(call[3] <= t.g.c.h && call[3] > t.g.c.h - 30);
});
