# Линтинг: нет конфигурации, глобальное состояние, нарушения типичных правил

- **Важность:** low
- **Тип:** lint / maintainability
- **Статус:** open
- **Где:** [index.html](../../index.html)

## Состояние
- `node --check` по вынесенному скрипту — синтаксис OK.
- ESLint/Prettier в проекте нет (нет `package.json`, конфигураций); полноценный прогон линтера не выполнялся.

## Ожидаемые замечания (по ручному ревью)
- `no-prototype-builtins`: `currentKeys.hasOwnProperty(key)` (в `Player.update`, `printKeys`) → `Object.hasOwn` или `Object.keys`.
- `prefer-const`: `let levels` присваивается один раз после инициализации; `let controls`, `let playerColors` не переприсваиваются.
- `no-unused-vars`: параметр `weightMod`-дубликат, `Enemy.intersects(shape)`.
- `no-magic-numbers`: размеры 15/25/30/50, 90, 120, 15 кадров и т. п. — вынести в константы.
- `no-use-before-define`: `resize` объявлен после `addEventListener("resize", resize)` (работает из-за hoisting).
- Весь код — глобальные переменные в одном `<script>`; нет модулей.
- `<script>` расположен после `</body>` — невалидная разметка; нет `lang` у `<html>`, нет `<meta name="viewport">`.
- `Player.draw` опирается на `strokeStyle`, выставленный в `paint()` (скрытая зависимость).

## Решение
Добавить `package.json`, ESLint (flat config) и Prettier; исправить перечисленное; со временем разнести код по ES-модулям (границы секций уже есть).

## Обновление
Игра остаётся одним файлом (решение владельца), поэтому разбиение на ES-модули снято с плана. Внешние ресурсы (картинки, звуки) — только из `assets/`.
