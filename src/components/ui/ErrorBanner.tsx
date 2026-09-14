import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { brand } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { font } from '../../theme/typography';
import { Theme, useThemedStyles } from '../../theme/useThemedStyles';

/** Aviso de falha — para nunca confundir "falhou a ligação" com "não há nada". */
export function ErrorBanner({ message, onRetry, onDismiss }: { message: string; onRetry?: () => void; onDismiss?: () => void }) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={18} color={brand.error} />
      <Text style={styles.text}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} hitSlop={8} style={styles.action}>
          <Text style={styles.actionText}>Tentar</Text>
        </Pressable>
      )}
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={16} color={theme.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: brand.error + '14',
      borderRadius: radius.md,
      marginHorizontal: spacing.md,
      marginVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    text: { flex: 1, fontSize: font.size.xs, color: t.text, fontWeight: '600' },
    action: { backgroundColor: brand.error, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 5 },
    actionText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  });
