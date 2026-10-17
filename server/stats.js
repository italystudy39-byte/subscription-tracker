import { toMonthly, toYearly, convert, round2 } from '../shared/money.js';
import { nextChargeDate, occurrencesInWindow, daysBetween, urgencyOf, parseDate, formatISO } from '../shared/dates.js';

function safeConvert(amount, from, to, rates) {
  try { return convert(amount, from, to, rates); } catch { return 0; }
}

export function decorate(sub, settings, today) {
  const { baseCurrency, rates } = settings;
  return {
    ...sub,
    effectiveNextDate: nextChargeDate(sub.nextBillingDate, sub.billingPeriod, today),
    monthlyInBase: round2(safeConvert(toMonthly(sub.amount, sub.billingPeriod), sub.currency, baseCurrency, rates)),
  };
}

function addDays(iso, n) {
  return formatISO(new Date(parseDate(iso).getTime() + n * 86400000));
}

export function buildUpcoming(subs, settings, today, days) {
  const { baseCurrency, rates } = settings;
  const to = addDays(today, days - 1);
  const items = [];
  for (const s of subs) {
    if (s.status !== 'active') continue;
    for (const date of occurrencesInWindow(s.nextBillingDate, s.billingPeriod, today, to)) {
      const daysUntil = daysBetween(today, date);
      items.push({
        subscriptionId: s.id,
        name: s.name,
        category: s.category,
        billingPeriod: s.billingPeriod,
        date,
        daysUntil,
        urgency: urgencyOf(daysUntil),
        amount: s.amount,
        currency: s.currency,
        amountInBase: round2(safeConvert(s.amount, s.currency, baseCurrency, rates)),
      });
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'ru'));
  return {
    days,
    from: today,
    to,
    baseCurrency,
    total: round2(items.reduce((sum, i) => sum + i.amountInBase, 0)),
    items,
  };
}

export function buildStats(subs, settings, today) {
  const { baseCurrency, rates } = settings;
  const counts = { total: subs.length, active: 0, paused: 0, cancelled: 0 };
  let monthly = 0;
  let yearly = 0;
  const cats = new Map();

  for (const s of subs) {
    counts[s.status]++;
    if (s.status !== 'active') continue;
    const m = safeConvert(toMonthly(s.amount, s.billingPeriod), s.currency, baseCurrency, rates);
    const y = safeConvert(toYearly(s.amount, s.billingPeriod), s.currency, baseCurrency, rates);
    monthly += m;
    yearly += y;
    const c = cats.get(s.category) ?? { category: s.category, monthly: 0, count: 0 };
    c.monthly += m;
    c.count++;
    cats.set(s.category, c);
  }

  const byCategory = [...cats.values()]
    .map((c) => ({ ...c, monthly: round2(c.monthly), share: monthly ? round2((c.monthly / monthly) * 100) : 0 }))
    .sort((a, b) => b.monthly - a.monthly);

  const upcoming = buildUpcoming(subs, settings, today, 7);
  const allAhead = buildUpcoming(subs, settings, today, 366).items;

  return {
    baseCurrency,
    today,
    monthlyTotal: round2(monthly),
    yearlyTotal: round2(yearly),
    counts,
    byCategory,
    upcoming: upcoming.items,
    upcomingTotal: upcoming.total,
    nextCharge: allAhead[0] ?? null,
  };
}
