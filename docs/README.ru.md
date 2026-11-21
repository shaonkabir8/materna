# Materna

<!-- i18n-nav:start -->
<p align="center">
  <a href="README.md">🇬🇧 English</a>
  <a href="README.es.md">🇪🇸 Español</a>
  <a href="README.pt.md">🇧🇷 Português</a>
  <a href="README.de.md">🇩🇪 Deutsch</a>
  <a href="README.cn.md">🇨🇳 简体中文</a>
  <strong>🇷🇺 Русский</strong>
  <a href="README.tr.md">🇹🇷 Türkçe</a>
  <a href="README.ja.md">🇯🇵 日本語</a>
</p>
<!-- i18n-nav:end -->

<p align="center">
  <a href="https://www.npmjs.com/package/materna"><img src="https://img.shields.io/npm/v/materna.svg?style=flat-square&color=blue" alt="npm version"></a>&nbsp;
  <a href="https://www.npmjs.com/package/materna"><img src="https://img.shields.io/npm/dm/materna.svg?style=flat-square&color=brightgreen" alt="npm downloads"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/materna.svg?style=flat-square&color=green" alt="license"></a>&nbsp;
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/materna.svg?style=flat-square&color=orange" alt="node version"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/actions"><img src="https://img.shields.io/github/actions/workflow/status/shaonkabir8/materna/ci.yml?branch=main&style=flat-square" alt="CI status"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/stargazers"><img src="https://img.shields.io/github/stars/shaonkabir8/materna.svg?style=flat-square&color=yellow" alt="GitHub stars"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/network/members"><img src="https://img.shields.io/github/forks/shaonkabir8/materna.svg?style=flat-square" alt="GitHub forks"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/issues"><img src="https://img.shields.io/github/issues/shaonkabir8/materna.svg?style=flat-square" alt="GitHub issues"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/commits/main"><img src="https://img.shields.io/github/last-commit/shaonkabir8/materna.svg?style=flat-square" alt="last commit"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome"></a>&nbsp;
  <a href="https://github.com/sponsors/shaonkabir8"><img src="https://img.shields.io/github/sponsors/shaonkabir8?label=Sponsor&logo=GitHub&style=flat-square&color=ff69b4" alt="Sponsor"></a>
</p>

> **Проверка совпадения локалей по поведению для Node.js и PostgreSQL.**  
> Хватит сравнивать номера версий. Начните сравнивать реальное поведение сортировки.

---

## Содержание

