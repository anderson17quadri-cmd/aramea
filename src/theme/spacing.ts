export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  /** Cards: 18px, o raio "Soft Luxury". */
  lg: 18,
  xl: 22,
  '2xl': 30,
  full: 9999,
} as const;

/** Sombra suave (boxShadow funciona igual em iOS, Android e web). */
export const softShadow = { boxShadow: '0px 6px 18px rgba(70, 72, 58, 0.08)' } as const;
export const liftShadow = { boxShadow: '0px 10px 26px rgba(70, 72, 58, 0.22)' } as const;
