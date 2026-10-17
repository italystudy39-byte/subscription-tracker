import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createRepo } from './repo.js';
import { buildStats, buildUpcoming, decorate } from './stats.js';
import { validateSubscription, validateSettings } from '../shared/validation.js';
import { parseDate, todayISO } from '../shared/dates.js';
import { STATUS_CODES, DEFAULT_CATEGORIES } from '../shared/constants.js';

class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function createApp(db, { staticDir } = {}) {
  const repo = createRepo(db);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();

  const getToday = (req) => {
    const t = req.query.today;
    if (t === undefined) return todayISO();
    if (typeof t !== 'string' || !parseDate(t)) throw new HttpError(400, 'Параметр today должен быть датой YYYY-MM-DD');
    return t;
  };
  const getId = (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Некорректный идентификатор');
    return id;
  };
  const validOrThrow = ({ value, errors }) => {
    if (!value) throw new HttpError(400, 'Проверьте правильность заполнения полей', errors);
    return value;
  };

  api.get('/health', (req, res) => res.json({ ok: true }));

  api.get('/subscriptions', (req, res) => {
    const { status, category } = req.query;
    if (status !== undefined && status !== '' && !STATUS_CODES.includes(status)) {
      throw new HttpError(400, 'Неизвестный статус');
    }
    if (category !== undefined && typeof category !== 'string') throw new HttpError(400, 'Некорректная категория');
    const today = getToday(req);
    const settings = repo.getSettings();
    const list = repo
      .list({ status: status || undefined, category: category || undefined })
      .map((s) => decorate(s, settings, today));
    const statusOrder = { active: 0, paused: 1, cancelled: 2 };
    list.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]
      || a.effectiveNextDate.localeCompare(b.effectiveNextDate)
      || a.name.localeCompare(b.name, 'ru'));
    res.json(list);
  });

  api.get('/subscriptions/:id', (req, res) => {
    const sub = repo.get(getId(req));
    if (!sub) throw new HttpError(404, 'Подписка не найдена');
    res.json(decorate(sub, repo.getSettings(), getToday(req)));
  });

  api.post('/subscriptions', (req, res) => {
    const value = validOrThrow(validateSubscription(req.body));
    const sub = repo.create(value);
    res.status(201).json(decorate(sub, repo.getSettings(), todayISO()));
  });

  api.put('/subscriptions/:id', (req, res) => {
    const id = getId(req);
    const value = validOrThrow(validateSubscription(req.body));
    const sub = repo.update(id, value);
    if (!sub) throw new HttpError(404, 'Подписка не найдена');
    res.json(decorate(sub, repo.getSettings(), todayISO()));
  });

  api.delete('/subscriptions/:id', (req, res) => {
    if (!repo.remove(getId(req))) throw new HttpError(404, 'Подписка не найдена');
    res.status(204).end();
  });

  api.get('/categories', (req, res) => {
    const used = repo.categories();
    const all = [...new Set([...DEFAULT_CATEGORIES, ...used])];
    res.json({ all, used });
  });

  api.get('/stats', (req, res) => {
    res.json(buildStats(repo.list(), repo.getSettings(), getToday(req)));
  });

  api.get('/upcoming', (req, res) => {
    const days = req.query.days === undefined ? 30 : Number(req.query.days);
    if (!Number.isInteger(days) || days < 1 || days > 366) {
      throw new HttpError(400, 'Параметр days должен быть целым числом от 1 до 366');
    }
    res.json(buildUpcoming(repo.list(), repo.getSettings(), getToday(req), days));
  });

  api.get('/settings', (req, res) => res.json(repo.getSettings()));

  api.put('/settings', (req, res) => {
    const value = validOrThrow(validateSettings(req.body));
    res.json(repo.saveSettings(value));
  });

  api.use((req, res) => {
    throw new HttpError(404, 'Маршрут не найден');
  });

  app.use('/api', api);

  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('*', (req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Некорректный JSON в теле запроса' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Слишком большой запрос' });
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message, ...(err.fields ? { fields: err.fields } : {}) });
    }
    console.error(err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера. Попробуйте ещё раз.' });
  });

  return app;
}
