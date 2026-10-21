# План

Каждый шаг — отдельная короткая ветка от `main` → правка → `npm test` и проверка всех функций → PR → зелёный CI → squash в `main`. После шага обновлять [backlog.md](backlog.md), [changelog.md](changelog.md) и снимать `todo` с исправленных тестов. Решения: [decisions.md](decisions.md).

## Сделано
- Репозиторий, trunk-based, `index.html`, `assets/`, `CLAUDE.md`, CI, 60 тестов.
- Репозиторий публичный, Pages включён: https://it255ru.github.io/puzyrki/
- Решения по 13 вопросам приняты, заведены issue.

## Очередь

| Шаг | Что | Issue |
|-----|-----|-------|
| 1 ✅ | Первый уровень проходится дважды | [high](issues/issue-high-first-level-played-twice.md) |
| 2 ✅ | Уровни как данные + валидация (сброс шаров при перезапуске) | [high](issues/issue-high-level-state-not-reset.md), [F5, часть 1](issues/issue-medium-feat-level-data-and-campaign.md) |
| 3 ✅ | Управление двух игроков: `e.code`, подключение, сброс на blur, цвета и метки, максимум 2 игрока | [F6](issues/issue-medium-feat-two-player-controls.md), [раскладка](issues/issue-high-keyboard-layout-dependent.md), [Shift](issues/issue-medium-shifted-keys-trigger-shoot.md), [залипание](issues/issue-medium-stuck-keys.md), [2 игрока](issues/issue-medium-limit-to-two-players.md), [hot-join](issues/issue-medium-hotjoin-issues.md), [F9](issues/issue-low-feat-player-colors-and-labels.md) |
| 4 ✅ | Игровой цикл: фиксированный шаг + интерполяция, защита от исключений, рамка канваса | [частота кадров](issues/issue-medium-frame-rate-dependent.md), [цикл](issues/issue-medium-game-loop-crash-halts-game.md), [рамка](issues/issue-medium-canvas-border-overflow.md) |
| 5 ✅ | Физика: отскок без потерь, стены, деление, круговые столкновения | [F1, часть 1](issues/issue-medium-feat-hit-impulse-physics.md), [плавность](issues/issue-medium-animation-jitter.md), [окружности](issues/issue-medium-aabb-circle-collision.md), [размер 6](issues/issue-low-biggest-ball-exits-top.md) |
| 6 ✅ | Подбрасывание при попадании | [F1, часть 2](issues/issue-medium-feat-hit-impulse-physics.md) |
| 7 ✅ | Шипы, лопание о шипы, прилипающий гарпун | [F2](issues/issue-medium-feat-spike-ceiling-sticky-harpoon.md) |
| 8 ✅ | Раздельные жизни | [F4](issues/issue-medium-feat-per-player-lives.md) |
| 8а ✅ | **Новое управление**: стрелки + мышь (Pointer Lock), меню выбора способа и числа игроков | [F11](issues/issue-high-feat-new-controls-arrows-and-mouse.md), закрывает [баг рестарта Enter](issues/issue-medium-restart-with-enter-adds-second-player.md) |
| 9 ✅ | Очки, комбо, рекорд | [F3](issues/issue-medium-feat-scoring.md) |
| 10 ✅ | Кампания 10–15 уровней, обучающие уровни, баланс | [F5, часть 2](issues/issue-medium-feat-level-data-and-campaign.md), [цвета уровня 5](issues/issue-low-level5-color-low-contrast.md) |
| 11 ✅ | Playwright smoke-тест в CI | [F7](issues/issue-medium-feat-browser-smoke-test.md) |
| 11а | **Мобильная версия**: сенсорные кнопки ◀ ▶ и «огонь», один игрок, альбомная ориентация 16:9, поворот и жесты, кнопка паузы, мобильные e2e | [F12](issues/issue-medium-feat-mobile-touch-controls.md) |
| 12 | Звук | [F8](issues/issue-low-feat-sound.md) |
| 13 | Чистка: HUD, отладка, метаданные, мёртвый код, ESLint, лицензия/ассеты | [HUD](issues/issue-low-hud-overlaps-player.md), [debug](issues/issue-low-debug-speed-always-active.md), [метаданные](issues/issue-low-no-accessibility-meta.md), [мёртвый код](issues/issue-low-unused-controls-and-stubs.md), [линтинг](issues/issue-low-lint-and-structure.md), [F10](issues/issue-low-docs-license-and-assets-policy.md) |

## Порядок и зависимости
- 1 и 2 первыми: небольшие и убирают ложные падения в тестах уровней.
- 8а до 9: очки и подсказки опираются на меню и схему ввода.
- 3 до 8: раздельные жизни и подключение второго игрока опираются на новую схему ввода.
- 4 до 5–6: подбрасывание нельзя подбирать, пока шаг логики зависит от частоты кадров.
- 5 → 6 → 7: шипы и правила лопания считаются от новой физики.
- 10 (баланс) после 5–9; 11 (Playwright) можно раньше, лучше сразу после 4, чтобы страховать визуальные правки.
- 11а до 12: звуку нужен жест пользователя из меню (на телефоне — касание), поэтому сенсорное меню делается раньше.
- 12 независим, но запускает звук из жеста в меню (шаг 8а) и из касания (шаг 11а).