- [✨ Зачем нужен Materna?](#why-materna)
- [🚀 Ключевые возможности](#feature-highlights)
- [📋 Требования](#requirements)
- [📦 Установка](#install)
- [⚡ Быстрый старт](#quick-start)
- [📖 Справочник по API](#api-reference)
- [🧠 Заметки о дизайне](#design-notes)
- [⚠️ Ограничения и совместимость](#limitations-and-compatibility)
- [🛠 Разработка](#development)
- [💖 Поддержка и непрерывное сопровождение](#support-and-continuous-maintenance)
- [🤝 Участие в проекте](#contributing)
- [📄 Лицензия](#license)

---

<a id="why-materna"></a>
## ✨ Зачем нужен Materna?

**Ошибки, связанные с локалью, коварны.** Ваша база данных сортирует `"ä"` иначе, чем среда выполнения Node.js. Строки версий вам об этом не сообщат.

| Старый подход (метаданные версий) | Новый подход (свидетельства поведения) |
| :--- | :--- |
| Вы проверяете `process.versions.icu === '78.3'` и предполагаете совместимость. | Вы запускаете `probeNode()` и `probePostgres()`, а затем сравниваете **фактически наблюдаемый порядок**. |
| Обновление ICU или glibc незаметно ломает сортировку. | Materna снимает отпечаток *реального* результата сортировки с помощью SHA-256. |
| Вы узнаёте об этом в продакшене, когда `ORDER BY` даёт не тот результат. | Вы узнаёте об этом в своём наборе тестов — с точным `first_difference`. |
| «Мы используем PostgreSQL 16 и Node 22, значит всё должно быть в порядке». | «Мы доказали, что на одном и том же корпусе `de-DE` получается идентичный порядок и идентичная структура равенств». |

Materna рассматривает **версии как метаданные**, а **наблюдаемое поведение как свидетельство**. Несовпадение объявляется *только* тогда, когда два запуска на одном и том же объявленном зонде и корпусе дают разный наблюдаемый порядок.

---

<a id="feature-highlights"></a>
## 🚀 Ключевые возможности

| **Проверка без настройки** | **Совпадение базы данных и среды выполнения** | **Детерминированные HTML-отчёты** |
| :--- | :--- | :--- |
| `npx materna node` работает сразу. | Нативно проверяет `Intl.Collator` в Node.js и `ORDER BY` в PostgreSQL. | Создаёт HTML, пригодный для ревью и diff, без JavaScript. |
| **Уровни свидетельств E3/E1** | **Строгие коды выхода** | **Учёт структуры равенств** |
| Чётко разделяет «выполнено здесь» и «настроено в CI». | Удобно для CI (0=PASS, 1=DIFFERENCE, 2=INCONCLUSIVE, 3=ERROR). | Обнаруживает тонкие различия в группах равенства, а не только в порядке. |
| **Единственная зависимость времени выполнения** | **Без облачной управляющей панели** | **Неизменяемый корпус** |
| `pg` импортируется динамически; `import 'materna'` не загружает драйвер базы данных. | Полностью работает на вашей машине или в CI. Без SaaS. | Образцы хешируются и проверяются. Любая подмена отклоняется. |

---

<a id="requirements"></a>
## 📋 Требования

| Компонент | Требование |
| :--- | :--- |
| **Node.js** | `>=22` (в CI выполняется на 22, 24 и 26). |
| **PostgreSQL** | **Необязательно.** Нужен только если вы запускаете `materna postgres`. Локально проверено на PostgreSQL 16.15. |
| **Среда выполнения** | Node, Bun, Deno. |

---

<a id="install"></a>
## 📦 Установка

```bash
# As a dependency
npm install materna

# As a one-off CLI
npx materna node
```

---

<a id="quick-start"></a>
## ⚡ Быстрый старт

### 1. CLI (без кода)

```bash
# Probe Node.js runtime
npx materna node --json > node.json

# Probe PostgreSQL (DATABASE_URL is honored)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/localeparity' \
  npx materna postgres --json > pg.json

# Compare the two observations
npx materna compare --left node.json --right pg.json
```

### 2. API (программно)

```javascript
import { probeNode, probePostgres, compareObservations } from 'materna';

const left = probeNode({ locale: 'de-DE' });
const right = await probePostgres({ 
  locale: 'de-DE', 
  connectionString: process.env.DATABASE_URL 
});

const outcome = compareObservations(left, right);

if (outcome.status === 'DIFFERENCE') {
  console.error('Mismatch found at:', outcome.first_difference);
  process.exit(1);
}

if (outcome.status === 'INCONCLUSIVE') {
  throw new Error(outcome.reason);
}
```

### 3. HTML-отчёт

```bash
npx materna report --left node.json --right pg.json --out report.html
```

*Созданный отчёт не содержит JavaScript. Каждое значение экранируется. Идентичные входные данные дают побайтово идентичный HTML.*

---

<a id="api-reference"></a>
## 📖 Справочник по API

### `probeNode(options)`

Синхронно возвращает наблюдение над `Intl.Collator` в Node.js.

- `options.locale` (string): например, `'de-DE'`.
- `options.sensitivity` (string): `'base'`, `'accent'`, `'case'` или `'variant'`.
- `options.numeric` (boolean): числовая сортировка.
- `options.corpus` (array): собственные образцы (по умолчанию — неизменяемое ядро из 16 образцов).

### `probePostgres(options)`

Асинхронно проверяет `ORDER BY` в PostgreSQL.

- `options.connectionString`: URL PostgreSQL.
- `options.collation` (string): например, `'en-US-x-icu'`. Разрешается через параметризованный запрос; неизвестные имена вызывают ошибку (без молчаливого отката).
- Остальные параметры совпадают с `probeNode`.

### `compareObservations(left, right, [opts])`

Возвращает объект результата:

- `status`: `'PASS'`, `'DIFFERENCE'` или `'INCONCLUSIVE'`.
- `first_difference`: точный индекс и значения, где порядок расходится.
- `metadata_differences`: массив различий окружения (например, версия ICU), которые **не** приводят к сбою.

### Коды выхода

| Код | Статус | Значение |
| :--- | :--- | :--- |
| `0` | `PASS` | Отпечатки совпадают. |
| `1` | `DIFFERENCE` | Отпечатки различаются; выводится первое различие. |
| `2` | `INCONCLUSIVE` | Не хватает свидетельств, локаль не поддерживается или входные данные нечитаемы. |
| `3` | `ERROR` | Некорректный JSON, неверные аргументы, небезопасный идентификатор или сбой драйвера. |

---

<a id="design-notes"></a>
## 🧠 Заметки о дизайне

- **Отпечатки вместо догадок**: `result_hash` — это SHA-256 по каноническому JSON `{ order, ties }`. Равенства включены, потому что две среды могут совпадать в порядке и расходиться в том, *какие значения равны*.
- **Самопротиворечие отклоняется**: наблюдение, чей `order` не является перестановкой своего корпуса, либо чей объявленный хеш не совпадает, считается `INCONCLUSIVE` (или `ERROR`), но никогда — свидетельством.
- **Метаданные — не сбой**: если Node использует ICU 78, а PostgreSQL использует glibc, но оба дают одинаковый порядок и одинаковую структуру равенств, результат — `PASS`.
- **Инварианты отчёта**: `report.status` должен совпадать с `outcome.status`. `PASS` с `first_difference` отклоняется.

---

<a id="limitations-and-compatibility"></a>
## ⚠️ Ограничения и совместимость

### Матрица совместимости

| Поверхность | Проверено | Уровень свидетельства |
| :--- | :--- | :--- |
| **Node.js 22.23.5, Linux x86_64, ICU 78.3** | Полный набор, 98/98 | **E3** — выполнено здесь |
| **Node.js 24.22.3, Linux x86_64** | Полный набор, 98/98 | **E3** — выполнено здесь |
| **PostgreSQL 16.15, Linux x86_64** | Полный набор, включая 11 живых тестов, 98/98 | **E3** — выполнено здесь |
| **PostgreSQL 14, Linux x86_64** | Настроено в `ci.yml` | **E1** — прохождение никогда не наблюдалось |
| **macOS / Windows** | Не выполнялось | НЕ ПРОВЕРЕНО |
| **MySQL / SQLite / браузеры** | Не реализовано | — |

### Ограничения

- **Только два зонда**: Node.js и PostgreSQL. MySQL и SQLite не реализованы.
- **Целостность ≠ подлинность**: Materna проверяет согласованность, а не происхождение. Она не подписывает наблюдения.
- **Малый корпус**: 16 целевых образцов, а не исчерпывающее покрытие CLDR.
- **Сортировка по умолчанию**: PostgreSQL по умолчанию использует `C.UTF-8`, если не задан `PG_COLLATION`. В такой конфигурации `DIFFERENCE` относительно ICU в Node ожидаема.

---

<a id="development"></a>
## 🛠 Разработка

```bash
git clone https://github.com/shaonkabir8/materna.git
cd materna
npm install
npm test
```

**CI выполняется на:** Node `22`, `24`, `26` × PostgreSQL `14`, `16`. Итог TAP настроен так, чтобы падать, если какой-либо тест **пропущен** (`# skipped 0` или `ℹ skipped 0`). Зелёный конвейер означает, что действительно выполнилось всё.

---

<a id="support-and-continuous-maintenance"></a>
## 💖 Поддержка и непрерывное сопровождение

**Materna — это на 100 % независимый проект с открытым исходным кодом.** Чтобы пакет оставался надёжным и активно поддерживался круглосуточно, мы опираемся на поддержку сообщества.

Если Materna спасает вас от производственных ошибок, связанных с локалью, пожалуйста, поддержите её непрерывную разработку:

### 💰 Финансовая поддержка (финансирование и пожертвования)

Устойчивое финансирование позволяет мейнтейнеру уделять время круглосуточному сопровождению, быстрым исправлениям ошибок и расширению матрицы совместимости.

- **[Стать спонсором на GitHub](https://github.com/sponsors/shaonkabir8)** (регулярно или разово)
- **[Угостить кофе](https://buymeacoffee.com/shaonkabir8)** (быстрое пожертвование)

*Корпоративный спонсорский вклад очень приветствуется. Для корпоративной поддержки или индивидуальных SLA свяжитесь напрямую через GitHub.*

### 👨‍💻 Вклад в код

Мы всегда ищем увлечённых программистов, готовых участвовать! Будь то добавление новых зондов (например, MySQL/SQLite), расширение тестового корпуса, улучшение HTML-репортёра или исправление ошибок — вашим pull request мы будем очень рады.

- Посмотрите [открытые задачи](https://github.com/shaonkabir8/materna/issues) или создайте новую, чтобы обсудить идеи.
- Держите изменения небольшими, добавляйте поведенческий тест и **не заявляйте результат, который вы не наблюдали**.

---

<a id="contributing"></a>
## 🤝 Участие в проекте

Адаптеры для других сред выполнения (MySQL, SQLite), более крупный корпус и более богатые репортёры приветствуются. Держите изменения небольшими, добавляйте поведенческий тест и **не заявляйте результат, который вы не наблюдали**.

---

<a id="license"></a>
## 📄 Лицензия

MIT — см. [LICENSE](https://github.com/shaonkabir8/materna/blob/main/LICENSE).

Создано и поддерживается [Codazi](https://github.com/codazi) · Мейнтейнер: [shaonkabir8](https://github.com/shaonkabir8).
