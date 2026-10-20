# Архитектура

Код в [../index.html](../index.html) разбит комментариями на секции, повторяющие бывшие модули: `vars.js`, `classes.js`, `levels.js`, `index.js`, `listeners.js`. Это один глобальный скрипт без модулей.

## Уровни

`levels` — массив описаний `{ balls: [{ size, x, y, dx, color? }] }`. `validateLevel` проверяет их при загрузке скрипта, `createBalls` создаёт `Circle`, `loadLevel(n)` вызывает её при каждой загрузке — поэтому изменение шаров в игре не влияет на данные.

## Игровой цикл

`step()` вызывается через `requestAnimationFrame` (привязка к частоте монитора; время измеряется в кадрах, не в секундах):

1. Если `gameState` — `gameover`/`win`: ждать Enter/R → `restart()`. Иначе, если не на паузе → `logic()`.
2. `paint()` — отрисовка каждый кадр (оверлеи тоже, поэтому не пропадают).
3. `debugSpeed()`, `debugToggle()`, `hotJoin()`.
4. `time++`.

### `logic()`
1. Уменьшить `invulnerableTimer`.
2. Если шаров нет — машина перехода между уровнями через `levelCountdown` (>0 отсчёт, 0 → загрузить уровень, <0 → следующий уровень/победа).
3. Обновить шары.
4. Обновить игроков (ввод, движение, стрельба); проверить столкновение с шарами → `onPlayerHit()`.
5. Обновить гарпуны, проверить попадания, удалить отработавшие и вернуть выстрел владельцу.

## Состояние (глобальное)

| Переменная | Назначение |
|------------|------------|
| `gameState` | `"playing"` \| `"gameover"` \| `"win"` |
| `level`, `levels`, `currentLevel` | номер, определения уровней, живые шары |
| `players`, `harpoons` | активные игроки и гарпуны |
| `lives`, `invulnerableTimer` | жизни и неуязвимость (общие) |
| `currentKeys` | карта нажатых клавиш (имя в нижнем регистре → bool) |
| `gameSpeed` | множитель скорости, передаётся в `update(speed)` |
| `pause`, `debug` | флаги; `*Held` — защита от повторного срабатывания при удержании |

## Классы

```
Shape(position, color)          x, y, color
├─ Harpoon                      h (длина), hits, owner, modifiers{speed, maxHits}
├─ Enemy(size, position, color)
│  └─ Circle                    dx, dy, r, bs, weightMod (из sizes[size])
└─ Player                       number, cooldown, shots, modifiers{speed, maxShots, cooldown}
```

Общий «неформальный интерфейс»: `update(speed)`, `draw(ctx)`, `bounds()` → `{x1,y1,x2,y2}`; у врагов ещё `intersects(bound)`.

## Столкновения

`checkHit(attackers, targets, maxHits)` — AABB-проверка `target.intersects(attacker.bounds())`. Если у атакующего `popping === true` (гарпун), цели помечаются на `split()`. Индексы удаляются от большего к меньшему, чтобы `splice` не сбивал порядок. Для игрока `popping` не задан, поэтому шар не разбивается.

Шар проверяется своим bounding box (квадрат), а не окружностью — на углах возможны «фантомные» попадания.

## Ввод

`keydown`/`keyup` пишут в `currentKeys` и `e.key`, и `e.code`, но `controls.players[number]` и служебные клавиши сопоставляются только по `e.key` — поэтому на нелатинских раскладках управление не работает (см. [issue](issues/issue-high-keyboard-layout-dependent.md)). Ключи `e.code` используются лишь для Space и Shift.

## Отрисовка

Canvas 1280×720 логических единиц; `resize()` задаёт `setTransform` с учётом `devicePixelRatio`. HUD (уровень, жизни) и оверлеи рисуются в `paint()`.
