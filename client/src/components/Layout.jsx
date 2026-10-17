import { NavLink, Link } from 'react-router-dom';
import { Icon } from './ui.jsx';

const NAV = [
  { to: '/', label: 'Дашборд', icon: 'dashboard', end: true },
  { to: '/subscriptions', label: 'Подписки', icon: 'list' },
  { to: '/upcoming', label: 'Списания', icon: 'calendar' },
  { to: '/settings', label: 'Настройки', icon: 'settings' },
];

export default function Layout({ children }) {
  return (
    <div className="layout">
      <a href="#main" className="skip-link">К содержимому</a>
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">✓</span> Подписки
        </Link>
        <nav aria-label="Основная навигация">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              <Icon name={n.icon} /> <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <Link to="/subscriptions/new" className="btn btn-primary sidebar-add">
          <Icon name="plus" size={18} /> Добавить
        </Link>
      </aside>
      <main id="main" className="main">{children}</main>
      <nav className="bottom-nav" aria-label="Основная навигация">
        {NAV.slice(0, 2).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="bottom-link">
            <Icon name={n.icon} /> <span>{n.label}</span>
          </NavLink>
        ))}
        <Link to="/subscriptions/new" className="bottom-add" aria-label="Добавить подписку">
          <Icon name="plus" size={26} />
        </Link>
        {NAV.slice(2).map((n) => (
          <NavLink key={n.to} to={n.to} className="bottom-link">
            <Icon name={n.icon} /> <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
