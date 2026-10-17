// Все даты — строки 'YYYY-MM-DD', арифметика в UTC.
const RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDate(str) {
  const m = RE.exec(str ?? '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

export function formatISO(dt) {
  return dt.toISOString().slice(0, 10);
}

export function todayISO(now = new Date()) {
  // Локальная дата пользователя/сервера, а не UTC.
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function addMonthsClamped(dt, months) {
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + months;
  const ty = y + Math.floor(m / 12);
  const tm = ((m % 12) + 12) % 12;
  const d = Math.min(dt.getUTCDate(), daysInMonth(ty, tm));
  return new Date(Date.UTC(ty, tm, d));
}

export function addPeriod(anchorISO, period, n) {
  const a = parseDate(anchorISO);
  if (!a) throw new Error(`Некорректная дата: ${anchorISO}`);
  if (period === 'weekly') return formatISO(new Date(a.getTime() + n * 7 * 86400000));
  if (period === 'monthly') return formatISO(addMonthsClamped(a, n));
  if (period === 'yearly') return formatISO(addMonthsClamped(a, n * 12));
  throw new Error(`Неизвестная периодичность: ${period}`);
}

export function daysBetween(fromISO, toISO) {
  return Math.round((parseDate(toISO) - parseDate(fromISO)) / 86400000);
}

// Ближайшая дата списания >= today (якорная дата в базе не меняется).
export function nextChargeDate(anchorISO, period, todayStr) {
  if (anchorISO >= todayStr) return anchorISO;
  const gap = daysBetween(anchorISO, todayStr);
  const approx = { weekly: 7, monthly: 28, yearly: 365 }[period];
  let n = Math.max(0, Math.floor(gap / approx) - 1);
  let d = addPeriod(anchorISO, period, n);
  while (d < todayStr) d = addPeriod(anchorISO, period, ++n);
  return d;
}

// Все списания в окне [fromISO, toISO] включительно.
export function occurrencesInWindow(anchorISO, period, fromISO, toISO) {
  const first = nextChargeDate(anchorISO, period, fromISO);
  const out = [];
  if (first > toISO) return out;
  // Ищем номер n для first, чтобы дальше шагать от якоря без накопления сдвига.
  let n = 0;
  if (first !== anchorISO) {
    const gap = daysBetween(anchorISO, first);
    const approx = { weekly: 7, monthly: 28, yearly: 365 }[period];
    n = Math.max(0, Math.floor(gap / approx) - 1);
    while (addPeriod(anchorISO, period, n) < first) n++;
  }
  for (let d = addPeriod(anchorISO, period, n); d <= toISO; d = addPeriod(anchorISO, period, ++n)) {
    out.push(d);
    if (out.length > 400) break;
  }
  return out;
}

export function urgencyOf(daysUntil) {
  if (daysUntil <= 0) return 'today';
  if (daysUntil === 1) return 'tomorrow';
  if (daysUntil <= 3) return 'soon';
  return 'later';
}
