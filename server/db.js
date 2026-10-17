import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_BASE_CURRENCY, DEFAULT_RATES } from '../shared/constants.js';

const MIGRATIONS = [
  `CREATE TABLE subscriptions (
     id                INTEGER PRIMARY KEY AUTOINCREMENT,
     name              TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
     category          TEXT    NOT NULL CHECK (length(category) BETWEEN 1 AND 50),
     amount_minor      INTEGER NOT NULL CHECK (amount_minor > 0),
     currency          TEXT    NOT NULL,
     billing_period    TEXT    NOT NULL CHECK (billing_period IN ('weekly','monthly','yearly')),
     next_billing_date TEXT    NOT NULL,
     status            TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
     notes             TEXT    NOT NULL DEFAULT '',
     created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
     updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
   );
   CREATE INDEX idx_sub_status   ON subscriptions(status);
   CREATE INDEX idx_sub_category ON subscriptions(category);
   CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
];

export function openDb(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const version = db.pragma('user_version', { simple: true });
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }

  const seed = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  seed.run('base_currency', JSON.stringify(DEFAULT_BASE_CURRENCY));
  seed.run('rates', JSON.stringify(DEFAULT_RATES));
  return db;
}
