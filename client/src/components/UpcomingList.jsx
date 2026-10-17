import { Link } from 'react-router-dom';
import { PERIODS } from '@shared/constants.js';
import { formatDate, formatMoney, weekday } from '../format.js';
import { UrgencyBadge } from './ui.jsx';

export default function UpcomingList({ items, baseCurrency }) {
  return (
    <ul className="upcoming">
      {items.map((u) => (
        <li key={`${u.subscriptionId}-${u.date}`} className={`upcoming-item urgent-${u.urgency}`}>
          <div className="upcoming-date">
            <span className="upcoming-day">{formatDate(u.date)}</span>
            <span className="muted">{weekday(u.date)}</span>
          </div>
          <div className="upcoming-main">
            <Link to={`/subscriptions/${u.subscriptionId}/edit`} className="upcoming-name">{u.name}</Link>
            <span className="muted">{u.category} · {PERIODS[u.billingPeriod]?.label.toLowerCase()}</span>
          </div>
          <div className="upcoming-side">
            <strong>{formatMoney(u.amount, u.currency)}</strong>
            {u.currency !== baseCurrency && <span className="muted">≈ {formatMoney(u.amountInBase, baseCurrency)}</span>}
            <UrgencyBadge urgency={u.urgency} daysUntil={u.daysUntil} />
          </div>
        </li>
      ))}
    </ul>
  );
}
