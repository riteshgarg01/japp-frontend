import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// Optional Sentry (enabled when VITE_SENTRY_DSN is set)
try {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    const Sentry = await import('@sentry/react');
    const { BrowserTracing } = await import('@sentry/browser');
    Sentry.init({
      dsn,
      integrations: [new BrowserTracing()],
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES || 0.0),
    });
  }
} catch (e) {
  // ignore
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
