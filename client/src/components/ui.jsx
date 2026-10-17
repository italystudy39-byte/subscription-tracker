import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { STATUSES } from '@shared/constants.js';
import { relativeDays } from '../format.js';

export function Icon({ name, size = 20 }) {
  const paths = {
    dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
    list: 'M4 6h16M4 12h16M4 18h10',
    calendar: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    plus: 'M12 5v14M5 12h14',
    alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    empty: 'M20 7H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2',
    edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export function Loader({ label = 'Загрузка…' }) {
  return <div className="loader" role="status"><span className="spinner" aria-hidden="true" />{label}</div>;
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <Icon name="alert" size={32} />
      <h2>Не удалось загрузить данные</h2>
      <p>{error?.message || 'Неизвестная ошибка'}</p>
      {onRetry && <button className="btn" onClick={onRetry}>Повторить</button>}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="state">
      <Icon name="empty" size={32} />
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUSES[status]?.label ?? status}</span>;
}

export function UrgencyBadge({ urgency, daysUntil }) {
  return <span className={`badge urgency-${urgency}`}>{relativeDays(daysUntil)}</span>;
}

export function AddButton({ className = 'btn btn-primary' }) {
  return (
    <Link to="/subscriptions/new" className={className}>
      <Icon name="plus" size={18} /> Добавить подписку
    </Link>
  );
}

export function ConfirmDialog({ open, title, text, confirmLabel = 'Удалить', onConfirm, onCancel, busy }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="dialog" onCancel={(e) => { e.preventDefault(); onCancel(); }}
      aria-labelledby="dlg-title">
      <h2 id="dlg-title">{title}</h2>
      <p>{text}</p>
      <div className="dialog-actions">
        <button className="btn" onClick={onCancel} disabled={busy}>Отмена</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Удаление…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
