/**
 * Paleta Araméa — tirada do próprio logótipo: fundo creme/rosado, verde
 * sálvia acinzentado das letras e do anel, e o dourado da conta do fio.
 */
export const palette = {
  sage: {
    50: '#F3F4EF',
    100: '#E6E8DF',
    200: '#CDD1C2',
    300: '#AEB39F',
    400: '#8E937F',
    500: '#6E7262',
    600: '#5A5E50',
    700: '#474A3F',
    800: '#34372F',
  },
  cream: {
    50: '#FFFDFB',
    100: '#FAF6F2',
    200: '#F3ECE5',
    300: '#E9DFD5',
  },
  blush: {
    100: '#F7EEEA',
    200: '#EDDDD5',
    400: '#C9A596',
  },
  gold: {
    300: '#E6D4AC',
    400: '#CFB27A',
    500: '#B8975F',
    600: '#977943',
  },
};

export const brand = {
  primary: palette.sage[500],
  primaryLight: palette.sage[400],
  primaryDark: palette.sage[600],
  secondary: palette.gold[500],
  tertiary: '#9B8A9E',
  success: '#6F9A74',
  info: '#7D93A6',
  warning: '#C4964F',
  error: '#B35C55',
  /** Anel fino do logótipo. */
  ring: '#A8A597',
  /** Conta dourada do coração de fio. */
  bead: palette.gold[400],
};

export const light = {
  background: palette.cream[100],
  surface: palette.cream[50],
  surfaceElevated: palette.cream[200],
  text: '#3D4036',
  textSecondary: '#6B6E62',
  textMuted: '#A09F94',
  border: '#ECE4DB',
  borderLight: '#F4EEE8',
  /** Cor de destaque para texto e ícones (legível em cada tema). */
  accent: palette.sage[500],
  accentSoft: palette.sage[100],
  blush: palette.blush[100],
  shadow: 'rgba(70, 72, 58, 0.08)',
  overlay: 'rgba(40, 42, 35, 0.4)',
};

export const dark: typeof light = {
  background: '#1C1D19',
  surface: '#25271F',
  surfaceElevated: '#2F3128',
  text: '#EEEBE3',
  textSecondary: '#BDBBAF',
  textMuted: '#8B8A80',
  border: '#383A31',
  borderLight: '#2F3129',
  accent: '#BFC3AE',
  accentSoft: '#34372C',
  blush: '#33302B',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.65)',
};

export const status = {
  Pendente: brand.warning,
  'Em Produção': brand.info,
  Concluída: brand.success,
  Entregue: brand.tertiary,
} as const;

export const channel = {
  WhatsApp: '#5E9C72',
  Instagram: '#B5707F',
} as const;

export const channelIcon: Record<string, 'logo-whatsapp' | 'logo-instagram'> = {
  WhatsApp: 'logo-whatsapp',
  Instagram: 'logo-instagram',
};
