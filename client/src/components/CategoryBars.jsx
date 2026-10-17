import { formatMoney } from '../format.js';

const COLORS = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#dc2626', '#0d9488', '#65a30d', '#64748b'];

export default function CategoryBars({ items, currency }) {
  const max = Math.max(...items.map((i) => i.monthly), 0);
  return (
    <ul className="bars" aria-label="Расходы в месяц по категориям">
      {items.map((c, i) => (
        <li key={c.category} className="bar-row">
          <div className="bar-head">
            <span className="bar-label">
              <span className="dot" style={{ background: COLORS[i % COLORS.length] }} aria-hidden="true" />
              {c.category}
              <span className="muted"> · {c.count}</span>
            </span>
            <span className="bar-value">
              {formatMoney(c.monthly, currency)} <span className="muted">{c.share.toLocaleString('ru-RU')}%</span>
            </span>
          </div>
          <div className="bar-track" aria-hidden="true">
            <div className="bar-fill" style={{ width: `${max ? (c.monthly / max) * 100 : 0}%`, background: COLORS[i % COLORS.length] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
