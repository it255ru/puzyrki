'use strict';
// Запускает скрипт из index.html в Node с заглушками DOM/Canvas.
// Игра остаётся одним файлом; тесты получают доступ к её внутренностям
// через accessor-объект, собранный внутри той же области видимости.

const fs = require('node:fs');
const path = require('node:path');

const HTML = path.join(__dirname, '..', 'index.html');

const LET_VARS = [
  'time', 'gameSpeed', 'level', 'debug', 'debugHeld', 'levelCountdown',
  'currentKeys', 'harpoons', 'pause', 'pauseHeld', 'mouse', 'viewScale', 'pausedByLockLoss', 'lockError', 'lockPendingUntil', 'menu', 'highScore', 'burstCount', 'recordAtStart', 'recordBeaten', 'restartHeld', 'lastTimestamp', 'accumulator', 'renderAlpha', 'fatalError', 'gameState',
  'playerColors', 'currentLevel', 'players', 'levels', 'currentSpikes', 'titleBalls', 'prevKeys', 'introTimer',
];
const CONSTS = ['c', 'weight', 'sizes', 'MAX_LIVES', 'MAX_PLAYERS', 'controls', 'MOUSE_SENSITIVITY', 'MOUSE_MAX_STEP', 'LOCK_WAIT_FRAMES', 'MENU_TOP', 'MENU_ITEM_H', 'MENU_ITEM_W', 'STEP_MS', 'MAX_FRAME_MS', 'CANVAS_BORDER', 'INITIAL_DY', 'HIT_RISE', 'INVULNERABLE_FRAMES', 'HUD_PLAYER_WIDTH', 'SPIKE_MARGIN', 'MAX_HINT_LENGTH', 'INTRO_FRAMES', 'INTRO_HINT_FRAMES', 'PLAYER_ZONE', 'HUD_SCORE_WIDTH', 'HUD_TOP_Y', 'BUILD', 'HIT_POINTS', 'COMBO_MAX', 'SPIKE_BONUS', 'STORAGE_KEY', 'MAX_SCORE', 'SPIKE_HEIGHT', 'SPIKE_WIDTH', 'STICK_FRAMES', 'HARPOON_TIP'];
const FUNCS = [
  'Shape', 'Harpoon', 'Enemy', 'Circle', 'Player', 'readInput', 'keyId', 'releaseAllKeys', 'hitImpulse', 'maxRiseSpeed', 'shootHint', 'wrapText', 'drawIntro', 'buildLabel', 'drawBuildLabel', 'subtreeValue', 'comboMultiplier', 'totalScore', 'loadHighScore', 'saveHighScore', 'addScore', 'awardHit', 'resultLines', 'burstAtSpikes', 'drawSpikes', 'checkHit', 'split', 'paused',
  'positionPlayers', 'startGame', 'updateTitle', 'drawTitle', 'loadLevel', 'onPlayerHit', 'restart', 'logic', 'paint', 'drawHUD',
  'validateLevel', 'createBalls', 'drawOverlay', 'debugSpeed', 'debugToggle', 'mouseLocked', 'lockSupported', 'mousePlayer', 'requestMouseLock', 'menuItems', 'menuMove', 'menuBack',
  'menuConfirm', 'menuKey', 'canvasPoint', 'menuItemAt', 'savePrevAll', 'tick', 'advance',
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

/** title: true — остаться на титульном экране; иначе сразу начать игру:
 *  players: 1 (клавиатура) или 2 (клавиатура + мышь), либо controls: ['mouse'] и т. п.
 *  pointerLock: false — браузер без Pointer Lock. */
function loadGame({ width = 1280, height = 720, dpr = 1, title = false, players = 1, controls = null, pointerLock = true, storage = new Map(), build = null } = {}) {
  const listeners = {};
  const winListeners = {};
  const raf = [];
  const ctx = makeCtx();
  const lockRequests = [];
  const canvas = {
    width: 1280, height: 720, style: {}, getContext: () => ctx,
    getBoundingClientRect() {
      const w = parseInt(this.style.width, 10) + 10;
      const h = parseInt(this.style.height, 10) + 10;
      return { left: 0, top: 0, width: w, height: h };
    },
  };
  if (pointerLock) canvas.requestPointerLock = () => { lockRequests.push(true); };
  const document = {
    getElementById: () => canvas,
    pointerLockElement: null,
    hidden: false,
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
  };
  const window = {
    innerWidth: width, innerHeight: height, devicePixelRatio: dpr,
    get localStorage() {
      if (storage === 'throws') throw new Error('SecurityError');
      if (storage === 'broken') return { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
      if (storage === null) return undefined;
      return { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => { storage.set(k, String(v)); } };
    },
    addEventListener: (type, fn) => { (winListeners[type] ||= []).push(fn); },
    requestAnimationFrame: (fn) => { raf.push(fn); return raf.length; },
  };

  const names = [...LET_VARS, ...CONSTS, ...FUNCS];
  const accessors = names.map((n) => {
    const setter = CONSTS.includes(n) || FUNCS.includes(n) ? '' : `, set ${JSON.stringify(n)}(v){ ${n} = v; }`;
    return `get ${JSON.stringify(n)}(){ return ${n}; }${setter}`;
  }).join(',\n');
  const script = build === null ? extractScript() : extractScript().replace('"__BUILD__"', JSON.stringify(build));
  const body = `${script}\n;return {${accessors}};`;
  const api = new Function('document', 'window', body)(document, window);
  let now = 0;
  const mouseEvent = (type, props = {}) => {
    const e = { button: 0, clientX: 0, clientY: 0, movementX: 0, prevented: false, preventDefault() { this.prevented = true; }, ...props };
    (listeners[type] || []).forEach((fn) => fn(e));
    return e;
  };
  /** Браузер выдал захват курсора. */
  function grantLock() {
    document.pointerLockElement = canvas;
    mouseEvent('pointerlockchange');
  }
  const key = (type, k, code, extra = {}) => {
    const e = { key: k, code: code || '', prevented: false, preventDefault() { this.prevented = true; }, ...extra };
    (listeners[type] || []).forEach((fn) => fn(e));
    return e;
  };

  const harness = {
    g: api, ctx, canvas, raf, winListeners,
    down: (k, code) => key('keydown', k, code),
    up: (k, code) => key('keyup', k, code),
    /** Нажать/отпустить физическую клавишу; символ намеренно «чужой» (кириллица) —
     *  игра обязана ориентироваться на код, а не на символ. */
    press: (code) => key('keydown', 'ф', code),
    release: (code) => key('keyup', 'ф', code),
    /** Автоповтор удерживаемой клавиши (event.repeat). */
    repeat: (code) => key('keydown', 'ф', code, { repeat: true }),
    /** Событие окна (blur и т. п.). */
    fireWindow(type) { (winListeners[type] || []).forEach((fn) => fn()); },
    /** Событие документа (visibilitychange и т. п.). */
    fireDocument(type) { (listeners[type] || []).forEach((fn) => fn({})); },
    document, lockRequests,
    mouseDown: (props) => mouseEvent('mousedown', props),
    mouseUp: (props) => mouseEvent('mouseup', props),
    /** Движение мыши на dx пикселей (movementX) или перемещение курсора в точку (clientX/Y). */
    mouseMove: (dx = 0, props = {}) => mouseEvent('mousemove', { movementX: dx, ...props }),
    contextMenu: () => mouseEvent('contextmenu'),
    grantLock,
    /** Захват потерян (Esc, Alt-Tab). */
    loseLock() { document.pointerLockElement = null; mouseEvent('pointerlockchange'); },
    lockFailed() { mouseEvent('pointerlockerror'); },
    /** Курсор в логических координатах поля: перевод в clientX/Y с учётом масштаба и рамки. */
    at(x, y) {
      const w = parseInt(canvas.style.width, 10);
      const hh = parseInt(canvas.style.height, 10);
      return { clientX: 5 + x * w / 1280, clientY: 5 + y * hh / 720 };
    },
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

  if (!title) {
    api.startGame(controls ? { controls } : players);
    if (api.players.some((p) => p.control === 'mouse')) grantLock();
    // задержка после старта нужна только живой игре; тестам удобнее стрелять сразу
    api.players.forEach((p) => { p.cooldown = 0; });
  }

  return harness;
}

module.exports = { loadGame, extractScript };
