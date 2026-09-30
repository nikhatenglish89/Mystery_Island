// Minimal screen router. Screens are async functions that return a DOM node.
const screens = new Map();
let leaveHooks = [];
let current = { name: null, params: {} };

export function register(name, fn) { screens.set(name, fn); }
export function onLeave(fn) { leaveHooks.push(fn); }
export const currentScreen = () => current;

export async function go(name, params = {}) {
  for (const fn of leaveHooks) { try { fn(); } catch { /* ignore */ } }
  leaveHooks = [];
  const fn = screens.get(name);
  if (!fn) throw new Error('Unknown screen ' + name);
  current = { name, params };
  const root = document.getElementById('screen');
  root.className = 'screen screen-' + name;
  root.replaceChildren();
  const node = await fn(params);
  if (current.name !== name) return; // navigated away while loading
  root.append(node);
  root.scrollTop = 0;
  const h = root.querySelector('h1,h2');
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}
