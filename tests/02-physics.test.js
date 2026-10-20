'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

test('шар всегда остаётся внутри боковых стен', () => {
  const t = loadGame();
  for (let size = 0; size < t.g.sizes.length; size++) {
    const b = new t.g.Circle(size, { x: 200, y: 200 }, 4, 'red');
    for (let i = 0; i < 3000; i++) {
      b.update(1);
      assert.ok(b.x >= b.r - 4 && b.x <= t.g.c.w - b.r + 4, `size ${size}, frame ${i}, x=${b.x}`);
    }
  }
});

const ALL_SIZES = [0, 1, 2, 3, 4, 5, 6];

test('пол: шар никогда не уходит под пол и отскакивает', () => {
  const t = loadGame();
  for (const size of ALL_SIZES) {
    const b = new t.g.Circle(size, { x: 640, y: 200 }, 0, 'red');
    let bounces = 0; let prevDy = b.dy;
    for (let i = 0; i < 3000; i++) {
      b.update(1);
      assert.ok(b.y <= t.g.c.h - b.r + 1e-9, `size ${size}: y=${b.y}`);
      if (prevDy > 0 && b.dy < 0) bounces++;
      prevDy = b.dy;
    }
    assert.ok(bounces >= 3, `размер ${size}: отскоков ${bounces}`);
  }
});

test('потолок: шар никогда не вылетает за верх экрана (все размеры, включая 6)', () => {
  const t = loadGame();
  for (const size of ALL_SIZES) {
    for (const dy of [t.g.INITIAL_DY, -25, -40]) {
      const b = new t.g.Circle(size, { x: 640, y: 300 }, 3, 'red');
      b.dy = dy;
      for (let i = 0; i < 4000; i++) {
        b.update(1);
        assert.ok(b.y - b.r >= -1e-9, `size ${size}, dy ${dy}: верх шара ${b.y - b.r}`);
      }
    }
  }
});

test('стены: шар всегда в пределах поля и меняет направление', () => {
  const t = loadGame();
  for (const size of ALL_SIZES) {
    const b = new t.g.Circle(size, { x: 200, y: 200 }, 7, 'red');
    let flips = 0; let prev = b.dx;
    for (let i = 0; i < 2000; i++) {
      b.update(1);
      assert.ok(b.x >= b.r && b.x <= t.g.c.w - b.r, `size ${size}: x=${b.x}`);
      if (Math.sign(b.dx) !== Math.sign(prev)) flips++;
      prev = b.dx;
      assert.equal(Math.abs(b.dx), 7);
    }
    assert.ok(flips >= 2);
  }
});

test('стены: в кадре касания шар не делает двойного шага', () => {
  const t = loadGame();
  const b = new t.g.Circle(2, { x: 1245, y: 200 }, 6, 'red'); // r=30: стена на x=1250
  const x0 = b.x;
  b.update(1);
  // дошёл до стены (1250) и вернулся: итог 1250 - (1251 - 1250) = 1249
  assert.equal(b.x, 1249);
  assert.ok(Math.abs(b.x - x0) <= 6);
  assert.equal(b.dx, -6);
});

test('непрерывность: между кадрами нет скачков позиции (нет «телепортов» у пола и стен)', () => {
  const t = loadGame();
  for (const size of ALL_SIZES) {
    const b = new t.g.Circle(size, { x: 300, y: 150 }, 5, 'red');
    let px = b.x; let py = b.y; let maxStep = 0;
    for (let i = 0; i < 3000; i++) {
      b.update(1);
      maxStep = Math.max(maxStep, Math.hypot(b.x - px, b.y - py));
      px = b.x; py = b.y;
    }
    // скорость не больше ~sqrt(2·g·H)+dx ≈ 20+5; запас на отражение
    assert.ok(maxStep < 35, `size ${size}: максимальный шаг ${maxStep}`);
  }
});

