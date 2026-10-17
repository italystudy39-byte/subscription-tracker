import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

// На GitHub Pages нет серверной маршрутизации, поэтому адреса строятся через #.
const Router = import.meta.env.VITE_STORAGE === 'local' ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);
