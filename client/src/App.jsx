import { useCallback, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SubscriptionsPage from './pages/SubscriptionsPage.jsx';
import SubscriptionForm from './pages/SubscriptionForm.jsx';
import UpcomingPage from './pages/UpcomingPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { EmptyState, ErrorState, Loader } from './components/ui.jsx';
import { ToastContext, SettingsContext, useApi } from './hooks.js';
import { api } from './api.js';

export default function App() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((text, kind = 'success') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  const settings = useApi(() => api.settings());

  let content;
  if (settings.loading && !settings.data) content = <Loader />;
  else if (settings.error) content = <ErrorState error={settings.error} onRetry={settings.reload} />;
  else content = (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/subscriptions" element={<SubscriptionsPage />} />
      <Route path="/subscriptions/new" element={<SubscriptionForm />} />
      <Route path="/subscriptions/:id/edit" element={<SubscriptionForm />} />
      <Route path="/upcoming" element={<UpcomingPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<EmptyState title="Страница не найдена" action={<Link className="btn" to="/">На дашборд</Link>} />} />
    </Routes>
  );

  return (
    <ToastContext.Provider value={toast}>
      <SettingsContext.Provider value={{ settings: settings.data, reload: settings.reload }}>
        <Layout>{content}</Layout>
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => <div key={t.id} className={`toast toast-${t.kind}`}>{t.text}</div>)}
        </div>
      </SettingsContext.Provider>
    </ToastContext.Provider>
  );
}
