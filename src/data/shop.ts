export type ThemeId = 'dark' | 'light';

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  price: number;
  icon: string;
  className: string;
  swatches: string[];
  vars: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    id: 'dark',
    name: 'Plain Dark',
    description: 'Minimalist true black with restrained orange hairline accents.',
    price: 0,
    icon: '☾',
    className: 'theme-dark',
    swatches: ['#000000', '#FF7A1A', '#F4F1EC'],
    vars: {
      '--bg': '#000000',
      '--surface': '#0C0C0C',
      '--surface-high': '#161616',
      '--line': '#3A2412',
      '--accent': '#FF7A1A',
      '--text': '#F4F1EC',
      '--text-muted': '#A8A29E',
      '--text-faint': '#8A8A8A',
      '--spark': '#FFC24B',
      '--pass': '#6EE7B7',
      '--fail': '#FF6B8B',
      '--fail-bg': '#1F0D14',
      '--fail-border': '#6B1F3A',
    },
  },
  {
    id: 'light',
    name: 'Plain Light',
    description: 'Clean high contrast daylight theme with warm paper tones.',
    price: 0,
    icon: '☼',
    className: 'theme-light',
    swatches: ['#FAF7F2', '#D9540A', '#1A1612'],
    vars: {
      '--bg': '#FAF7F2',
      '--surface': '#FFFFFF',
      '--surface-high': '#F1ECE4',
      '--line': '#E6D9CB',
      '--accent': '#D9540A',
      '--text': '#1A1612',
      '--text-muted': '#5E564E',
      '--text-faint': '#78716C',
      '--spark': '#B77A00',
      '--pass': '#0F8A5F',
      '--fail': '#C73458',
      '--fail-bg': '#FFF1F4',
      '--fail-border': '#F4C0CD',
    },
  },
];

export const THEME_BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));
