import { Link, useSearchParams } from 'react-router-dom';
import { STATUSES, PERIODS } from '@shared/constants.js';
import { api } from '../api.js';
import { useApi, useSettings } from '../hooks.js';
import { formatDate, formatMoney, plural } from '../format.js';
import { AddButton, EmptyState, ErrorState, Icon, Loader, StatusBadge } from '../components/ui.jsx';

export default function SubscriptionsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const category = params.get('category') || '';
  const { settings } = useSettings();
  const base = settings?.baseCurrency;

  const list = useApi(() => api.listSubscriptions({ status, category }), [status, category]);
  const cats = useApi(() => api.categories());

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  const filtered = Boolean(status || category);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Подписки</h1>
          {list.data && <p className="muted">{list.data.length} {plural(list.data.length, ['подписка', 'подписки', 'подписок'])}{filtered ? ' по фильтру' : ''}</p>}
        </div>
        <AddButton className="btn btn-primary hide-mobile" />
      </header>

      <div className="filters" role="search">
        <label className="field">
          <span>Категория</span>
          <select value={category} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">Все категории</option>
            {(cats.data?.used ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            {category && cats.data && !cats.data.used.includes(category) && <option value={category}>{category}</option>}
          </select>
        </label>
        <label className="field">
          <span>Статус</span>
          <select value={status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">Все статусы</option>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        {filtered && <button className="btn btn-ghost" onClick={() => setParams({}, { replace: true })}>Сбросить</button>}
      </div>

      {list.loading && !list.data ? <Loader /> : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.data.length === 0 ? (
        filtered ? (
          <EmptyState title="Ничего не найдено" text="Нет подписок с выбранными фильтрами."
            action={<button className="btn" onClick={() => setParams({}, { replace: true })}>Сбросить фильтры</button>} />
        ) : (
          <EmptyState title="Подписок пока нет" text="Добавьте сервисы, за которые вы платите регулярно." action={<AddButton />} />
        )
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Сервис</th><th>Категория</th><th className="num">Стоимость</th>
                <th className="num">В месяц, {base}</th><th>Следующее списание</th><th>Статус</th><th><span className="sr-only">Действия</span></th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((s) => (
                <tr key={s.id} className={s.status !== 'active' ? 'row-inactive' : ''}>
                  <td><Link to={`/subscriptions/${s.id}/edit`} className="strong-link">{s.name}</Link></td>
                  <td>{s.category}</td>
                  <td className="num">{formatMoney(s.amount, s.currency)} <span className="muted">/ {PERIODS[s.billingPeriod].short}</span></td>
                  <td className="num">{s.status === 'active' ? formatMoney(s.monthlyInBase, base) : <span className="muted">—</span>}</td>
                  <td>{s.status === 'active' ? formatDate(s.effectiveNextDate) : <span className="muted">—</span>}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="actions">
                    <Link to={`/subscriptions/${s.id}/edit`} className="icon-btn" aria-label={`Изменить ${s.name}`}><Icon name="edit" size={18} /></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="sub-cards">
            {list.data.map((s) => (
              <li key={s.id}>
                <Link to={`/subscriptions/${s.id}/edit`} className={`card sub-card ${s.status !== 'active' ? 'row-inactive' : ''}`}>
                  <div className="sub-card-top">
                    <strong>{s.name}</strong>
                    <span className="sub-card-price">{formatMoney(s.amount, s.currency)}<span className="muted"> / {PERIODS[s.billingPeriod].short}</span></span>
                  </div>
                  <div className="sub-card-bottom">
                    <span className="muted">{s.category}{s.status === 'active' ? ` · ${formatDate(s.effectiveNextDate)}` : ''}</span>
                    <StatusBadge status={s.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
