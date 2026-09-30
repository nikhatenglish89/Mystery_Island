// Optional, anonymous, cookie-free usage counts. Off unless config.analytics.endpoint is set AND the
// parent has not switched it off. Never sends nicknames, ids or anything about the device, never blocks
// gameplay, and drops events silently on any failure.
import { getSetting } from './storage.js';
let cfg = { endpoint: '' };
export function initAnalytics(config) { cfg = config?.analytics || { endpoint: '' }; }
export function analyticsAvailable() { return !!cfg.endpoint; }
export function track(event, props = {}) {
  try {
    if (!cfg.endpoint || !getSetting('analytics')) return;
    const safe = {};
    for (const k of ['level', 'world', 'band', 'engine', 'stars']) if (props[k] != null) safe[k] = props[k];
    const body = JSON.stringify({ e: event, ...safe });
    if (navigator.sendBeacon) navigator.sendBeacon(cfg.endpoint, new Blob([body], { type: 'text/plain' }));
  } catch { /* dropped silently */ }
}
