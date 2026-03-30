const MONITORING_ENDPOINT = import.meta.env.VITE_MONITORING_ENDPOINT;

const postEvent = (eventType, payload = {}) => {
  if (!MONITORING_ENDPOINT) return;

  const body = JSON.stringify({
    eventType,
    path: window.location.hash || '#home',
    timestamp: new Date().toISOString(),
    payload,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(MONITORING_ENDPOINT, blob);
    return;
  }

  fetch(MONITORING_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Avoid throwing inside monitoring paths.
  });
};

export const initMonitoring = () => {
  window.addEventListener('error', (event) => {
    postEvent('window_error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    postEvent('unhandled_rejection', {
      reason: String(event.reason),
    });
  });

  window.addEventListener('hashchange', () => {
    postEvent('page_view', { hash: window.location.hash || '#home' });
  });

  postEvent('page_view', { hash: window.location.hash || '#home' });
};

export default initMonitoring;
