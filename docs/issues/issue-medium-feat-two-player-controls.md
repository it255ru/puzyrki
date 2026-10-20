# Раскладка клавиш для двух игроков и подключение второго

- **Важность:** medium
- **Тип:** feature
- **Статус:** done (PR feat/input-by-code + feat/title-screen-colors-labels)
- **Решение:** [decisions.md п. 9](../decisions.md) — вариант A

## Требование
- Игрок 1: A/D + пробел. Игрок 2: ←/→ + Enter (альтернативно — правый Ctrl). Всё по `e.code` (`KeyA`, `KeyD`, `Space`, `ArrowLeft`, `ArrowRight`, `Enter`, `ControlRight`) — работает на любой раскладке.
- Стрелки больше не дублируют управление игрока 1.
- Подключение второго игрока — нажатием его кнопки выстрела на стартовом экране (и в игре, если ещё не подключён). Клавиши `*`/`/` и Shift не используются.
- Пауза и рестарт тоже по `e.code` (`Escape`, `KeyP`, `Enter`/`KeyR`).
- Экран старта с подсказкой управления.

## Закрывает
[Раскладки](issue-high-keyboard-layout-dependent.md), [Shift-клавиши](issue-medium-shifted-keys-trigger-shoot.md), [залипание клавиш](issue-medium-stuck-keys.md) (вместе со сбросом на blur), часть [hot-join](issue-medium-hotjoin-issues.md) и [двух игроков](issue-medium-limit-to-two-players.md).

## Конфликт
Enter также перезапускает игру на экране конца: на GAME OVER/победе Enter — рестарт, в игре — выстрел игрока 2; не должно быть двойного срабатывания.

## Тесты
Игрок 1 и 2 управляются независимо по кодам; русская раскладка; Shift не стреляет; подключение выстрелом; Enter не стреляет на экране конца; сброс клавиш на blur.
