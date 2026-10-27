// Role: background worker (Web Worker) for live updates. It runs off the page's main thread,
// asks GET /api/changes every 5 seconds and tells the page only when the database
// revision has changed, i.e. when this or another tab, device or server instance
// created, edited, deleted or imported something.
//
// Messages from the page:   { type: 'start', intervalMs }   { type: 'stop' }   { type: 'check' }
// Messages to the page:     { type: 'changed', revision }   { type: 'ok', revision, at }   { type: 'offline', error }
'use strict';

let timer = null;
let lastRevision = null;
let intervalMs = 5000;
let busy = false;

async function check() {
  if (busy) return;                     // never overlap two requests on a slow connection
  busy = true;
  try {
    const res = await fetch('/api/changes', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { revision } = await res.json();
    if (lastRevision !== null && revision !== lastRevision) self.postMessage({ type: 'changed', revision });
    lastRevision = revision;
    self.postMessage({ type: 'ok', revision, at: Date.now() });
  } catch (err) {
    self.postMessage({ type: 'offline', error: err.message });
  } finally {
    busy = false;
  }
}

self.onmessage = (event) => {
  const msg = event.data || {};
  if (msg.type === 'start') {
    intervalMs = Math.max(1000, Number(msg.intervalMs) || 5000);
    clearInterval(timer);
    check();
    timer = setInterval(check, intervalMs);
  } else if (msg.type === 'stop') {
    clearInterval(timer);
    timer = null;
  } else if (msg.type === 'check') {
    check();
  }
};
