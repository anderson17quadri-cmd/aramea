import { useMemo } from 'react';
import { light } from './colors';
import { useTheme } from './ThemeContext';

export type Theme = typeof light;

/** Cria as folhas de estilo a partir do tema ativo (claro/escuro). */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const { theme } = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
