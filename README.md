# Boosty IT Каталог

Открытый каталог русскоязычных IT-каналов с платной подпиской на Boosty. Здесь можно найти и сравнить авторов об ИИ, программировании, архитектуре, системном администрировании, DevOps, self-hosting, информационной безопасности, данных, QA, мобильной разработке, gamedev, 1С и IT-карьере.

[![Звёзды GitHub](https://img.shields.io/github/stars/BelyaevAD/boosty-it-catalog?style=social)](https://github.com/BelyaevAD/boosty-it-catalog)
[![Проверка](https://github.com/BelyaevAD/boosty-it-catalog/actions/workflows/ci.yml/badge.svg)](https://github.com/BelyaevAD/boosty-it-catalog/actions/workflows/ci.yml)
[![Публикация](https://github.com/BelyaevAD/boosty-it-catalog/actions/workflows/pages.yml/badge.svg)](https://github.com/BelyaevAD/boosty-it-catalog/actions/workflows/pages.yml)
[![Лицензия: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**[Открыть каталог](https://belyaevad.github.io/boosty-it-catalog/)** ·
[Предложить канал](https://github.com/BelyaevAD/boosty-it-catalog/issues/new?template=new-channel.yml) ·
[Сообщить об ошибке](https://github.com/BelyaevAD/boosty-it-catalog/issues/new?template=correction.yml)

> ⭐ Каталог полезен? [Поставьте звезду репозиторию](https://github.com/BelyaevAD/boosty-it-catalog) — так проект проще сохранить и найти снова.

## Как выглядит каталог

[![Табличный вид каталога с фильтрами, ценами и количеством подписчиков](docs/screenshots/catalog-table.png)](https://belyaevad.github.io/boosty-it-catalog/#catalog)

Таблица помогает быстро сравнивать каналы, а карточный режим — спокойно просматривать подборку. Нажмите на изображение, чтобы открыть каталог.

<details>
<summary><strong>Карточный вид и расширенное описание</strong></summary>

### Карточки

[![Карточный вид каталога русскоязычных IT-каналов на Boosty](docs/screenshots/catalog-cards.png)](https://belyaevad.github.io/boosty-it-catalog/?view=cards#catalog)

### Расширенная карточка

[![Описание канала, показатели, последние материалы и уровни подписки в модальном окне](docs/screenshots/catalog-modal.png)](https://belyaevad.github.io/boosty-it-catalog/?view=cards#catalog)

</details>

## Что можно делать на сайте

- искать по названию, теме и технологиям;
- фильтровать по теме, активности, цене и росту аудитории, учитывая дополнительные темы каждого канала;
- сортировать по свежести, числу подписчиков, цене и названию;
- переключаться между компактной таблицей и карточками;
- открывать описание, последние материалы и уровни подписки в модальном окне;
- переходить на страницу автора в Boosty прямо из каталога;
- пользоваться сайтом с компьютера, планшета или телефона.

## Данные и обновления

Каталог обновляется автоматически каждую пятницу вечером по московскому времени. На сайте используются только сведения с публичных страниц: название, описание, тематика, доступные уровни, показатели аудитории и активность.

- [`data/channels.json`](data/channels.json) — проверенные каналы, опубликованные на сайте;
- [`data/raw/boosty-candidates.json`](data/raw/boosty-candidates.json) — полный необработанный список найденных кандидатов.

Публичные описания очищаются от явных e-mail, телефонных и платёжных номеров, мессенджер-ссылок и прямых контактных инструкций. Имена авторов и названия брендов сохраняются. Поисковые запросы, служебные ссылки и внутренняя методика исследования не публикуются.

Техническое устройство обновления, структура данных, ручной запуск и локальная сборка описаны отдельно в [документации для сопровождающих](docs/MAINTENANCE.md).

## Как добавить или исправить канал

Создайте issue по готовому шаблону:

- [предложить канал](https://github.com/BelyaevAD/boosty-it-catalog/issues/new?template=new-channel.yml);
- [исправить данные](https://github.com/BelyaevAD/boosty-it-catalog/issues/new?template=correction.yml);
- [предложить улучшение сайта](https://github.com/BelyaevAD/boosty-it-catalog/issues/new?template=feature-request.yml).

Правила участия и проверки изменений находятся в [CONTRIBUTING.md](CONTRIBUTING.md).

## Ограничения

- каталог широкий, но не гарантирует математически полный охват Boosty;
- публичный счётчик подписчиков не обязательно равен числу платящих подписчиков;
- цены, состав уровней и доступность материалов могут измениться между проверками;
- каталог не оценивает качество материалов и не является рекламной рекомендацией;
- проект не связан с Boosty и не получает комиссию от подписок.

## Лицензии и безопасность

Код распространяется по [MIT License](LICENSE). Условия повторного использования набора данных описаны в [DATA_LICENSE.md](DATA_LICENSE.md), правила ответственного сообщения об уязвимостях — в [SECURITY.md](SECURITY.md), а сторонние компоненты — в [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
