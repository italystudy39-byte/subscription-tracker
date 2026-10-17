import { parseDate } from '@shared/dates.js';
export { formatMoney } from '@shared/money.js';

const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const dateFmtYear = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const weekdayFmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' });

export function formatDate(iso, { withYear } = {}) {
  const d = parseDate(iso);
  if (!d) return iso;
  const sameYear = d.getUTCFullYear() === new Date().getFullYear();
  return (withYear || !sameYear ? dateFmtYear : dateFmt).format(d);
}

export function weekday(iso) {
  const d = parseDate(iso);
  return d ? weekdayFmt.format(d) : '';
}

export function plural(n, [one, few, many]) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

export function relativeDays(days) {
  if (days <= 0) return 'Сегодня';
  if (days === 1) return 'Завтра';
  return `Через ${days} ${plural(days, ['день', 'дня', 'дней'])}`;
}
