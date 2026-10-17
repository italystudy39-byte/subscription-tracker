// Хранение данных в браузере (localStorage) для статической версии на GitHub Pages.
// Повторяет поведение серверного API, используя ту же логику из server/stats.js и shared/.
import { buildStats, buildUpcoming, decorate } from '../../server/stats.js';
import { validateSubscription, validateSettings } from '@shared/validation.js';
import { todayISO } from '@shared/dates.js';
import { round2 } from '@shared/money.js';
import { DEFAULT_RATES, DEFAULT_BASE_CURRENCY, DEFAULT_CATEGORIES, STATUS_CODES } from '@shared/constants.js';
import { ApiError } from './apiError.js';

const KEY = 'subscription-tracker:v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* повреждённые данные или недоступное хранилище */ }
  return { nextId: 1, subscriptions: [], settings: null };
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    throw new ApiError('Не удалось сохранить данные в браузере.', 500);
  }
}

function getSettings(state) {
  const s = state.settings ?? {};
  return {
    baseCurrency: s.baseCurrency ?? DEFAULT_BASE_CURRENCY,
    rates: { ...DEFAULT_RATES, ...(s.rates ?? {}) },
  };
}

const validOrThrow = ({ value, errors }) => {
  if (!value) throw new ApiError('Проверьте правильность заполнения полей', 400, errors);
  return value;
};

const findOrThrow = (state, id) => {
  const sub = state.subscriptions.find((s) => s.id === Number(id));
  if (!sub) throw new ApiError('Подписка не найдена', 404);
  return sub;
};

const toSub = (v) => ({ ...v, amount: round2(v.amount) });

const run = (fn) => Promise.resolve().then(fn);

export const localApi = {
  listSubscriptions: ({ status, category } = {}) => run(() => {
    if (status && !STATUS_CODES.includes(status)) throw new ApiError('Неизвестный статус', 400);
    const state = load();
    const settings = getSettings(state);
    const today = todayISO();
    const order = { active: 0, paused: 1, cancelled: 2 };
    return state.subscriptions
      .filter((s) => (!status || s.status === status) && (!category || s.category === category))
      .map((s) => decorate(s, settings, today))
      .sort((a, b) => order[a.status] - order[b.status]
        || a.effectiveNextDate.localeCompare(b.effectiveNextDate)
        || a.name.localeCompare(b.name, 'ru'));
  }),
  getSubscription: (id) => run(() => {
    const state = load();
    return decorate(findOrThrow(state, id), getSettings(state), todayISO());
  }),
  createSubscription: (data) => run(() => {
    const value = validOrThrow(validateSubscription(data));
    const state = load();
    const now = new Date().toISOString();
    const sub = { id: state.nextId++, ...toSub(value), createdAt: now, updatedAt: now };
    state.subscriptions.push(sub);
    save(state);
    return decorate(sub, getSettings(state), todayISO());
  }),
  updateSubscription: (id, data) => run(() => {
    const value = validOrThrow(validateSubscription(data));
    const state = load();
    const sub = findOrThrow(state, id);
    Object.assign(sub, toSub(value), { updatedAt: new Date().toISOString() });
    save(state);
    return decorate(sub, getSettings(state), todayISO());
  }),
  deleteSubscription: (id) => run(() => {
    const state = load();
    findOrThrow(state, id);
    state.subscriptions = state.subscriptions.filter((s) => s.id !== Number(id));
    save(state);
    return null;
  }),
  categories: () => run(() => {
    const used = [...new Set(load().subscriptions.map((s) => s.category))]
      .sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' }));
    return { all: [...new Set([...DEFAULT_CATEGORIES, ...used])], used };
  }),
  stats: () => run(() => {
    const state = load();
    return buildStats(state.subscriptions, getSettings(state), todayISO());
  }),
  upcoming: (days = 30) => run(() => {
    const d = Number(days);
    if (!Number.isInteger(d) || d < 1 || d > 366) {
      throw new ApiError('Параметр days должен быть целым числом от 1 до 366', 400);
    }
    const state = load();
    return buildUpcoming(state.subscriptions, getSettings(state), todayISO(), d);
  }),
  settings: () => run(() => getSettings(load())),
  saveSettings: (data) => run(() => {
    const value = validOrThrow(validateSettings(data));
    const state = load();
    state.settings = value;
    save(state);
    return getSettings(state);
  }),
};