test('энергия сохраняется: высота прыжка не меняется за сотню отскоков', () => {
  const t = loadGame();
  for (const size of ALL_SIZES) {
    const b = new t.g.Circle(size, { x: 640, y: 120 }, 0, 'red');
    b.dy = 0;
    const apexes = []; let prevDy = 0;
    for (let i = 0; i < 20000; i++) {
      b.update(1);
      if (prevDy < 0 && b.dy >= 0) apexes.push(b.y); // верхняя точка
      prevDy = b.dy;
    }
    assert.ok(apexes.length >= 20, `размер ${size}: прыжков ${apexes.length}`);
    // первая верхняя точка — после первого отскока; сравниваем остальные с ней
    // шар падал со 120 → верхняя точка совпадает с исходной высотой, и так при каждом прыжке
    for (const a of apexes) {
      assert.ok(Math.abs(a - 120) < 0.5, `размер ${size}: верхняя точка ${a}, ожидалось 120`);
    }
  }
});

test('энергия сохраняется и при замедленной/ускоренной игре (gameSpeed)', () => {
  const t = loadGame();
  for (const speed of [0.5, 1, 2, 3]) {
    const b = new t.g.Circle(2, { x: 640, y: 120 }, 0, 'red');
    b.dy = 0;
    const apexes = []; let prevDy = 0;
    for (let i = 0; i < 30000 / speed; i++) {
      b.update(speed);
      if (prevDy < 0 && b.dy >= 0) apexes.push(b.y);
      prevDy = b.dy;
    }
    assert.ok(apexes.length >= 10, `speed ${speed}`);
    for (const a of apexes) assert.ok(Math.abs(a - 120) < 1, `speed ${speed}: ${a}`);
  }
});

test('падение и подъём симметричны по времени (±1 шаг)', () => {
  const t = loadGame();
  const b = new t.g.Circle(2, { x: 640, y: 150 }, 0, 'red');
  b.dy = 0;
  let fall = 0;
  while (b.dy >= 0) { b.update(1); fall++; if (fall > 5000) break; } // падение до отскока
  let rise = 0;
  while (b.dy < 0) { b.update(1); rise++; if (rise > 5000) break; }
  assert.ok(Math.abs(fall - rise) <= 2, `падение ${fall}, подъём ${rise}`);
});

test('скорость по x постоянна (нет сопротивления)', () => {
  const t = loadGame();
  const b = new t.g.Circle(3, { x: 300, y: 200 }, 4, 'red');
  for (let i = 0; i < 5000; i++) b.update(1);
  assert.equal(Math.abs(b.dx), 4);
});

test('большие шары (weightMod < 1) «плавают» медленнее: дольше в воздухе', () => {
  const t = loadGame();
  const airtime = (size) => {
    const b = new t.g.Circle(size, { x: 640, y: 200 }, 0, 'red');
    b.dy = 0;
    let n = 0;
    while (b.dy >= 0 && n < 9999) { b.update(1); n++; }
    return n;
  };
  assert.ok(airtime(6) > airtime(4));
});

test('gameSpeed масштабирует перемещение по x', () => {
  const t = loadGame();
  const a = new t.g.Circle(2, { x: 300, y: 200 }, 4, 'red');
  const b = new t.g.Circle(2, { x: 300, y: 200 }, 4, 'red');
  a.update(1);
  b.update(0.5);
  assert.equal(a.x - 300, 4);
  assert.equal(b.x - 300, 2);
});

// ===== Столкновения: круг и прямоугольник =====

test('intersects: пересечение и непересечение прямоугольников', () => {
  const t = loadGame();
  const b = new t.g.Circle(2, { x: 500, y: 300 }, 0, 'red'); // r=30
  assert.ok(b.intersects({ x1: 490, x2: 510, y1: 280, y2: 320 }));
  assert.ok(!b.intersects({ x1: 0, x2: 100, y1: 0, y2: 100 }));
});

test('intersects: угол квадрата вокруг шара — это промах (окружность, а не AABB)', () => {
  const t = loadGame();
  const b = new t.g.Circle(2, { x: 500, y: 300 }, 0, 'red');
  assert.ok(!b.intersects({ x1: 528, x2: 529, y1: 328, y2: 329 }));
  assert.ok(!b.intersects({ x1: 471, x2: 472, y1: 271, y2: 272 }));
});

