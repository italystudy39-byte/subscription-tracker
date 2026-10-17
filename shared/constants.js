export const CURRENCIES = {
  UZS: { name: 'Узбекский сум', symbol: 'сум' },
  USD: { name: 'Доллар США', symbol: '$' },
};
export const CURRENCY_CODES = Object.keys(CURRENCIES);

// Сколько единиц валюты стоит 1 USD. Ориентировочные значения, редактируются в настройках.
export const DEFAULT_RATES = { USD: 1, UZS: 12500 };
export const DEFAULT_BASE_CURRENCY = 'UZS';

export const PERIODS = {
  weekly: { label: 'Еженедельно', short: 'нед.' },
  monthly: { label: 'Ежемесячно', short: 'мес.' },
  yearly: { label: 'Ежегодно', short: 'год' },
};
export const PERIOD_CODES = Object.keys(PERIODS);

export const STATUSES = {
  active: { label: 'Активна' },
  paused: { label: 'Приостановлена' },
  cancelled: { label: 'Отменена' },
};
export const STATUS_CODES = Object.keys(STATUSES);

export const DEFAULT_CATEGORIES = [
  'Видео и ТВ', 'Музыка', 'Софт и сервисы', 'Облако', 'Игры',
  'Связь и интернет', 'Образование', 'Здоровье и спорт', 'Новости и чтение', 'Другое',
];

export const LIMITS = {
  name: 100, category: 50, notes: 500, maxAmount: 1_000_000_000, maxRate: 1e9,
};
