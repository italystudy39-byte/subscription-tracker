import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CURRENCIES, PERIODS, STATUSES, LIMITS, DEFAULT_BASE_CURRENCY } from '@shared/constants.js';
import { validateSubscription, parseAmount } from '@shared/validation.js';
import { toMonthly, toYearly, convert } from '@shared/money.js';
import { todayISO } from '@shared/dates.js';
import { api } from '../api.js';
import { useApi, useSettings, useToast } from '../hooks.js';
import { formatMoney } from '../format.js';
import { ConfirmDialog, ErrorState, Loader } from '../components/ui.jsx';

const emptyForm = (currency) => ({
  name: '', category: '', amount: '', currency, billingPeriod: 'monthly',
  nextBillingDate: todayISO(), status: 'active', notes: '',
});

function Field({ id, label, error, hint, children }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <span id={`${id}-err`} className="field-error">{error}</span>
        : hint ? <span id={`${id}-hint`} className="field-hint">{hint}</span> : null}
    </div>
  );
}

export default function SubscriptionForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useSettings();
  const base = settings?.baseCurrency ?? DEFAULT_BASE_CURRENCY;

  const existing = useApi(() => (isEdit ? api.getSubscription(id) : Promise.resolve(null)), [id]);
  const cats = useApi(() => api.categories());

  const [form, setForm] = useState(() => emptyForm(base));
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (existing.data) {
      const s = existing.data;
      setForm({
        name: s.name, category: s.category, amount: String(s.amount).replace('.', ','),
        currency: s.currency, billingPeriod: s.billingPeriod, nextBillingDate: s.nextBillingDate,
        status: s.status, notes: s.notes,
      });
    }
  }, [existing.data]);

  const { errors } = useMemo(() => validateSubscription(form), [form]);
  const shownError = (f) => serverErrors[f] || ((submitted || touched[f]) ? errors[f] : undefined);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setServerErrors((s) => ({ ...s, [field]: undefined }));
  };
  const touch = (field) => () => setTouched((t) => ({ ...t, [field]: true }));
  const aria = (f) => ({
    id: f,
    'aria-invalid': shownError(f) ? 'true' : undefined,
    'aria-describedby': shownError(f) ? `${f}-err` : `${f}-hint`,
    onBlur: touch(f),
  });

  const preview = useMemo(() => {
    const a = parseAmount(form.amount);
    if (errors.amount || !(a > 0) || !settings) return null;
    try {
      return {
        monthly: convert(toMonthly(a, form.billingPeriod), form.currency, base, settings.rates),
        yearly: convert(toYearly(a, form.billingPeriod), form.currency, base, settings.rates),
      };
    } catch { return null; }
  }, [form.amount, form.billingPeriod, form.currency, base, settings, errors.amount]);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    const { value, errors: errs } = validateSubscription(form);
    if (!value) {
      const first = Object.keys(errs)[0];
      document.getElementById(first)?.focus();
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await api.updateSubscription(id, value);
      else await api.createSubscription(value);
      toast(isEdit ? 'Изменения сохранены' : `Подписка «${value.name}» добавлена`);
      navigate('/subscriptions');
    } catch (err) {
      setServerErrors(err.fields || {});
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await api.deleteSubscription(id);
      toast(`Подписка «${existing.data.name}» удалена`);
      navigate('/subscriptions');
    } catch (err) {
      setConfirm(false);
      setFormError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (isEdit && existing.loading && !existing.data) return <Loader />;
  if (isEdit && existing.error) {
    return existing.error.status === 404
      ? <ErrorState error={{ message: 'Такой подписки нет. Возможно, её уже удалили.' }} />
      : <ErrorState error={existing.error} onRetry={existing.reload} />;
  }

  return (
    <>
      <header className="page-head">
        <div>
          <Link to="/subscriptions" className="link back-link">← К списку</Link>
          <h1>{isEdit ? 'Редактирование' : 'Новая подписка'}</h1>
        </div>
      </header>

      <form className="card form" onSubmit={onSubmit} noValidate>
        {formError && <div className="banner banner-error" role="alert">{formError}</div>}
        {submitted && Object.keys(errors).length > 0 && !formError && (
          <div className="banner banner-error" role="alert">Исправьте отмеченные поля.</div>
        )}

        <div className="form-grid">
          <Field id="name" label="Название сервиса *" error={shownError('name')} hint="Например, Netflix или Яндекс Плюс">
            <input {...aria('name')} value={form.name} onChange={set('name')} maxLength={LIMITS.name + 20} autoComplete="off" autoFocus={!isEdit} />
          </Field>

          <Field id="category" label="Категория *" error={shownError('category')} hint="Выберите из списка или введите свою">
            <input {...aria('category')} list="category-list" value={form.category} onChange={set('category')} autoComplete="off" />
            <datalist id="category-list">
              {(cats.data?.all ?? []).map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>

          <Field id="amount" label="Стоимость *" error={shownError('amount')} hint="За один период оплаты">
            <input {...aria('amount')} inputMode="decimal" value={form.amount} onChange={set('amount')} placeholder="0,00" autoComplete="off" />
          </Field>

          <Field id="currency" label="Валюта *" error={shownError('currency')}>
            <select {...aria('currency')} value={form.currency} onChange={set('currency')}>
              {Object.entries(CURRENCIES).map(([code, c]) => <option key={code} value={code}>{code} · {c.name}</option>)}
            </select>
          </Field>

          <Field id="billingPeriod" label="Периодичность *" error={shownError('billingPeriod')}>
            <select {...aria('billingPeriod')} value={form.billingPeriod} onChange={set('billingPeriod')}>
              {Object.entries(PERIODS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
            </select>
          </Field>

          <Field id="nextBillingDate" label="Дата следующего списания *" error={shownError('nextBillingDate')}>
            <input {...aria('nextBillingDate')} type="date" value={form.nextBillingDate} onChange={set('nextBillingDate')} min="2000-01-01" max="2100-12-31" />
          </Field>

          <fieldset className={`field field-wide ${shownError('status') ? 'has-error' : ''}`}>
            <legend>Статус</legend>
            <div className="segmented">
              {Object.entries(STATUSES).map(([k, s]) => (
                <label key={k} className={`seg seg-${k} ${form.status === k ? 'seg-on' : ''}`}>
                  <input type="radio" name="status" value={k} checked={form.status === k} onChange={set('status')} />
                  {s.label}
                </label>
              ))}
            </div>
            {shownError('status') && <span className="field-error">{shownError('status')}</span>}
          </fieldset>

          <Field id="notes" label="Заметка" error={shownError('notes')} hint={`${form.notes.length} / ${LIMITS.notes}`}>
            <textarea {...aria('notes')} rows={3} value={form.notes} onChange={set('notes')} />
          </Field>
        </div>

        {preview && (
          <p className="preview">
            Это <strong>{formatMoney(preview.monthly, base)}</strong> в месяц и <strong>{formatMoney(preview.yearly, base)}</strong> в год
            {form.status !== 'active' && <span className="muted"> (в итоги не входит, пока подписка не активна)</span>}
          </p>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Добавить'}
          </button>
          <Link to="/subscriptions" className="btn">Отмена</Link>
          {isEdit && (
            <button type="button" className="btn btn-danger-ghost push-right" onClick={() => setConfirm(true)}>Удалить</button>
          )}
        </div>
      </form>

      {isEdit && (
        <ConfirmDialog
          open={confirm}
          title="Удалить подписку?"
          text={`«${existing.data?.name}» будет удалена без возможности восстановления. Если вы просто перестали платить, можно отметить её как отменённую.`}
          onConfirm={onDelete}
          onCancel={() => setConfirm(false)}
          busy={deleting}
        />
      )}
    </>
  );
}
