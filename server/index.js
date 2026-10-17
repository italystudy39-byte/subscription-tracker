import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { createApp } from './app.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3001;
const DB_PATH = process.env.DB_PATH || path.join(root, 'data', 'subscriptions.db');

const db = openDb(DB_PATH);
const app = createApp(db, { staticDir: path.join(root, 'dist') });

const server = app.listen(PORT, () => {
  console.log(`Трекер подписок: http://localhost:${PORT}  (БД: ${DB_PATH})`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