test('intersects: касание ровно на радиусе засчитывается, на чуть дальше — нет', () => {
  const t = loadGame();
  const b = new t.g.Circle(2, { x: 500, y: 300 }, 0, 'red'); // r=30
  assert.ok(b.intersects({ x1: 530, x2: 540, y1: 290, y2: 310 }));
  assert.ok(!b.intersects({ x1: 530.01, x2: 540, y1: 290, y2: 310 }));
  assert.ok(b.intersects({ x1: 490, x2: 510, y1: 330, y2: 340 }));
  assert.ok(!b.intersects({ x1: 490, x2: 510, y1: 330.01, y2: 340 }));
});

test('intersects: прямоугольник внутри круга, круг внутри прямоугольника, центр на ребре', () => {
  const t = loadGame();
  const b = new t.g.Circle(2, { x: 500, y: 300 }, 0, 'red');
  assert.ok(b.intersects({ x1: 495, x2: 505, y1: 295, y2: 305 }));
  assert.ok(b.intersects({ x1: 0, x2: 1000, y1: 0, y2: 1000 }));
  assert.ok(b.intersects({ x1: 500, x2: 600, y1: 300, y2: 400 }));
});

test('диагональный подход: расстояние по гипотенузе, а не по осям', () => {
  const t = loadGame();
  const b = new t.g.Circle(2, { x: 500, y: 300 }, 0, 'red'); // r=30
  // по осям 21 и 21 (< 30), гипотенуза ≈ 29,7 → попадание
  assert.ok(b.intersects({ x1: 521, x2: 525, y1: 321, y2: 325 }));
  // по осям 22 и 22, гипотенуза ≈ 31,1 → промах
  assert.ok(!b.intersects({ x1: 522, x2: 525, y1: 322, y2: 325 }));
});

test('гарпун не задевает «воздух» в углу квадрата вокруг шара', () => {
  const t = loadGame();
  const target = [new t.g.Circle(2, { x: 500, y: 300 }, 0, 'red')];
  const h = new t.g.Harpoon({ x: 527, y: 720 }, null, 'green');
  h.h = 720 - 15 - 328; // острие: bounds().y1 = y - h - 15 = 328
  assert.equal(h.bounds().y1, 328);
  assert.equal(t.g.checkHit([h], target, 1), 0);
  assert.equal(target.length, 1);
});

test('игрок не погибает от шара, который только «задел» угол квадрата', () => {
  const t = loadGame();
  const p = new t.g.Player({ x: 500, y: 695 }, 0); // bounds x 485..515, y 670..720
  // центр шара по диагонали от верхнего угла игрока (515, 670)
  const far = new t.g.Circle(2, { x: 515 + 22, y: 670 - 22 }, 0, 'red'); // гипотенуза 31,1 > 30
  const near = new t.g.Circle(2, { x: 515 + 20, y: 670 - 20 }, 0, 'red'); // 28,3 < 30
  assert.equal(t.g.checkHit([p], [far], 1), 0);
  assert.equal(t.g.checkHit([p], [near], 1), 1);
});

test('случайные состояния: шар всегда конечен и внутри поля (200 шаров × 2000 шагов, разные gameSpeed)', () => {
  const t = loadGame();
  let seed = 12345; // детерминированный генератор
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let n = 0; n < 200; n++) {
    const size = Math.floor(rnd() * 7);
    const r = t.g.sizes[size].r;
    const b = new t.g.Circle(size, { x: r + rnd() * (1280 - 2 * r), y: r + rnd() * (720 - 2 * r) }, (rnd() - 0.5) * 20, 'red');
    b.dy = (rnd() - 0.5) * 60;
    const speed = [0.1, 0.5, 1, 2, 3][n % 5];
    for (let i = 0; i < 2000; i++) {
      b.update(speed);
      assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.dy), `шар ${n}`);
      assert.ok(b.x >= r && b.x <= 1280 - r && b.y >= r && b.y <= 720 - r, `шар ${n}: (${b.x}, ${b.y})`);
    }
  }
});
