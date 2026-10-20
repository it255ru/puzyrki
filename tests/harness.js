'use strict';
// Запускает скрипт из index.html в Node с заглушками DOM/Canvas.
// Игра остаётся одним файлом; тесты получают доступ к её внутренностям
// через accessor-объект, собранный внутри той же области видимости.

const fs = require('node:fs');
const path = require('node:path');

const HTML = path.join(__dirname, '..', 'index.html');

const LET_VARS = [
  'time', 'gameSpeed', 'level', 'debug', 'debugHeld', 'levelCountdown',
  'currentKeys', 'harpoons', 'pause', 'pauseHeld', 'restartHeld', 'lastTimestamp', 'accumulator', 'renderAlpha', 'fatalError', 'gameState', 'lives',
  'invulnerableTimer', 'controls', 'playerColors', 'currentLevel', 'players', 'levels', 'titleBalls', 'prevKeys',
];
const CONSTS = ['c', 'weight', 'sizes', 'MAX_LIVES', 'MAX_PLAYERS', 'STEP_MS', 'MAX_FRAME_MS', 'CANVAS_BORDER'];
const FUNCS = [
  'Shape', 'Harpoon', 'Enemy', 'Circle', 'Player', 'readInput', 'keyId', 'releaseAllKeys', 'checkHit', 'split', 'paused',
  'positionPlayers', 'startGame', 'updateTitle', 'drawTitle', 'loadLevel', 'onPlayerHit', 'restart', 'logic', 'paint', 'drawHUD',
  'validateLevel', 'createBalls', 'drawOverlay', 'debugSpeed', 'debugToggle', 'hotJoin', 'savePrevAll', 'tick', 'advance',
  'drawFatalError', 'recoverFromError', 'loop', 'resize',
];

function extractScript() {
  const html = fs.readFileSync(HTML, 'utf8');
  const m = html.match(/<script[^>]*>([\s\S]*)<\/script>/);
  if (!m) throw new Error('script not found in index.html');
  return m[1];
}

function makeCtx() {
  const calls = [];
  const state = {};
  const ctx = new Proxy(state, {
    get(t, prop) {
      if (prop === 'calls') return calls;
      if (prop in t) return t[prop];
      return (...args) => { calls.push([prop, ...args]); };
    },
    set(t, prop, value) { t[prop] = value; return true; },
  });
  return ctx;
}

/** title: true — остаться на титульном экране; иначе сразу начать игру на одного. */
function loadGame({ width = 1280, height = 720, dpr = 1, title = false, players = 1 } = {}) {
  const listeners = {};
  const winListeners = {};
  const raf = [];
  const ctx = makeCtx();
  const canvas = { width: 1280, height: 720, style: {}, getContext: () => ctx };
  const document = {
    getElementById: () => canvas,
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
  };
  const window = {
    innerWidth: width, innerHeight: height, devicePixelRatio: dpr,
    addEventListener: (type, fn) => { (winListeners[type] ||= []).push(fn); },
    requestAnimationFrame: (fn) => { raf.push(fn); return raf.length; },
  };

  const names = [...LET_VARS, ...CONSTS, ...FUNCS];
  const accessors = names.map((n) => {
    const setter = CONSTS.includes(n) || FUNCS.includes(n) ? '' : `, set ${JSON.stringify(n)}(v){ ${n} = v; }`;
    return `get ${JSON.stringify(n)}(){ return ${n}; }${setter}`;
  }).join(',\n');
  const body = `${extractScript()}\n;return {${accessors}};`;
  const api = new Function('document', 'window', body)(document, window);
  if (!title) {
    api.startGame(players);
    // задержка после старта нужна только живой игре; тестам удобнее стрелять сразу
    api.players.forEach((p) => { p.cooldown = 0; });
  }

  let now = 0;
  const key = (type, k, code) => {
    const e = { key: k, code: code || '', prevented: false, preventDefault() { this.prevented = true; } };
    (listeners[type] || []).forEach((fn) => fn(e));
    return e;
  };

  return {
    g: api, ctx, canvas, raf, winListeners,
    down: (k, code) => key('keydown', k, code),
    up: (k, code) => key('keyup', k, code),
    /** Нажать/отпустить физическую клавишу; символ намеренно «чужой» (кириллица) —
     *  игра обязана ориентироваться на код, а не на символ. */
    press: (code) => key('keydown', 'ф', code),
    release: (code) => key('keyup', 'ф', code),
    /** Событие окна (blur и т. п.). */
    fireWindow(type) { (winListeners[type] || []).forEach((fn) => fn()); },
    /** Событие документа (visibilitychange и т. п.). */
    fireDocument(type) { (listeners[type] || []).forEach((fn) => fn({})); },
    document,
    /** Выполнить N кадров логики без отрисовки. */
    ticks(n = 1) { for (let i = 0; i < n; i++) api.logic(); },
    /** Один кадр браузера: время растёт ровно на dtMs (по умолчанию 1/60 с = один шаг логики). */
    frame(dtMs = api.STEP_MS) { now += dtMs; const fn = raf.shift(); fn(now); },
    /** Время последнего кадра (мс). */
    get now() { return now; },
    /** Тексты, нарисованные последним paint(). */
    texts() { return ctx.calls.filter((c) => c[0] === 'fillText').map((c) => c[1]); },
    clearCalls() { ctx.calls.length = 0; },
  };
}

module.exports = { loadGame, extractScript };
