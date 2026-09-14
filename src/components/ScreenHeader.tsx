import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { font } from '../theme/typography';
import { Theme, useThemedStyles } from '../theme/useThemedStyles';

/** Título grande das abas (Encomendas, Clientes, Financeiro). */
export function TabHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.tabHeader, { paddingTop: insets.top + spacing.sm }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.tabTitle}>{title}</Text>
        {subtitle ? <Text style={styles.tabSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** Barra dos ecrãs empilhados: voltar · título · ação. */
export function StackHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.stackHeader, { paddingTop: insets.top + spacing.xs }]}>
      <Pressable onPress={onBack ?? (() => router.back())} hitSlop={12} style={styles.side} accessibilityLabel="Voltar">
        <Ionicons name="chevron-back" size={26} color={theme.accent} />
      </Pressable>
      <View style={styles.stackCenter}>
        <Text style={styles.stackTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.stackSub}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    tabHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: spacing.md + 4,
      paddingBottom: spacing.sm,
      backgroundColor: t.background,
    },
    tabTitle: { fontFamily: font.serifBold, fontSize: 36, color: t.text, lineHeight: 42 },
    tabSub: { fontSize: font.size.sm, color: t.textMuted, fontWeight: '600', marginTop: -2 },
    stackHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
      backgroundColor: t.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    side: { width: 56, paddingHorizontal: spacing.xs, justifyContent: 'center' },
    stackCenter: { flex: 1, alignItems: 'center' },
    stackTitle: { fontFamily: font.serifBold, fontSize: 24, color: t.text },
    stackSub: { fontSize: font.size.xs, color: t.textMuted, fontWeight: '600', marginTop: -2 },
  });
