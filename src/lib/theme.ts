// Color themes. The palettes themselves live in index.css as --c-* tokens;
// this only picks which one is active, via <html data-theme="...">.
// Scarlet Light is the site's theme; the others stay available through ?theme=.

export const THEMES = ['slate', 'scarlet', 'scarlet-light'] as const;

export const THEME_LABELS: Record<Theme, string> = {
  slate: 'Slate',
  scarlet: 'Scarlet',
  'scarlet-light': 'Scarlet Light',
};
export type Theme = (typeof THEMES)[number];

function isTheme(value: string | null): value is Theme {
  return THEMES.includes(value as Theme);
}

export const DEFAULT_THEME: Theme = 'scarlet-light';

// A ?theme=slate link previews another theme
export function getInitialTheme(): Theme {
  const fromUrl = new URLSearchParams(window.location.search).get('theme');
  return isTheme(fromUrl) ? fromUrl : DEFAULT_THEME;
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

// Read a --c-* token as 0-1 RGB floats, for the WebGL background
export function readColorToken(name: string): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--c-${name}`).trim();
  const [r, g, b] = raw.split(/\s+/).map(Number);
  return [r / 255, g / 255, b / 255];
}
