# Changelog

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/). Версий пока нет; все изменения в `Unreleased`.

## [Unreleased]

### Added
- 2026-10-20: каталог `docs/` — README, gameplay, architecture, roadmap.
- 2026-10-20: ревью кода; заведены 15 issue в `docs/issues/`, [backlog.md](backlog.md), [plan.md](plan.md).
- 2026-10-20: в бэклог добавлена идея «подбрасывание шара при попадании + потолок с шипами».
- 2026-10-20: заведён issue про дёрганую анимацию (medium), добавлен в backlog и plan.
- 2026-10-20: репозиторий (trunk-based, `main`), `package.json`, `CLAUDE.md`, корневой `README.md`, каталог `assets/`.
- 2026-10-20: автотесты (`npm test`, 60 тестов) и харнесс; GitHub Actions `ci.yml` и ручной `pages.yml`.
- 2026-10-20: [decisions.md](decisions.md) — варианты решений по открытым вопросам.
- 2026-10-20: новые issue: первый уровень проходится дважды (high), шар размера 6 вылетает за экран, ограничение до двух игроков, автотесты и CI.
- 2026-10-20: приняты решения по 13 вопросам ([decisions.md](decisions.md)); заведены issue F1–F10 (физика, шипы, очки, жизни, уровни, управление, звук, цвета, Playwright, лицензия).
- 2026-10-20: репозиторий стал публичным, GitHub Pages включён (деплой через `pages.yml`).

### Changed
- 2026-10-20: `pages.yml` запускается при каждом push в `main` после тестов.
- 2026-10-20: `game.html` переименован в `index.html` (для GitHub Pages), название «Пузырьки», `<html lang="ru">`.
- 2026-10-20: исправлены неточности в документации (поддержка раскладок, направление шаров на уровне 2) — см. [issues/](issues/).

### Fixed
- 2026-10-20: первый уровень больше не проходится дважды: `levelCountdown` стартует с `-1` и сбрасывается так же в `restart()` ([issue](issues/issue-high-first-level-played-twice.md)). Тестов 61 (52 проходят, 9 todo).
