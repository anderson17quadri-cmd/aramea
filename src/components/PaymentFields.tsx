import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Input } from './FormFields';
import { brand } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { font } from '../theme/typography';
import { Theme, useThemedStyles } from '../theme/useThemedStyles';
import { formatMoney, parseDecimal } from '../utils/format';

interface Props {
  /** Já somado (produtos + especial) — só para mostrar. */
  price: number;
  deposit: string;
  cost: string;
  paid: boolean;
  onChange: (field: 'deposit' | 'cost', value: string) => void;
  onPaidChange: (paid: boolean) => void;
}

/** Preço, sinal, custo e pagamento — igual ao criar e ao editar. */
export function PaymentFields({ price, deposit, cost, paid, onChange, onPaidChange }: Props) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const d = parseDecimal(deposit);
  const c = parseDecimal(cost);
  const falta = paid ? 0 : Math.max(0, price - d);
  const lucro = price - c;

  return (
    <View>
      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>Preço total</Text>
        <Text style={styles.totalValue}>{formatMoney(price)}</Text>
        <Text style={styles.totalHint}>Soma automática dos produtos e do especial</Text>
      </View>

      <View style={styles.pairRow}>
        <View style={styles.pairItem}>
          <Input label="Sinal recebido (€)" placeholder="0,00" value={deposit} onChange={(t) => onChange('deposit', t)} keyboardType="decimal-pad" />
        </View>
        <View style={styles.pairItem}>
          <Input label="Custo (€)" placeholder="Material" value={cost} onChange={(t) => onChange('cost', t)} keyboardType="decimal-pad" />
        </View>
      </View>

      <Pressable style={styles.paidRow} onPress={() => onPaidChange(!paid)}>
        <View style={[styles.paidIcon, { backgroundColor: (paid ? brand.success : theme.textMuted) + '20' }]}>
          <Ionicons name={paid ? 'checkmark-circle' : 'time-outline'} size={20} color={paid ? brand.success : theme.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.paidTitle}>{paid ? 'Totalmente paga' : 'Por liquidar'}</Text>
          <Text style={styles.paidSub}>{paid ? 'O valor total já foi recebido' : 'Marca quando receberes o resto'}</Text>
        </View>
        <Switch
          value={paid}
          onValueChange={onPaidChange}
          trackColor={{ false: theme.border, true: brand.success + '90' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={theme.border}
        />
      </Pressable>

      {(price > 0 || c > 0) && (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Falta receber</Text>
            <Text style={[styles.summaryValue, { color: falta > 0 ? brand.warning : brand.success }]}>{formatMoney(falta)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Lucro</Text>
            <Text style={[styles.summaryValue, { color: c > 0 ? (lucro >= 0 ? brand.success : brand.error) : theme.textMuted }]}>
              {c > 0 ? formatMoney(lucro) : '— sem custo'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    totalBox: {
      backgroundColor: t.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: t.border,
      padding: spacing.md,
      alignItems: 'center',
    },
    totalLabel: { fontSize: font.size.xs, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1.2 },
    totalValue: { fontFamily: font.serifBold, fontSize: 38, color: t.accent, marginTop: 2 },
    totalHint: { fontSize: font.size.xs, color: t.textMuted },
    pairRow: { flexDirection: 'row', gap: spacing.sm },
    pairItem: { flex: 1 },
    paidRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: t.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.border,
      padding: spacing.sm + 2,
      marginTop: spacing.md,
    },
    paidIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    paidTitle: { fontSize: font.size.sm, fontWeight: '800', color: t.text },
    paidSub: { fontSize: font.size.xs, color: t.textMuted, marginTop: 1 },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.accentSoft,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginTop: spacing.sm,
    },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryDivider: { width: 1, height: 28, backgroundColor: t.border },
    summaryLabel: { fontSize: font.size.xs, color: t.textSecondary, fontWeight: '700' },
    summaryValue: { fontSize: font.size.base, fontWeight: '900', marginTop: 2 },
  });
