# SPEC: Трекер подписок (техническая спецификация)

Основано на [PRD.md](PRD.md) v1.0.

## 1. Архитектура

```
┌──────────────────────────┐      HTTP/JSON      ┌───────────────────────────┐
│ Браузер: React 18 + Vite │ ──────────────────▶ │ Node 20+ / Express 4      │
│ react-router, CSS        │   /api/*            │ better-sqlite3            │
└──────────────────────────┘                     │ data/subscriptions.db     │
            ▲                                    └───────────────────────────┘
            └──── shared/ (валидация, расчёты, даты) — общий код ───┘
```

- **Режим разработки:** Vite (порт 5173) проксирует `/api` на Express (порт 3001).
- **Режим production:** `npm run build` собирает фронтенд в `dist/`, Express отдаёт статику и API на одном порту 3001.
- **shared/** — чистые ES-модули без зависимостей, используются и сервером, и клиентом. Это гарантирует одинаковую валидацию и расчёты (NFR-3).

### Структура репозитория

```
subscription-tracker/
├── PRD.md, SPEC.md, README.md
├── scripts/seed.js      демо-данные (npm run seed)
├── shared/
│   ├── constants.js     валюты, периоды, статусы, категории по умолчанию, курсы
│   ├── validation.js    validateSubscription(), validateSettings()
│   ├── money.js         toMonthly(), toYearly(), convert(), formatMoney()
│   └── dates.js         addPeriod(), nextChargeDate(), occurrencesInWindow(), daysBetween()
├── server/
│   ├── index.js         запуск
│   ├── app.js           createApp(db): маршруты, обработка ошибок
│   ├── db.js            openDb(path): схема, миграции, сиды настроек
│   ├── repo.js          SQL-запросы
│   └── stats.js         buildStats(), buildUpcoming()
├── client/
│   ├── index.html
│   └── src/  main.jsx, App.jsx, api.js, styles.css, components/, pages/
├── tests/               node:test — логика shared и интеграционные тесты API
└── data/                файл БД (создаётся автоматически, в .gitignore)
```

## 2. Модель данных (SQLite)

```sql
CREATE TABLE subscriptions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  category          TEXT    NOT NULL CHECK (length(category) BETWEEN 1 AND 50),
  amount_minor      INTEGER NOT NULL CHECK (amount_minor > 0),      -- сумма в копейках/центах
  currency          TEXT    NOT NULL,                               -- ISO 4217
  billing_period    TEXT    NOT NULL CHECK (billing_period IN ('weekly','monthly','yearly')),
  next_billing_date TEXT    NOT NULL,                               -- 'YYYY-MM-DD'
  status            TEXT    NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','paused','cancelled')),
  notes             TEXT    NOT NULL DEFAULT '',
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sub_status   ON subscriptions(status);
CREATE INDEX idx_sub_category ON subscriptions(category);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL            -- JSON
);
-- ключи: base_currency ("RUB"), rates ({"USD":1,"RUB":95,...})
```

- Деньги хранятся целыми числами в минимальных единицах, чтобы избежать ошибок float. В API передаются как число с 2 знаками (`amount: 9.99`).
- Включены `PRAGMA journal_mode = WAL` и `foreign_keys = ON`. Версия схемы хранится в `PRAGMA user_version`.

## 3. Бизнес-логика (shared)

### 3.1 Нормализация сумм (FR-8)
| Период | В месяц | В год |
|---|---|---|
| weekly | amount × 52 / 12 | amount × 52 |
| monthly | amount | amount × 12 |
| yearly | amount / 12 | amount |

### 3.2 Конвертация валют (FR-9)
`rates[X]` — сколько единиц X стоит 1 USD. `convert(amount, from, to) = amount / rates[from] * rates[to]`. Округление до 2 знаков только при выводе.

### 3.3 Даты (FR-10, FR-14)
- Все даты — строки `YYYY-MM-DD`, обрабатываются в UTC, чтобы часовой пояс не сдвигал день.
- `addPeriod(anchor, period, n)`: weekly = +7n дней; monthly = +n месяцев от якорной даты с ограничением последним днём месяца; yearly = +n лет (29.02 → 28.02).
- `nextChargeDate(anchor, period, today)`: минимальная `addPeriod(anchor, period, n)` при n ≥ 0, которая ≥ today.
- `occurrencesInWindow(anchor, period, from, to)`: все даты списаний в окне `[from, to]`.
- Срочность: `days = 0` → «today», `1` → «tomorrow», `≤ 3` → «soon», иначе «later».

### 3.4 Валидация (NFR-3)
`validateSubscription(input) → { value, errors }`, где `errors` — объект `{ поле: сообщение }` на русском.

| Поле | Правило |
|---|---|
| name | строка, trim, 1–100 |
| category | строка, trim, 1–50 |
| amount | число или строка с `.`/`,`; > 0; ≤ 10 000 000; ≤ 2 знаков после запятой |
| currency | из `CURRENCIES` |
| billingPeriod | `weekly` / `monthly` / `yearly` |
| nextBillingDate | `YYYY-MM-DD`, реально существующая дата, год 2000–2100 |
| status | `active` / `paused` / `cancelled`, по умолчанию `active` |
| notes | строка до 500, по умолчанию `''` |

`validateSettings`: `baseCurrency` из списка; `rates` — объект, для каждой валюты положительное число ≤ 1e9, `rates.USD` = 1.

## 4. REST API

Базовый путь `/api`. Формат JSON. Ошибки всегда `{ "error": "текст", "fields"?: { поле: сообщение } }`.

| Метод | Путь | Описание | Ответ |
|---|---|---|---|
| GET | `/subscriptions?status=&category=` | Список с фильтрами, сортировка по ближайшему списанию | `200 Subscription[]` |
| GET | `/subscriptions/:id` | Одна подписка | `200` / `404` |
| POST | `/subscriptions` | Создать | `201` / `400` |
| PUT | `/subscriptions/:id` | Полностью обновить | `200` / `400` / `404` |
| DELETE | `/subscriptions/:id` | Удалить | `204` / `404` |
| GET | `/categories` | Категории по умолчанию + используемые | `200 string[]` |
| GET | `/stats` | Итоги для дашборда | `200 Stats` |
| GET | `/upcoming?days=30` | Списания в окне (1–366 дней) | `200 Upcoming` |
| GET | `/settings` | Настройки | `200 Settings` |
| PUT | `/settings` | Обновить настройки | `200` / `400` |
| GET | `/health` | Проверка | `200 {ok:true}` |

```ts
type Subscription = {
  id: number; name: string; category: string;
  amount: number; currency: string;
  billingPeriod: 'weekly'|'monthly'|'yearly';
  nextBillingDate: string;        // как сохранено
  effectiveNextDate: string;      // расчётная ближайшая дата ≥ сегодня
  status: 'active'|'paused'|'cancelled';
  notes: string;
  monthlyInBase: number;          // нормализованная стоимость в основной валюте
  createdAt: string; updatedAt: string;
};
type Stats = {
  baseCurrency: string; monthlyTotal: number; yearlyTotal: number;
  counts: { total: number; active: number; paused: number; cancelled: number };
  byCategory: { category: string; monthly: number; share: number; count: number }[];
  upcoming: UpcomingItem[];      // 7 дней
  nextCharge: UpcomingItem | null;
};
type UpcomingItem = {
  subscriptionId: number; name: string; category: string;
  date: string; daysUntil: number; urgency: 'today'|'tomorrow'|'soon'|'later';
  amount: number; currency: string; amountInBase: number;
};
type Upcoming = { days: number; baseCurrency: string; total: number; items: UpcomingItem[] };
type Settings = { baseCurrency: string; rates: Record<string, number> };
```

Параметр `today` (для тестов) принимается в `/stats` и `/upcoming` как `?today=YYYY-MM-DD`; по умолчанию текущая дата сервера.

### Обработка ошибок на сервере
- `400` — ошибки валидации, некорректный JSON, неверный id или параметр запроса.
- `404` — подписка не найдена или неизвестный `/api/*` маршрут.
- `500` — непредвиденная ошибка; в ответ уходит общий текст, детали пишутся в консоль.
- Размер тела ограничен 100 КБ.

## 5. Фронтенд

### 5.1 Маршруты
| Путь | Экран |
|---|---|
| `/` | Дашборд: 4 карточки, распределение по категориям, ближайшие списания на 7 дней |
| `/subscriptions?status=&category=` | Список с фильтрами |
| `/subscriptions/new` | Форма добавления |
| `/subscriptions/:id/edit` | Форма редактирования + удаление |
| `/upcoming?days=30` | Ближайшие списания |
| `/settings` | Основная валюта и курсы |

### 5.2 Компоненты
- `Layout` — боковая панель (≥ 768 px) или нижняя панель навигации (< 768 px), шапка с кнопкой «Добавить».
- `Money`, `StatusBadge`, `UrgencyBadge`, `EmptyState`, `ErrorState` (с «Повторить»), `Loader`, `ConfirmDialog` (нативный `<dialog>`), `Toast`.
- `CategoryBars` — горизонтальные полосы с суммой и долей; цвета из фиксированной палитры, подписи текстом (не только цветом).
- `useApi(fn, deps)` — хук загрузки с состояниями `loading / error / data` и `reload()`.

### 5.3 Форма
- Валидация на клиенте той же функцией `validateSubscription`; ошибки показываются после первой попытки отправки или ухода с поля, у поля `aria-invalid` и `aria-describedby`.
- Ошибки сервера по полям (`fields`) отображаются у соответствующих полей; общая ошибка — баннером над формой.
- Кнопка отправки блокируется на время запроса. Валюта по умолчанию — основная.
- Категория: `<input list>` с подсказками из `/categories`.

### 5.4 Адаптивность
- Mobile-first CSS, точки перелома 768 px и 1100 px.
- На мобильных список подписок — карточки, на десктопе — таблица.
- Минимальная зона нажатия 44 px. Без горизонтального скролла от 360 px.
- Тёмная тема через `prefers-color-scheme`.

## 6. Тестирование

- `npm test` (встроенный `node:test`):
  - unit: нормализация, конвертация, даты (конец месяца, високосный год, прошедшие даты), валидация;
  - интеграция: CRUD, фильтры, 400/404, расчёт `/stats` и `/upcoming` на временной БД в памяти.
- Ручная проверка UI в Chromium (Playwright) на 1280 × 800 и 375 × 812: все экраны, пустые состояния, ошибки формы.

## 7. Запуск

```bash
npm install
npm run dev        # http://localhost:5173 (фронт) + API на :3001
# или
npm run build && npm start   # всё на http://localhost:3001
```

Переменные окружения: `PORT` (3001), `DB_PATH` (`./data/subscriptions.db`).
