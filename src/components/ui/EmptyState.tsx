import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { font } from '../../theme/typography';
import { Theme, useThemedStyles } from '../../theme/useThemedStyles';
import { IconName } from './Button';

export function EmptyState({ icon = 'flower-outline', title, subtitle }: { icon?: IconName; title: string; subtitle?: string }) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={30} color={theme.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { alignItems: 'center', paddingVertical: spacing['2xl'], paddingHorizontal: spacing.xl },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: t.blush,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: { fontFamily: font.serifBold, fontSize: 22, color: t.text, textAlign: 'center' },
    subtitle: { fontSize: font.size.sm, color: t.textSecondary, textAlign: 'center', marginTop: 2, lineHeight: 19 },
  });
