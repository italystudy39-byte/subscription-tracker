import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import { formatMoney, plural } from '../format.js';
import { AddButton, EmptyState, ErrorState, Loader } from '../components/ui.jsx';
import UpcomingList from '../components/UpcomingList.jsx';

const RANGES = [7, 30, 90];

export default function UpcomingPage() {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get('days'));
  const days = RANGES.includes(raw) ? raw : 30;
  const { data, loading, error, reload } = useApi(() => api.upcoming(days), [days]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Ближайшие списания</h1>
          <p className="muted">Только активные подписки</p>
        </div>
      </header>

      <div className="tabs" role="group" aria-label="Период">
        {RANGES.map((r) => (
          <button key={r} className={`tab ${r === days ? 'tab-on' : ''}`} aria-pressed={r === days}
            onClick={() => setParams({ days: String(r) }, { replace: true })}>
            {r} {plural(r, ['день', 'дня', 'дней'])}
          </button>
        ))}
      </div>

      {loading && !data ? <Loader /> : error ? <ErrorState error={error} onRetry={reload} /> : data.items.length === 0 ? (
        <EmptyState title="Списаний не предвидится"
          text={`За ближайшие ${days} ${plural(days, ['день', 'дня', 'дней'])} у активных подписок нет списаний.`}
          action={<AddButton />} />
      ) : (
        <section className="card">
          <div className="section-head">
            <h2>{data.items.length} {plural(data.items.length, ['списание', 'списания', 'списаний'])}</h2>
            <span>Итого: <strong>{formatMoney(data.total, data.baseCurrency)}</strong></span>
          </div>
          <UpcomingList items={data.items} baseCurrency={data.baseCurrency} />
        </section>
      )}
    </>
  );
}
