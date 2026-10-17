import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import { formatMoney, formatDate, plural } from '../format.js';
import { AddButton, EmptyState, ErrorState, Loader, UrgencyBadge } from '../components/ui.jsx';
import CategoryBars from '../components/CategoryBars.jsx';
import UpcomingList from '../components/UpcomingList.jsx';

export default function Dashboard() {
  const { data, loading, error, reload } = useApi(() => api.stats());
  if (loading && !data) return <Loader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { baseCurrency: cur, counts } = data;
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Дашборд</h1>
          <p className="muted">Итоги по активным подпискам в {cur}</p>
        </div>
        <AddButton className="btn btn-primary hide-mobile" />
      </header>

      {counts.total === 0 ? (
        <EmptyState
          title="Подписок пока нет"
          text="Добавьте первую подписку, и здесь появятся расходы за месяц и год, распределение по категориям и ближайшие списания."
          action={<AddButton />}
        />
      ) : (
        <>
          <section className="cards" aria-label="Сводка">
            <div className="card stat stat-accent">
              <span className="stat-label">В месяц</span>
              <span className="stat-value">{formatMoney(data.monthlyTotal, cur)}</span>
            </div>
            <div className="card stat">
              <span className="stat-label">В год</span>
              <span className="stat-value">{formatMoney(data.yearlyTotal, cur)}</span>
            </div>
            <div className="card stat">
              <span className="stat-label">Активных подписок</span>
              <span className="stat-value">{counts.active}<span className="stat-sub"> из {counts.total}</span></span>
              {(counts.paused > 0 || counts.cancelled > 0) && (
                <span className="muted small">
                  {counts.paused > 0 && `${counts.paused} ${plural(counts.paused, ['приостановлена', 'приостановлены', 'приостановлено'])}`}
                  {counts.paused > 0 && counts.cancelled > 0 && ', '}
                  {counts.cancelled > 0 && `${counts.cancelled} ${plural(counts.cancelled, ['отменена', 'отменены', 'отменено'])}`}
                </span>
              )}
            </div>
            <div className="card stat">
              <span className="stat-label">Ближайшее списание</span>
              {data.nextCharge ? (
                <>
                  <span className="stat-value stat-value-sm">{data.nextCharge.name}</span>
                  <span className="small">
                    {formatDate(data.nextCharge.date)} · {formatMoney(data.nextCharge.amount, data.nextCharge.currency)}
                  </span>
                  <UrgencyBadge urgency={data.nextCharge.urgency} daysUntil={data.nextCharge.daysUntil} />
                </>
              ) : <span className="muted">Нет активных подписок</span>}
            </div>
          </section>

          <div className="grid-2">
            <section className="card">
              <h2>Расходы по категориям</h2>
              {data.byCategory.length ? (
                <CategoryBars items={data.byCategory} currency={cur} />
              ) : (
                <p className="muted">Нет активных подписок, поэтому расходов нет.</p>
              )}
            </section>

            <section className="card">
              <div className="section-head">
                <h2>Ближайшие 7 дней</h2>
                <Link to="/upcoming" className="link">Все списания</Link>
              </div>
              {data.upcoming.length ? (
                <>
                  <UpcomingList items={data.upcoming} baseCurrency={cur} />
                  <p className="total-line">Итого за неделю: <strong>{formatMoney(data.upcomingTotal, cur)}</strong></p>
                </>
              ) : (
                <p className="muted">В ближайшую неделю списаний нет.</p>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
