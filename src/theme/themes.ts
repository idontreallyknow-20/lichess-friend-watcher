// Theme factory. A compact "seed" of base colors is expanded into the full set
// of CSS custom properties the app uses, so adding a new theme means writing a
// handful of colors instead of a whole stylesheet.

export interface Theme {
  id: string;
  name: string;
  scheme: 'dark' | 'light';
  vars: Record<string, string>;
}

interface Seed {
  id: string;
  name: string;
  scheme: 'dark' | 'light';
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textDim: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  onAccent: string;
  win: string;
  loss: string;
  draw: string;
}

function createTheme(seed: Seed): Theme {
  return {
    id: seed.id,
    name: seed.name,
    scheme: seed.scheme,
    vars: {
      '--bg': seed.bg,
      '--bg-elev': seed.surface,
      '--bg-elev-2': seed.surface2,
      '--border': seed.border,
      '--text': seed.text,
      '--text-dim': seed.textDim,
      '--text-muted': seed.textMuted,
      '--accent': seed.accent,
      '--accent-hover': seed.accentHover,
      '--on-accent': seed.onAccent,
      '--win': seed.win,
      '--loss': seed.loss,
      '--draw': seed.draw,
      '--online': seed.win,
      '--shadow':
        seed.scheme === 'dark'
          ? '0 8px 24px rgba(0, 0, 0, 0.38)'
          : '0 8px 24px rgba(15, 23, 42, 0.10)',
    },
  };
}

const SEEDS: Seed[] = [
  {
    id: 'midnight',
    name: 'Midnight Green',
    scheme: 'dark',
    bg: '#0f1115',
    surface: '#171a21',
    surface2: '#1f232c',
    border: '#2a2f3a',
    text: '#e7e9ee',
    textDim: '#9aa3b2',
    textMuted: '#6b7280',
    accent: '#759900',
    accentHover: '#8bb300',
    onAccent: '#0f1115',
    win: '#6cc04a',
    loss: '#e0524b',
    draw: '#c9a227',
  },
  {
    id: 'dracula',
    name: 'Dracula',
    scheme: 'dark',
    bg: '#282a36',
    surface: '#2f3142',
    surface2: '#3a3d52',
    border: '#44475a',
    text: '#f8f8f2',
    textDim: '#bcc0d8',
    textMuted: '#6272a4',
    accent: '#bd93f9',
    accentHover: '#caa6fb',
    onAccent: '#21222c',
    win: '#50fa7b',
    loss: '#ff5555',
    draw: '#f1fa8c',
  },
  {
    id: 'nord',
    name: 'Nord',
    scheme: 'dark',
    bg: '#2e3440',
    surface: '#343b4a',
    surface2: '#3b4252',
    border: '#4c566a',
    text: '#eceff4',
    textDim: '#c2cad6',
    textMuted: '#7b879c',
    accent: '#88c0d0',
    accentHover: '#9fd0de',
    onAccent: '#2e3440',
    win: '#a3be8c',
    loss: '#bf616a',
    draw: '#ebcb8b',
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    scheme: 'dark',
    bg: '#1d2021',
    surface: '#282828',
    surface2: '#32302f',
    border: '#3c3836',
    text: '#ebdbb2',
    textDim: '#c2b596',
    textMuted: '#928374',
    accent: '#fabd2f',
    accentHover: '#ffd152',
    onAccent: '#1d2021',
    win: '#b8bb26',
    loss: '#fb4934',
    draw: '#fe8019',
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    scheme: 'dark',
    bg: '#002b36',
    surface: '#073642',
    surface2: '#0a4250',
    border: '#0f5160',
    text: '#eee8d5',
    textDim: '#93a1a1',
    textMuted: '#657b83',
    accent: '#2aa198',
    accentHover: '#36c0b5',
    onAccent: '#002b36',
    win: '#859900',
    loss: '#dc322f',
    draw: '#b58900',
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    scheme: 'dark',
    bg: '#0b1622',
    surface: '#10202f',
    surface2: '#16293b',
    border: '#21384d',
    text: '#e4edf5',
    textDim: '#92a8bd',
    textMuted: '#5f7588',
    accent: '#36a3ff',
    accentHover: '#5bb6ff',
    onAccent: '#06121d',
    win: '#3ec98a',
    loss: '#ff6b6b',
    draw: '#f4c145',
  },
  {
    id: 'crimson',
    name: 'Crimson Night',
    scheme: 'dark',
    bg: '#161012',
    surface: '#1f1518',
    surface2: '#2a1c20',
    border: '#3a262b',
    text: '#f4e9eb',
    textDim: '#c4a6ac',
    textMuted: '#8a6b71',
    accent: '#e0405e',
    accentHover: '#f05a76',
    onAccent: '#180a0d',
    win: '#54c98a',
    loss: '#ff6b6b',
    draw: '#e8a33d',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    scheme: 'dark',
    bg: '#000000',
    surface: '#0a0f0a',
    surface2: '#111a11',
    border: '#1f2f1f',
    text: '#c8f7c5',
    textDim: '#76b576',
    textMuted: '#4a704a',
    accent: '#33ff66',
    accentHover: '#5cff85',
    onAccent: '#001400',
    win: '#33ff66',
    loss: '#ff5544',
    draw: '#ffd633',
  },
  {
    id: 'lichess-light',
    name: 'Paper Light',
    scheme: 'light',
    bg: '#f4f5f0',
    surface: '#ffffff',
    surface2: '#eceee6',
    border: '#d9dcd0',
    text: '#2b2b2b',
    textDim: '#5c6160',
    textMuted: '#8a8f88',
    accent: '#759900',
    accentHover: '#688700',
    onAccent: '#ffffff',
    win: '#4a9e2f',
    loss: '#c0392b',
    draw: '#b8860b',
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    scheme: 'light',
    bg: '#fdf6e3',
    surface: '#fffbf0',
    surface2: '#eee8d5',
    border: '#dcd6c0',
    text: '#586e75',
    textDim: '#657b83',
    textMuted: '#93a1a1',
    accent: '#268bd2',
    accentHover: '#1f7ab8',
    onAccent: '#ffffff',
    win: '#859900',
    loss: '#dc322f',
    draw: '#b58900',
  },
  {
    id: 'rose-light',
    name: 'Rose Quartz',
    scheme: 'light',
    bg: '#fbf1f3',
    surface: '#ffffff',
    surface2: '#f6e3e7',
    border: '#eccdd4',
    text: '#3a2a2f',
    textDim: '#7a5b63',
    textMuted: '#a98a92',
    accent: '#d6336c',
    accentHover: '#c02862',
    onAccent: '#ffffff',
    win: '#3f9e4d',
    loss: '#d6336c',
    draw: '#c98a1e',
  },
];

export const THEMES: Theme[] = SEEDS.map(createTheme);
export const DEFAULT_THEME_ID = 'midnight';

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
