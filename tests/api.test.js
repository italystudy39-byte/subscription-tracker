import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';

let server, base, db;

before(async () => {
  db = openDb(':memory:');
  server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => { server.close(); db.close(); });

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const sub = (o = {}) => ({
  name: 'Spotify', category: 'Музыка', amount: 10, currency: 'USD',
  billingPeriod: 'monthly', nextBillingDate: '2026-10-18', status: 'active', ...o,
});

test('CRUD и фильтры', async () => {
  let r = await call('GET', '/subscriptions');
  assert.deepEqual(r.body, []);

  r = await call('POST', '/subscriptions', sub());
  assert.equal(r.status, 201);
  const id = r.body.id;
  assert.equal(r.body.amount, 10);

  await call('POST', '/subscriptions', sub({ name: 'Кинопоиск', category: 'Видео и ТВ', amount: 399, currency: 'UZS', status: 'paused' }));

  r = await call('GET', '/subscriptions?status=paused');
  assert.deepEqual(r.body.map((s) => s.name), ['Кинопоиск']);
  r = await call('GET', '/subscriptions?category=' + encodeURIComponent('Музыка'));
  assert.deepEqual(r.body.map((s) => s.name), ['Spotify']);
  r = await call('GET', '/subscriptions?status=bogus');
  assert.equal(r.status, 400);

  r = await call('PUT', `/subscriptions/${id}`, sub({ amount: '11,50' }));
  assert.equal(r.status, 200);
  assert.equal(r.body.amount, 11.5);

  r = await call('GET', `/subscriptions/${id}`);
  assert.equal(r.body.amount, 11.5);

  r = await call('DELETE', `/subscriptions/${id}`);
  assert.equal(r.status, 204);
  r = await call('DELETE', `/subscriptions/${id}`);
  assert.equal(r.status, 404);
  r = await call('GET', '/subscriptions/abc');
  assert.equal(r.status, 400);

  r = await call('GET', '/categories');
  assert.ok(r.body.used.includes('Видео и ТВ'));
  assert.ok(r.body.all.includes('Музыка'));

  for (const s of (await call('GET', '/subscriptions')).body) await call('DELETE', `/subscriptions/${s.id}`);
});

test('ошибки валидации и некорректный JSON', async () => {
  let r = await call('POST', '/subscriptions', sub({ name: '', amount: 'abc' }));
  assert.equal(r.status, 400);
  assert.ok(r.body.fields.name && r.body.fields.amount);
  r = await call('POST', '/subscriptions', '{bad json');
  assert.equal(r.status, 400);
  assert.match(r.body.error, /JSON/);
  r = await call('PUT', '/subscriptions/999', sub());
  assert.equal(r.status, 404);
  r = await call('GET', '/nope');
  assert.equal(r.status, 404);
  r = await call('GET', '/upcoming?days=0');
  assert.equal(r.status, 400);
});

test('статистика, ближайшие списания и настройки', async () => {
  await call('PUT', '/settings', { baseCurrency: 'UZS', rates: { USD: 1, UZS: 100 } });
  await call('POST', '/subscriptions', sub());                                                           // 10 USD/мес = 1000 ₽
  await call('POST', '/subscriptions', sub({ name: 'Облако', category: 'Облако', amount: 1200, currency: 'UZS', billingPeriod: 'yearly', nextBillingDate: '2026-10-16' })); // 100 ₽/мес
  await call('POST', '/subscriptions', sub({ name: 'Зал', category: 'Спорт', amount: 600, currency: 'UZS', billingPeriod: 'weekly', nextBillingDate: '2026-10-01' }));    // 2600 ₽/мес
  await call('POST', '/subscriptions', sub({ name: 'Старое', amount: 999, currency: 'UZS', status: 'cancelled' }));

  let r = await call('GET', '/stats?today=2026-10-16');
  assert.equal(r.body.monthlyTotal, 3700);
  assert.equal(r.body.yearlyTotal, 12000 + 1200 + 31200);
  assert.deepEqual(r.body.counts, { total: 4, active: 3, paused: 0, cancelled: 1 });
  assert.deepEqual(r.body.byCategory.map((c) => c.category), ['Спорт', 'Музыка', 'Облако']);
  assert.equal(r.body.nextCharge.name, 'Облако');
  assert.equal(r.body.nextCharge.urgency, 'today');
  assert.deepEqual(r.body.upcoming.map((u) => [u.name, u.date, u.urgency]), [
    ['Облако', '2026-10-16', 'today'],
    ['Spotify', '2026-10-18', 'soon'],
    ['Зал', '2026-10-22', 'later'],
  ]);

  r = await call('GET', '/upcoming?days=30&today=2026-10-16');
  assert.equal(r.body.items.filter((i) => i.name === 'Зал').length, 4); // 22, 29 окт, 5, 12 нояб
  assert.equal(r.body.total, 1200 + 1000 + 4 * 600);

  r = await call('PUT', '/settings', { baseCurrency: 'USD', rates: { UZS: -1 } });
  assert.equal(r.status, 400);
  r = await call('GET', '/settings');
  assert.equal(r.body.baseCurrency, 'UZS');
});
