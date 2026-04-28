const MONITORING_ENDPOINT = import.meta.env.VITE_MONITORING_ENDPOINT;

const currentPath = () =>
  `${window.location.pathname}${window.location.search}${window.location.hash}` || '/';

const postEvent = (eventType, payload = {}) => {
  if (!MONITORING_ENDPOINT) return;

  const body = JSON.stringify({
    eventType,
    path: currentPath(),
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

  // Path-based router uses pushState — patch it so monitoring sees SPA
  // navigations the same as initial load. (popstate covers back/forward.)
  const emitView = () => postEvent('page_view', { path: currentPath() });
  const originalPushState = window.history.pushState;
  window.history.pushState = function patchedPushState(...args) {
    const result = originalPushState.apply(this, args);
    emitView();
    return result;
  };
  window.addEventListener('popstate', emitView);
  window.addEventListener('hashchange', emitView);

  emitView();
};

export default initMonitoring;
