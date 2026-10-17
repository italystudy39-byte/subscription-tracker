import { CURRENCY_CODES, PERIOD_CODES, STATUS_CODES, LIMITS } from './constants.js';
import { parseDate } from './dates.js';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function str(v) {
  return typeof v === 'string' ? v.trim() : v == null ? '' : null;
}

export function parseAmount(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
  if (typeof raw !== 'string') return NaN;
  const s = raw.replace(/[\s ]/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

export function validateSubscription(input) {
  const errors = {};
  const value = {};
  if (!isObj(input)) return { value: null, errors: { _: 'Ожидается объект подписки' } };

  const name = str(input.name);
  if (name === null) errors.name = 'Название должно быть текстом';
  else if (!name) errors.name = 'Укажите название сервиса';
  else if (name.length > LIMITS.name) errors.name = `Не длиннее ${LIMITS.name} символов`;
  else value.name = name;

  const category = str(input.category);
  if (category === null) errors.category = 'Категория должна быть текстом';
  else if (!category) errors.category = 'Укажите категорию';
  else if (category.length > LIMITS.category) errors.category = `Не длиннее ${LIMITS.category} символов`;
  else value.category = category;

  const rawAmount = input.amount;
  if (rawAmount === '' || rawAmount == null) errors.amount = 'Укажите стоимость';
  else {
    const amount = parseAmount(rawAmount);
    if (Number.isNaN(amount)) errors.amount = 'Введите число, например 299 или 9,99';
    else if (amount <= 0) errors.amount = 'Стоимость должна быть больше нуля';
    else if (amount > LIMITS.maxAmount) errors.amount = 'Слишком большая сумма';
    else if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) errors.amount = 'Не больше 2 знаков после запятой';
    else value.amount = Math.round(amount * 100) / 100;
  }

  if (!CURRENCY_CODES.includes(input.currency)) errors.currency = 'Выберите валюту из списка';
  else value.currency = input.currency;

  if (!PERIOD_CODES.includes(input.billingPeriod)) errors.billingPeriod = 'Выберите периодичность';
  else value.billingPeriod = input.billingPeriod;

  const date = input.nextBillingDate;
  const parsed = typeof date === 'string' ? parseDate(date) : null;
  if (!date) errors.nextBillingDate = 'Укажите дату следующего списания';
  else if (!parsed) errors.nextBillingDate = 'Некорректная дата';
  else if (parsed.getUTCFullYear() < 2000 || parsed.getUTCFullYear() > 2100) errors.nextBillingDate = 'Дата должна быть между 2000 и 2100 годом';
  else value.nextBillingDate = date;

  const status = input.status ?? 'active';
  if (!STATUS_CODES.includes(status)) errors.status = 'Выберите статус';
  else value.status = status;

  const notes = str(input.notes);
  if (notes === null) errors.notes = 'Заметка должна быть текстом';
  else if (notes.length > LIMITS.notes) errors.notes = `Не длиннее ${LIMITS.notes} символов`;
  else value.notes = notes;

  return { value: Object.keys(errors).length ? null : value, errors };
}

export function validateSettings(input) {
  const errors = {};
  if (!isObj(input)) return { value: null, errors: { _: 'Ожидается объект настроек' } };
  const value = {};
  if (!CURRENCY_CODES.includes(input.baseCurrency)) errors.baseCurrency = 'Выберите валюту из списка';
  else value.baseCurrency = input.baseCurrency;

  if (!isObj(input.rates)) errors.rates = 'Укажите курсы валют';
  else {
    const rates = {};
    const rateErrors = {};
    for (const code of CURRENCY_CODES) {
      const r = code === 'USD' ? 1 : parseAmount(input.rates[code]);
      if (Number.isNaN(r) || r <= 0) rateErrors[code] = 'Положительное число';
      else if (r > LIMITS.maxRate) rateErrors[code] = 'Слишком большое значение';
      else rates[code] = r;
    }
    if (Object.keys(rateErrors).length) errors.rates = rateErrors;
    else value.rates = rates;
  }
  return { value: Object.keys(errors).length ? null : value, errors };
}
