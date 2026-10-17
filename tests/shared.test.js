import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMonthly, toYearly, convert, round2, formatMoney } from '../shared/money.js';
import { addPeriod, nextChargeDate, occurrencesInWindow, urgencyOf, parseDate } from '../shared/dates.js';
import { validateSubscription, validateSettings, parseAmount } from '../shared/validation.js';
import { DEFAULT_RATES } from '../shared/constants.js';

test('нормализация к месяцу и году', () => {
  assert.equal(round2(toMonthly(100, 'weekly')), 433.33);
  assert.equal(toMonthly(100, 'monthly'), 100);
  assert.equal(toMonthly(1200, 'yearly'), 100);
  assert.equal(toYearly(100, 'weekly'), 5200);
  assert.equal(toYearly(100, 'monthly'), 1200);
  assert.equal(toYearly(1200, 'yearly'), 1200);
});

test('конвертация валют через USD', () => {
  const rates = { USD: 1, RUB: 100, EUR: 0.5 };
  assert.equal(convert(10, 'USD', 'RUB', rates), 1000);
  assert.equal(convert(10, 'EUR', 'RUB', rates), 2000);
  assert.equal(convert(5, 'RUB', 'RUB', rates), 5);
  assert.throws(() => convert(1, 'XXX', 'RUB', rates));
});

test('formatMoney', () => {
  assert.equal(formatMoney(1500, 'UZS'), '1 500 сум');
  assert.equal(formatMoney(9.9, 'USD'), '9,90 $');
});

test('parseDate отбрасывает несуществующие даты', () => {
  assert.ok(parseDate('2024-02-29'));
  assert.equal(parseDate('2023-02-29'), null);
  assert.equal(parseDate('2024-13-01'), null);
  assert.equal(parseDate('01.02.2024'), null);
});

test('addPeriod: конец месяца и високосный год', () => {
  assert.equal(addPeriod('2026-01-31', 'monthly', 1), '2026-02-28');
  assert.equal(addPeriod('2026-01-31', 'monthly', 2), '2026-03-31');
  assert.equal(addPeriod('2024-02-29', 'yearly', 1), '2025-02-28');
  assert.equal(addPeriod('2024-02-29', 'yearly', 4), '2028-02-29');
  assert.equal(addPeriod('2026-12-28', 'weekly', 1), '2027-01-04');
  assert.equal(addPeriod('2026-11-15', 'monthly', 3), '2027-02-15');
});

test('nextChargeDate прокручивает прошедшие даты', () => {
  assert.equal(nextChargeDate('2026-10-20', 'monthly', '2026-10-16'), '2026-10-20');
  assert.equal(nextChargeDate('2026-10-16', 'monthly', '2026-10-16'), '2026-10-16');
  assert.equal(nextChargeDate('2026-01-31', 'monthly', '2026-10-16'), '2026-10-31');
  assert.equal(nextChargeDate('2026-10-01', 'weekly', '2026-10-16'), '2026-10-22');
  assert.equal(nextChargeDate('2020-03-01', 'yearly', '2026-10-16'), '2027-03-01');
});

test('occurrencesInWindow включает повторы в окне', () => {
  assert.deepEqual(occurrencesInWindow('2026-10-17', 'weekly', '2026-10-16', '2026-11-05'),
    ['2026-10-17', '2026-10-24', '2026-10-31']);
  assert.deepEqual(occurrencesInWindow('2026-01-31', 'monthly', '2026-10-16', '2026-12-31'),
    ['2026-10-31', '2026-11-30', '2026-12-31']);
  assert.deepEqual(occurrencesInWindow('2026-12-01', 'yearly', '2026-10-16', '2026-11-15'), []);
});

test('urgencyOf', () => {
  assert.equal(urgencyOf(0), 'today');
  assert.equal(urgencyOf(1), 'tomorrow');
  assert.equal(urgencyOf(3), 'soon');
  assert.equal(urgencyOf(4), 'later');
});

const good = {
  name: ' Netflix ', category: 'Видео и ТВ', amount: '9,99', currency: 'USD',
  billingPeriod: 'monthly', nextBillingDate: '2026-10-20',
};

test('validateSubscription: корректный ввод нормализуется', () => {
  const { value, errors } = validateSubscription(good);
  assert.deepEqual(errors, {});
  assert.deepEqual(value, { ...good, name: 'Netflix', amount: 9.99, status: 'active', notes: '' });
});

test('validateSubscription: ошибки по полям', () => {
  const { value, errors } = validateSubscription({
    name: '', category: 'x'.repeat(51), amount: '-5', currency: 'XYZ',
    billingPeriod: 'daily', nextBillingDate: '2026-02-30', status: 'gone',
  });
  assert.equal(value, null);
  assert.deepEqual(Object.keys(errors).sort(),
    ['amount', 'billingPeriod', 'category', 'currency', 'name', 'nextBillingDate', 'status']);
  assert.match(validateSubscription({ ...good, amount: '1.999' }).errors.amount, /2 знаков/);
  assert.match(validateSubscription({ ...good, amount: 0 }).errors.amount, /больше нуля/);
  assert.ok(validateSubscription(null).errors._);
});

test('parseAmount', () => {
  assert.equal(parseAmount('1 299,50'), 1299.5);
  assert.ok(Number.isNaN(parseAmount('12abc')));
  assert.ok(Number.isNaN(parseAmount('1e3')));
});

test('validateSettings', () => {
  assert.deepEqual(validateSettings({ baseCurrency: 'USD', rates: DEFAULT_RATES }).errors, {});
  const bad = validateSettings({ baseCurrency: 'USD', rates: { ...DEFAULT_RATES, UZS: -1 } });
  assert.equal(bad.value, null);
  assert.ok(bad.errors.rates.UZS);
});
