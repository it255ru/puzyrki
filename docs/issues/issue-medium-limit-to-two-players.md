# Ограничить игру двумя игроками

- **Важность:** medium
- **Тип:** requirement
- **Статус:** done (PR feat/input-by-code)
- **Где:** [index.html](../../index.html) — `controls.players`, `playerColors`, `hotJoin()`, `positionPlayers()`

## Требование
Одновременно играют не более 2 игроков на одном устройстве.

## Что изменить
- Оставить в `controls.players` и `playerColors` два набора; удалить игроков 3 и 4.
- `hotJoin()`: максимум 2 (сейчас 4); тест `hotJoin` и `gameplay.md` обновить.
- Раскладка клавиш для двоих — [decisions.md](../decisions.md), п. 9 (сейчас у игрока 1 одновременно WASD и стрелки).
- Проблема ghosting на клавиатуре в основном снимается.
- Обновить `docs/gameplay.md`, `docs/architecture.md`, тесты.
