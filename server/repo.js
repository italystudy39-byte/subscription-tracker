import { fromMinor, toMinor } from '../shared/money.js';
import { DEFAULT_RATES, DEFAULT_BASE_CURRENCY } from '../shared/constants.js';

function rowToSub(r) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    amount: fromMinor(r.amount_minor),
    currency: r.currency,
    billingPeriod: r.billing_period,
    nextBillingDate: r.next_billing_date,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function createRepo(db) {
  const q = {
    get: db.prepare('SELECT * FROM subscriptions WHERE id = ?'),
    insert: db.prepare(`INSERT INTO subscriptions
      (name, category, amount_minor, currency, billing_period, next_billing_date, status, notes)
      VALUES (@name, @category, @amount_minor, @currency, @billing_period, @next_billing_date, @status, @notes)`),
    update: db.prepare(`UPDATE subscriptions SET
      name=@name, category=@category, amount_minor=@amount_minor, currency=@currency,
      billing_period=@billing_period, next_billing_date=@next_billing_date, status=@status,
      notes=@notes, updated_at=datetime('now') WHERE id=@id`),
    del: db.prepare('DELETE FROM subscriptions WHERE id = ?'),
    categories: db.prepare('SELECT DISTINCT category FROM subscriptions ORDER BY category COLLATE NOCASE'),
    getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
    setSetting: db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
  };

  const toRow = (v) => ({
    name: v.name,
    category: v.category,
    amount_minor: toMinor(v.amount),
    currency: v.currency,
    billing_period: v.billingPeriod,
    next_billing_date: v.nextBillingDate,
    status: v.status,
    notes: v.notes,
  });

  return {
    list({ status, category } = {}) {
      const where = [];
      const params = {};
      if (status) { where.push('status = @status'); params.status = status; }
      if (category) { where.push('category = @category'); params.category = category; }
      const sql = `SELECT * FROM subscriptions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id`;
      return db.prepare(sql).all(params).map(rowToSub);
    },
    get(id) {
      const r = q.get.get(id);
      return r ? rowToSub(r) : null;
    },
    create(v) {
      const { lastInsertRowid } = q.insert.run(toRow(v));
      return this.get(Number(lastInsertRowid));
    },
    update(id, v) {
      const { changes } = q.update.run({ ...toRow(v), id });
      return changes ? this.get(id) : null;
    },
    remove(id) {
      return q.del.run(id).changes > 0;
    },
    categories() {
      return q.categories.all().map((r) => r.category);
    },
    getSettings() {
      const base = q.getSetting.get('base_currency');
      const rates = q.getSetting.get('rates');
      return {
        baseCurrency: base ? JSON.parse(base.value) : DEFAULT_BASE_CURRENCY,
        rates: { ...DEFAULT_RATES, ...(rates ? JSON.parse(rates.value) : {}) },
      };
    },
    saveSettings(s) {
      db.transaction(() => {
        q.setSetting.run('base_currency', JSON.stringify(s.baseCurrency));
        q.setSetting.run('rates', JSON.stringify(s.rates));
      })();
      return this.getSettings();
    },
  };
}
