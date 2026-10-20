# Backlog

Открытые вопросы с вариантами решений: [decisions.md](decisions.md).

Источник правды по задачам. Подробности — в [issues/](issues/). Порядок внутри уровня — рекомендуемый порядок выполнения. План по этапам: [plan.md](plan.md).

Статусы: `open` · `in progress` · `done` · `wontfix`.

## Дефекты

| # | Важность | Задача | Статус |
|---|----------|--------|--------|
| 1 | high | [Шары не сбрасываются при перезапуске уровня](issues/issue-high-level-state-not-reset.md) | done |
| 0a | high | [Первый уровень проходится дважды](issues/issue-high-first-level-played-twice.md) | done |
| 2 | high | [Управление зависит от раскладки (`e.key` вместо `e.code`)](issues/issue-high-keyboard-layout-dependent.md) | done |
| 3 | medium | [Shift-символы (`_ + *`) стреляют за игрока 1](issues/issue-medium-shifted-keys-trigger-shoot.md) | done |
| 4 | medium | [Залипание клавиш при потере фокуса](issues/issue-medium-stuck-keys.md) | done |
| 5 | medium | [Столкновения по квадрату, а не по окружности](issues/issue-medium-aabb-circle-collision.md) | done |
| 6 | medium | [Скорость зависит от частоты монитора](issues/issue-medium-frame-rate-dependent.md) | done |
| 6a | medium | [Дёрганая анимация шаров и персонажа](issues/issue-medium-animation-jitter.md) | done |
| 7 | medium | [Исключение останавливает игровой цикл](issues/issue-medium-game-loop-crash-halts-game.md) | done |
| 8 | medium | [Горячее подключение: наложение, пауза, game over](issues/issue-medium-hotjoin-issues.md) | done |
| 9 | medium | [Рамка канваса вызывает прокрутку](issues/issue-medium-canvas-border-overflow.md) | done |
| 9a | medium | [Ограничить игру двумя игроками](issues/issue-medium-limit-to-two-players.md) | done |
| 9b | medium | [Автотесты и CI](issues/issue-medium-no-automated-tests-and-ci.md) | in progress |
| 10 | low | [Debug-скорость всегда активна](issues/issue-low-debug-speed-always-active.md) | open |
| 11 | low | [HUD перекрывает игрока, смесь языков](issues/issue-low-hud-overlaps-player.md) | open |
| 12 | low | [Низкий контраст шаров 5-го уровня](issues/issue-low-level5-color-low-contrast.md) | open |
| 13 | low | [Мёртвый код и заглушки](issues/issue-low-unused-controls-and-stubs.md) | open |
| 14 | low | [Линтинг и структура](issues/issue-low-lint-and-structure.md) | open |
| 15a | low | [Шар размера 6 вылетает за верх](issues/issue-low-biggest-ball-exits-top.md) | done |
| 15 | low | [Семантика и метаданные страницы](issues/issue-low-no-accessibility-meta.md) | open |

## Принятые фичи (решения в [decisions.md](decisions.md))

| # | Важность | Задача | Статус |
|---|----------|--------|--------|
| F1 | medium | [Физика: сохранение энергии и подбрасывание](issues/issue-medium-feat-hit-impulse-physics.md) | done |
| F2 | medium | [Потолок с шипами и прилипающий гарпун](issues/issue-medium-feat-spike-ceiling-sticky-harpoon.md) | open |
| F3 | medium | [Очки, комбо, рекорд](issues/issue-medium-feat-scoring.md) | open |
| F4 | medium | [Раздельные жизни](issues/issue-medium-feat-per-player-lives.md) | open |
| F5 | medium | [Уровни как данные, кампания 10–15](issues/issue-medium-feat-level-data-and-campaign.md) | in progress |
| F6 | medium | [Клавиши двух игроков, подключение второго](issues/issue-medium-feat-two-player-controls.md) | done |
| F7 | medium | [Playwright smoke-тест в CI](issues/issue-medium-feat-browser-smoke-test.md) | open |
| F8 | low | [Звук](issues/issue-low-feat-sound.md) | open |
| F9 | low | [Цвета и метки игроков](issues/issue-low-feat-player-colors-and-labels.md) | done |
| F10 | low | [Лицензия и политика ассетов](issues/issue-low-docs-license-and-assets-policy.md) | open |

## Идеи (без решения)

- Бонусы: двойной выстрел (`maxShots`), скорость (`modifiers.speed`), щит, заморозка, пробивающий гарпун (`maxHits`).
- Платформы, потолок с шипами, твёрдые блоки.
- Подбрасывание шара при попадании (как в оригинале): гарпун не только делит шар, но и толкает его вверх (импульс `dy`). Серия точных попаданий поднимает шар к потолку с шипами, где он лопается целиком, не дробясь. Если шар разделился у самого потолка, обе половины натыкаются на шипы и лопаются. Требует: потолка с шипами (столкновение с верхней границей), импульса при `split()`, правила «у шипов — не делить, а уничтожать», подбора силы импульса и уровней под эту механику. Связано с [issue про окружности](issues/issue-medium-aabb-circle-collision.md) (точность попаданий критична).
- Частицы при лопании.
- Редактор уровней.
- Тач-управление и геймпад.
- Разбиение на ES-модули, тесты для `split` и `checkHit`.
