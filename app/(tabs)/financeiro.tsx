import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeartThread } from '../../src/components/Logo';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { errorMessage } from '../../src/services/errors';
import { shareMonthlyCsv, shareMonthlyPdf } from '../../src/services/export';
import { FinanceReport, getFinanceReport } from '../../src/services/finance';
import { brand, channel as channelColors, channelIcon, status as statusColors } from '../../src/theme/colors';
import { radius, softShadow, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/ThemeContext';
import { font } from '../../src/theme/typography';
import { Theme, useThemedStyles } from '../../src/theme/useThemedStyles';
import { notify } from '../../src/utils/alert';
import { formatDate, formatMoney, monthName } from '../../src/utils/format';

export default function FinanceScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const today = new Date();
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [ano, setAno] = useState(today.getFullYear());
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (spinner: boolean) => {
    if (spinner) setLoading(true);
    setError(null);
    try {
      setReport(await getFinanceReport(ano, mes));
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível carregar o relatório.'));
    } finally {
      setLoading(false);
    }
  }, [ano, mes]);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  const nav = (dir: number) => {
    let nm = mes + dir;
    let ny = ano;
    if (nm > 12) {
      nm = 1;
      ny++;
    }
    if (nm < 1) {
      nm = 12;
      ny--;
    }
    setMes(nm);
    setAno(ny);
  };

  const exportar = async (formato: 'pdf' | 'csv') => {
    if (!report) return;
    try {
      setExporting(true);
      if (formato === 'pdf') await shareMonthlyPdf(report.orders, report.current, ano, mes);
      else await shareMonthlyCsv(report.orders, ano, mes);
    } catch (e) {
      notify('Exportar', errorMessage(e, 'Não foi possível gerar o ficheiro.'));
    } finally {
      setExporting(false);
    }
  };

  const s = report?.current;
  const maxDaily = s ? Math.max(...s.daily.map((d) => d.revenue), 1) : 1;
  const changePct = report?.changePct ?? null;
  const up = (changePct ?? 0) >= 0;
  const maxProduct = s?.topProducts[0]?.count ?? 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <Pressable onPress={() => nav(-1)} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.accent} />
        </Pressable>
        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>
            {monthName(mes)} <Text style={styles.navYear}>{ano}</Text>
          </Text>
          <Text style={styles.navSub}>Relatório mensal</Text>
        </View>
        <Pressable onPress={() => nav(1)} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={theme.accent} />
        </Pressable>
      </View>

      {error && <ErrorBanner message={error} onRetry={() => load(true)} />}

      {loading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      ) : !s || s.orderCount === 0 ? (
        <EmptyState icon="wallet-outline" title="Sem movimento" subtitle="Nenhuma encomenda neste mês" />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load(false);
                setRefreshing(false);
              }}
              tintColor={theme.accent}
              colors={[brand.primary]}
            />
          }
        >
          <View style={styles.exportRow}>
            <Pressable style={styles.exportBtn} onPress={() => exportar('pdf')} disabled={exporting}>
              <Ionicons name="document-text-outline" size={15} color={theme.accent} />
              <Text style={styles.exportText}>PDF</Text>
            </Pressable>
            <Pressable style={styles.exportBtn} onPress={() => exportar('csv')} disabled={exporting}>
              <Ionicons name="grid-outline" size={15} color={theme.accent} />
              <Text style={styles.exportText}>Excel</Text>
            </Pressable>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Receita do mês</Text>
            <Text style={styles.heroValue}>{formatMoney(s.revenue)}</Text>
            <HeartThread width={90} color="rgba(255,255,255,0.75)" />
            <Text style={styles.heroPieces}>
              {s.orderCount} encomendas · {s.pieces} peças feitas à mão
            </Text>
            {changePct !== null && (
              <View style={styles.trend}>
                <Ionicons name={up ? 'trending-up' : 'trending-down'} size={14} color="#FFF" />
                <Text style={styles.trendText}>
                  {up ? '+' : ''}
                  {changePct.toFixed(0)}% vs {monthName(mes === 1 ? 12 : mes - 1)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.splitRow}>
            <View style={[styles.splitCard, { borderColor: brand.success + '55' }]}>
              <View style={styles.splitTop}>
                <Ionicons name="checkmark-circle" size={15} color={brand.success} />
                <Text style={[styles.splitLabel, { color: brand.success }]}>Recebido</Text>
              </View>
              <Text style={styles.splitValue}>{formatMoney(s.received)}</Text>
            </View>
            <View style={[styles.splitCard, { borderColor: brand.warning + '55' }]}>
              <View style={styles.splitTop}>
                <Ionicons name="time" size={15} color={brand.warning} />
                <Text style={[styles.splitLabel, { color: brand.warning }]}>Por receber</Text>
              </View>
              <Text style={styles.splitValue}>{formatMoney(s.pending)}</Text>
            </View>
          </View>

          <View style={styles.miniRow}>
            <Mini styles={styles} value={String(s.orderCount)} label="Encomendas" />
            <Mini styles={styles} value={formatMoney(s.averageTicket)} label="Valor médio" />
            <Mini styles={styles} value={formatMoney(s.profit)} label="Lucro" />
          </View>

          {(s.missingPrice > 0 || s.missingCost > 0) && (
            <View style={styles.warning}>
              <Ionicons name="alert-circle-outline" size={18} color={brand.warning} />
              <Text style={styles.warningText}>
                {s.missingPrice > 0 ? `${s.missingPrice} encomenda${s.missingPrice !== 1 ? 's' : ''} sem preço. ` : ''}
                {s.missingCost > 0 ? `${s.missingCost} sem custo — o lucro real é menor.` : ''}
              </Text>
            </View>
          )}

          <Text style={styles.section}>Por canal</Text>
          <View style={styles.card}>
            {s.byChannel.map((b) => {
              const color = channelColors[b.key as keyof typeof channelColors] ?? theme.textMuted;
              const pct = s.orderCount ? (b.count / s.orderCount) * 100 : 0;
              return (
                <View key={b.key} style={styles.row}>
                  <View style={[styles.rank, { backgroundColor: color + '1E' }]}>
                    <Ionicons name={channelIcon[b.key] ?? 'chatbubble-outline'} size={15} color={color} />
                  </View>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowName}>{b.label}</Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowValue, { color }]}>{formatMoney(b.revenue)}</Text>
                    <Text style={styles.rowSub}>
                      {b.count} enc. · {Math.round(pct)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {s.topProducts.length > 0 && (
            <>
              <Text style={styles.section}>Produtos mais pedidos</Text>
              <View style={styles.card}>
                {s.topProducts.map((b) => (
                  <View key={b.key} style={styles.row}>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowName}>{b.label}</Text>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${(b.count / maxProduct) * 100}%` }]} />
                      </View>
                    </View>
                    <Text style={styles.rowValue}>{b.count} un.</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={styles.section}>Receita por categoria</Text>
          <View style={styles.card}>
            {s.byCategory.map((b) => (
              <View key={b.key} style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowName}>{b.label === 'Especial' ? '✦ Especial' : b.label}</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${s.revenue > 0 ? (b.revenue / s.revenue) * 100 : 0}%`, backgroundColor: brand.secondary }]} />
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowValue}>{formatMoney(b.revenue)}</Text>
                  <Text style={styles.rowSub}>{b.count} enc.</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.section}>Receita por dia</Text>
          <View style={styles.card}>
            <View style={styles.chart}>
              {s.daily.map((d) => (
                <View key={d.day} style={styles.barSlot}>
                  <View style={[styles.bar, { height: Math.max(2, (d.revenue / maxDaily) * 90), backgroundColor: d.revenue > 0 ? brand.primary : theme.borderLight }]} />
                </View>
              ))}
            </View>
            <View style={styles.chartAxis}>
              <Text style={styles.axisText}>1</Text>
              <Text style={styles.axisText}>{Math.round(s.daily.length / 2)}</Text>
              <Text style={styles.axisText}>{s.daily.length}</Text>
            </View>
          </View>

          {s.debtors.length > 0 && (
            <>
              <Text style={styles.section}>Quem falta pagar</Text>
              <View style={styles.card}>
                {s.debtors.map((d) => (
                  <Pressable key={d.id} style={styles.row} onPress={() => router.push(`/order/${d.id}`)}>
                    <View style={[styles.rank, { backgroundColor: brand.warning + '22' }]}>
                      <Ionicons name="cash-outline" size={14} color={brand.warning} />
                    </View>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {d.clientName}
                      </Text>
                      <Text style={styles.rowSub}>Entrega {formatDate(d.deliveryDate)}</Text>
                    </View>
                    <Text style={[styles.rowValue, { color: brand.warning }]}>{formatMoney(d.owed)}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={styles.section}>Melhores clientes</Text>
          <View style={styles.card}>
            {s.topClients.map((b, i) => (
              <View key={b.key} style={styles.row}>
                <View style={[styles.rank, i === 0 && { backgroundColor: brand.secondary + '30' }]}>
                  <Text style={[styles.rankText, i === 0 && { color: brand.secondary }]}>{i + 1}</Text>
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {b.label}
                  </Text>
                  <Text style={styles.rowSub}>
                    {b.count} encomenda{b.count !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={styles.rowValue}>{formatMoney(b.revenue)}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>Por estado</Text>
          <View style={styles.card}>
            {s.byStatus.map((b) => (
              <View key={b.key} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: statusColors[b.key as keyof typeof statusColors] ?? brand.primary }]} />
                <Text style={[styles.rowName, { flex: 1 }]}>{b.label}</Text>
                <Text style={styles.rowSub}>{b.count}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Mini({ styles, value, label }: { styles: ReturnType<typeof makeStyles>; value: string; label: string }) {
  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    navBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' },
    navCenter: { alignItems: 'center' },
    navTitle: { fontFamily: font.serifBold, fontSize: 30, color: t.text },
    navYear: { color: t.textMuted },
    navSub: { fontSize: 11, color: t.textMuted, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginTop: -2 },
    scroll: { padding: spacing.md, paddingBottom: 60 },
    exportRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', marginBottom: spacing.sm },
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: t.accentSoft,
      borderRadius: radius.full,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    exportText: { fontSize: 12, fontWeight: '800', color: t.accent },
    heroCard: {
      backgroundColor: brand.primary,
      borderRadius: radius.xl,
      padding: spacing.lg,
      alignItems: 'center',
      gap: 4,
      boxShadow: '0px 12px 28px rgba(70, 72, 58, 0.28)',
    },
    heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
    heroValue: { fontFamily: font.serifBold, color: '#FFF', fontSize: 46 },
    heroPieces: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 2 },
    trend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: spacing.sm,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    trendText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
    splitRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    splitCard: { flex: 1, backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1.5 },
    splitTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    splitLabel: { fontSize: font.size.xs, fontWeight: '800' },
    splitValue: { fontFamily: font.serifBold, fontSize: 24, color: t.text, marginTop: 2 },
    miniRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    miniCard: { flex: 1, backgroundColor: t.surface, borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: t.border },
    miniValue: { fontFamily: font.serifBold, fontSize: 20, color: t.text },
    miniLabel: { fontSize: font.size.xs, color: t.textMuted, fontWeight: '600', marginTop: 2 },
    warning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: brand.warning + '18',
      borderRadius: radius.md,
      padding: spacing.sm,
      marginTop: spacing.md,
    },
    warningText: { flex: 1, fontSize: font.size.xs, color: t.textSecondary, fontWeight: '600' },
    section: { fontFamily: font.serifBold, fontSize: 23, color: t.text, marginTop: spacing.lg, marginBottom: spacing.sm },
    card: { backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, overflow: 'hidden', ...softShadow },
    chart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, paddingHorizontal: spacing.sm, paddingTop: spacing.sm, gap: 1 },
    barSlot: { flex: 1, justifyContent: 'flex-end' },
    bar: { borderTopLeftRadius: 2, borderTopRightRadius: 2, width: '100%' },
    chartAxis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, paddingTop: 4 },
    axisText: { fontSize: 10, color: t.textMuted, fontWeight: '600' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    rowMain: { flex: 1, minWidth: 0 },
    rowName: { fontSize: 14, fontWeight: '700', color: t.text },
    rowSub: { fontSize: 11, color: t.textMuted, fontWeight: '600', marginTop: 2 },
    rowRight: { alignItems: 'flex-end' },
    rowValue: { fontSize: 14, fontWeight: '800', color: t.accent },
    progressTrack: { height: 5, borderRadius: 3, backgroundColor: t.borderLight, marginTop: 6, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3, backgroundColor: brand.primary },
    rank: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.borderLight, justifyContent: 'center', alignItems: 'center' },
    rankText: { fontSize: 12, fontWeight: '900', color: t.textSecondary },
  });
