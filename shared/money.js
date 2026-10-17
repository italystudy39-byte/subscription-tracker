import { CURRENCIES } from './constants.js';

export function toMonthly(amount, period) {
  if (period === 'weekly') return (amount * 52) / 12;
  if (period === 'monthly') return amount;
  if (period === 'yearly') return amount / 12;
  throw new Error(`Неизвестная периодичность: ${period}`);
}

export function toYearly(amount, period) {
  if (period === 'weekly') return amount * 52;
  if (period === 'monthly') return amount * 12;
  if (period === 'yearly') return amount;
  throw new Error(`Неизвестная периодичность: ${period}`);
}

// rates[X] — сколько единиц X стоит 1 USD.
export function convert(amount, from, to, rates) {
  if (from === to) return amount;
  const rf = rates[from];
  const rt = rates[to];
  if (!(rf > 0) || !(rt > 0)) throw new Error(`Нет курса для ${!(rf > 0) ? from : to}`);
  return (amount / rf) * rt;
}

export function round2(x) {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

export function toMinor(amount) {
  return Math.round(amount * 100);
}

export function fromMinor(minor) {
  return minor / 100;
}

export function formatMoney(amount, currency) {
  const sym = CURRENCIES[currency]?.symbol ?? currency;
  const num = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: Number.isInteger(round2(amount)) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(round2(amount));
  return `${num} ${sym}`;
}
