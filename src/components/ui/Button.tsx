import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { brand } from '../../theme/colors';
import { liftShadow, radius, spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { font } from '../../theme/typography';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'soft' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', size = 'md', icon, loading, disabled, style }: ButtonProps) {
  const { theme } = useTheme();
  const off = disabled || loading;

  const palette = {
    primary: { bg: brand.primary, fg: '#FFFFFF', border: brand.primary },
    outline: { bg: 'transparent', fg: theme.accent, border: theme.accent },
    soft: { bg: theme.accentSoft, fg: theme.accent, border: theme.accentSoft },
    danger: { bg: brand.error + '14', fg: brand.error, border: brand.error + '14' },
  }[variant];

  const height = size === 'sm' ? 38 : size === 'lg' ? 56 : 50;
  const textSize = size === 'sm' ? font.size.sm : size === 'lg' ? font.size.md : font.size.base;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        { minHeight: height, backgroundColor: palette.bg, borderColor: palette.border },
        size === 'sm' && { borderRadius: radius.full, paddingHorizontal: spacing.md },
        variant === 'primary' && liftShadow,
        off && { opacity: 0.5 },
        pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={textSize + 3} color={palette.fg} /> : null}
          <Text style={[styles.text, { color: palette.fg, fontSize: textSize }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.2,
    paddingHorizontal: spacing.lg,
  },
  text: { fontWeight: '700', letterSpacing: 0.2 },
});
