// Заполняет БД демонстрационными подписками (только если она пуста).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../server/db.js';
import { createRepo } from '../server/repo.js';
import { addPeriod, todayISO } from '../shared/dates.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = openDb(process.env.DB_PATH || path.join(root, 'data', 'subscriptions.db'));
const repo = createRepo(db);

if (repo.list().length) {
  console.log('В базе уже есть подписки, демо-данные не добавлены.');
  process.exit(0);
}

const t = todayISO();
const inDays = (n) => new Date(Date.parse(t + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const demo = [
  ['Яндекс Плюс', 'Видео и ТВ', 49000, 'UZS', 'monthly', inDays(0), 'active'],
  ['Netflix', 'Видео и ТВ', 15.49, 'USD', 'monthly', inDays(2), 'active'],
  ['Spotify', 'Музыка', 10.99, 'USD', 'monthly', inDays(9), 'active'],
  ['ChatGPT Plus', 'Софт и сервисы', 20, 'USD', 'monthly', inDays(1), 'active'],
  ['iCloud+ 200 ГБ', 'Облако', 2.99, 'USD', 'monthly', inDays(17), 'active'],
  ['Figma Professional', 'Софт и сервисы', 144, 'USD', 'yearly', addPeriod(t, 'monthly', 4), 'active'],
  ['Фитнес-клуб', 'Здоровье и спорт', 150000, 'UZS', 'weekly', inDays(4), 'active'],
  ['Мобильная связь', 'Связь и интернет', 85000, 'UZS', 'monthly', inDays(12), 'active'],
  ['Duolingo', 'Образование', 600000, 'UZS', 'yearly', inDays(60), 'paused'],
  ['Xbox Game Pass', 'Игры', 9.99, 'USD', 'monthly', inDays(20), 'cancelled'],
];
for (const [name, category, amount, currency, billingPeriod, nextBillingDate, status] of demo) {
  repo.create({ name, category, amount, currency, billingPeriod, nextBillingDate, status, notes: '' });
}
console.log(`Добавлено ${demo.length} демо-подписок.`);
db.close();
