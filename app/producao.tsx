import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionTitle } from '../src/components/FormFields';
import { HeartThread } from '../src/components/Logo';
import { StackHeader } from '../src/components/ScreenHeader';
import { EmptyState } from '../src/components/ui/EmptyState';
import { ErrorBanner } from '../src/components/ui/ErrorBanner';
import { StatusChip } from '../src/components/ui/StatusChip';
import { getOrdersByDate } from '../src/services/database';
import { errorMessage } from '../src/services/errors';
import { buildProductionPlan, ProductionPlan } from '../src/services/production';
import { brand } from '../src/theme/colors';
import { radius, softShadow, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/ThemeContext';
import { font } from '../src/theme/typography';
import { Theme, useThemedStyles } from '../src/theme/useThemedStyles';
import { capitalize, formatDateLong, todayISO } from '../src/utils/format';

export default function ProductionScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const day = typeof date === 'string' && date ? date : todayISO();

  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlan(buildProductionPlan(await getOrdersByDate(day), day));
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível carregar a produção do dia.'));
    } finally {
      setLoading(false);
    }
  }, [day]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <StackHeader title="Produção" subtitle={capitalize(formatDateLong(day))} />
      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      ) : !plan || plan.orderCount === 0 ? (
        <EmptyState icon="leaf-outline" title="Nada para fazer" subtitle="Sem encomendas por entregar neste dia" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{plan.orderCount}</Text>
              <Text style={styles.summaryLabel}>encomendas</Text>
            </View>
            <HeartThread width={70} color="rgba(255,255,255,0.8)" />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{plan.totalPieces}</Text>
              <Text style={styles.summaryLabel}>peças a fazer</Text>
            </View>
          </View>

          {plan.products.length > 0 && (
            <>
              <SectionTitle>Por produto</SectionTitle>
              <View style={styles.card}>
                {plan.products.map((l, i) => (
                  <View key={l.key} style={[styles.line, i > 0 && styles.lineBorder]}>
                    <View style={styles.qtyBox}>
                      <Text style={styles.qtyText}>{l.qty}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.lineLabel}>{l.label}</Text>
                      <Text style={styles.lineClients} numberOfLines={2}>
                        {l.category ? `${l.category} · ` : ''}
                        {l.clients.join(', ')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {plan.especiais.length > 0 && (
            <>
              <SectionTitle>✦ Especiais</SectionTitle>
              <View style={styles.card}>
                {plan.especiais.map((e, i) => (
                  <Pressable key={e.id} style={[styles.especialRow, i > 0 && styles.lineBorder]} onPress={() => router.push(`/order/${e.id}`)}>
                    <Text style={styles.client}>
                      {e.clientName}
                      {e.deliveryTime ? <Text style={styles.time}>{`  ·  ${e.deliveryTime}`}</Text> : null}
                    </Text>
                    <Text style={styles.especialText}>{e.especial}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <SectionTitle>Entregas do dia</SectionTitle>
          <View style={styles.card}>
            {plan.schedule.map((s, i) => (
              <Pressable key={s.id} style={[styles.line, i > 0 && styles.lineBorder]} onPress={() => router.push(`/order/${s.id}`)}>
                <View style={styles.timePill}>
                  <Ionicons name="time-outline" size={12} color={theme.accent} />
                  <Text style={styles.timeText}>{s.deliveryTime ?? '--:--'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.client} numberOfLines={1}>
                    {s.clientName}
                  </Text>
                  <Text style={styles.lineClients} numberOfLines={1}>
                    {s.summary}
                  </Text>
                </View>
                <StatusChip status={s.status} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: brand.primary,
      borderRadius: radius.xl,
      padding: spacing.lg,
      boxShadow: '0px 12px 28px rgba(70, 72, 58, 0.25)',
    },
    summaryItem: { alignItems: 'center' },
    summaryValue: { fontFamily: font.serifBold, fontSize: 40, color: '#FFF' },
    summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 0.6 },
    card: { backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, overflow: 'hidden', ...softShadow },
    line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12 },
    lineBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
    qtyBox: { minWidth: 44, paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.md, backgroundColor: t.accentSoft, alignItems: 'center' },
    qtyText: { fontFamily: font.serifBold, fontSize: 22, color: t.accent },
    lineLabel: { fontSize: 15, fontWeight: '700', color: t.text },
    lineClients: { fontSize: 12, color: t.textMuted, marginTop: 2 },
    especialRow: { paddingHorizontal: spacing.md, paddingVertical: 12 },
    client: { fontSize: 15, fontWeight: '800', color: t.text },
    time: { fontSize: 13, fontWeight: '600', color: t.textMuted },
    especialText: { fontSize: 14, color: t.textSecondary, marginTop: 3, lineHeight: 20 },
    timePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: t.accentSoft, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4 },
    timeText: { fontSize: 12, fontWeight: '800', color: t.accent },
  });
