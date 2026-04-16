export type Theme = 'light' | 'dark';

const TRANSITION_DURATION = 300; // ms

export function applyTheme(theme: Theme, animate = true) {
  const root = document.documentElement;

  if (animate) {
    // Inject a brief CSS transition on everything
    const style = document.createElement('style');
    style.id = '__theme-transition';
    style.textContent = `
      *, *::before, *::after {
        transition: background-color ${TRANSITION_DURATION}ms ease,
                    border-color ${TRANSITION_DURATION}ms ease,
                    color ${TRANSITION_DURATION}ms ease,
                    fill ${TRANSITION_DURATION}ms ease,
                    stroke ${TRANSITION_DURATION}ms ease,
                    box-shadow ${TRANSITION_DURATION}ms ease !important;
      }
    `;
    document.head.appendChild(style);
    setTimeout(() => document.getElementById('__theme-transition')?.remove(), TRANSITION_DURATION + 50);
  }

  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
  }

  // Persist
  try {
    localStorage.setItem('shipdz-theme', theme);
  } catch {}
}

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = (localStorage.getItem('shipdz-theme') || localStorage.getItem('octomatic-theme')) as Theme;
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  // Respect OS preference as fallback
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

export function watchSystemTheme(callback: (t: Theme) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches ? 'dark' : 'light');
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
