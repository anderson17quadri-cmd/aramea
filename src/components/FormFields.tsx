import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { KeyboardTypeOptions, Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { brand } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { font } from '../theme/typography';
import { Theme, useThemedStyles } from '../theme/useThemedStyles';

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {right}
    </View>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.label}>{children}</Text>;
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  keyboardType,
  error,
  containerStyle,
  multiline,
  autoCapitalize,
  onFocus,
  onBlur,
}: {
  label?: string;
  placeholder: string;
  value: string;
  onChange: (t: string) => void;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, multiline && styles.textArea]}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          autoCapitalize={autoCapitalize}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function QtyRow({
  label,
  sub,
  value,
  onChangeValue,
  onRemove,
}: {
  label: string;
  sub?: string | null;
  value: number;
  onChangeValue: (v: number) => void;
  onRemove?: () => void;
}) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.qtyRow}>
      <View style={styles.qtyInfo}>
        <Text style={styles.qtyLabel} numberOfLines={1}>
          {label}
        </Text>
        {sub ? <Text style={styles.qtySub}>{sub}</Text> : null}
      </View>
      <View style={styles.qtyCtrl}>
        <Pressable style={styles.qtyBtn} onPress={() => onChangeValue(Math.max(1, value - 1))} hitSlop={6}>
          <Ionicons name="remove" size={18} color={theme.accent} />
        </Pressable>
        <TextInput
          style={styles.qtyInput}
          value={value ? String(value) : ''}
          onChangeText={(t) => {
            const n = parseInt(t.replace(/\D/g, ''), 10);
            onChangeValue(Number.isFinite(n) ? n : 0);
          }}
          keyboardType="number-pad"
          selectTextOnFocus
          maxLength={4}
          textAlign="center"
        />
        <Pressable style={styles.qtyBtn} onPress={() => onChangeValue(value + 1)} hitSlop={6}>
          <Ionicons name="add" size={18} color={theme.accent} />
        </Pressable>
      </View>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} style={{ marginLeft: 2 }}>
          <Ionicons name="close" size={18} color={theme.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function DateBox({
  value,
  onChange,
  placeholder,
  maxLen,
  wide,
  error,
}: {
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  maxLen: number;
  wide?: boolean;
  error?: boolean;
}) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.dateBox, wide && styles.dateBoxWide, error && styles.inputError]}>
      <TextInput
        style={styles.dateInput}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, maxLen))}
        keyboardType="number-pad"
        maxLength={maxLen}
        textAlign="center"
      />
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    section: { fontFamily: font.serifBold, fontSize: 23, color: t.text },
    label: { fontSize: font.size.sm, fontWeight: '600', color: t.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
    inputWrap: { backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border },
    inputError: { borderColor: brand.error },
    input: { fontSize: font.size.base, color: t.text, paddingHorizontal: spacing.md, paddingVertical: 13, minHeight: 50 },
    textArea: { minHeight: 96 },
    error: { color: brand.error, fontSize: font.size.xs, marginTop: 3, marginLeft: 4 },
    qtyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.border,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 8,
      gap: 10,
    },
    qtyInfo: { flex: 1, minWidth: 0 },
    qtyLabel: { fontSize: 15, fontWeight: '600', color: t.text },
    qtySub: { fontSize: 11, color: t.textMuted, marginTop: 1 },
    qtyCtrl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    qtyBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.accentSoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    qtyInput: {
      fontSize: 16,
      fontWeight: '700',
      color: t.text,
      minWidth: 40,
      paddingVertical: 4,
      borderRadius: radius.sm,
      backgroundColor: t.background,
    },
    dateBox: {
      backgroundColor: t.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.border,
      width: 64,
      height: 50,
      justifyContent: 'center',
    },
    dateBoxWide: { width: 90 },
    dateInput: { fontSize: 18, fontWeight: '600', color: t.text },
  });
