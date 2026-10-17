import { useEffect, useState } from 'react';
import { CURRENCIES, CURRENCY_CODES, DEFAULT_RATES } from '@shared/constants.js';
import { validateSettings } from '@shared/validation.js';
import { api } from '../api.js';
import { useSettings, useToast } from '../hooks.js';

const toInput = (rates) => Object.fromEntries(CURRENCY_CODES.map((c) => [c, String(rates[c] ?? '').replace('.', ',')]));

export default function SettingsPage() {
  const { settings, reload } = useSettings();
  const toast = useToast();
  const [base, setBase] = useState(settings.baseCurrency);
  const [rates, setRates] = useState(() => toInput(settings.rates));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBase(settings.baseCurrency);
    setRates(toInput(settings.rates));
  }, [settings]);

  async function onSubmit(e) {
    e.preventDefault();
    setFormError(null);
    const { value, errors: errs } = validateSettings({ baseCurrency: base, rates });
    setErrors(errs);
    if (!value) return;
    setSaving(true);
    try {
      await api.saveSettings(value);
      reload();
      toast('Настройки сохранены');
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const rateErr = (c) => errors.rates?.[c];

  return (
    <>
      <header className="page-head"><div><h1>Настройки</h1></div></header>
      <form className="settings" onSubmit={onSubmit} noValidate>
        {formError && <div className="banner banner-error" role="alert">{formError}</div>}

        <section className="card">
          <h2>Основная валюта</h2>
          <p className="muted">В ней считаются итоги на дашборде и суммы в списке.</p>
          <div className="field">
            <label htmlFor="baseCurrency">Валюта</label>
            <select id="baseCurrency" value={base} onChange={(e) => setBase(e.target.value)}>
              {Object.entries(CURRENCIES).map(([code, c]) => <option key={code} value={code}>{code} · {c.name}</option>)}
            </select>
          </div>
        </section>

        <section className="card">
          <div className="section-head">
            <h2>Курсы валют</h2>
            <button type="button" className="btn btn-ghost" onClick={() => { setRates(toInput(DEFAULT_RATES)); setErrors({}); }}>
              Сбросить по умолчанию
            </button>
          </div>
          <p className="muted">Сколько единиц валюты стоит 1 USD. Курсы не обновляются автоматически: поправьте их, если они устарели.</p>
          <div className="rates">
            {CURRENCY_CODES.map((c) => (
              <div key={c} className={`field ${rateErr(c) ? 'has-error' : ''}`}>
                <label htmlFor={`rate-${c}`}>1 USD = … {c}</label>
                <input id={`rate-${c}`} inputMode="decimal" value={rates[c]} disabled={c === 'USD'}
                  aria-invalid={rateErr(c) ? 'true' : undefined}
                  onChange={(e) => setRates((r) => ({ ...r, [c]: e.target.value }))} />
                {rateErr(c) && <span className="field-error">{rateErr(c)}</span>}
              </div>
            ))}
          </div>
        </section>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</button>
        </div>
      </form>
    </>
  );
}
