import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { OrderCard } from '../../src/components/OrderCard';
import { TabHeader } from '../../src/components/ScreenHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { useOrders } from '../../src/hooks/useOrders';
import { brand, status as statusColors } from '../../src/theme/colors';
import { liftShadow, radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/ThemeContext';
import { font } from '../../src/theme/typography';
import { Theme, useThemedStyles } from '../../src/theme/useThemedStyles';
import { Order, STATUSES } from '../../src/types';
import { addDays, toISODate, todayISO } from '../../src/utils/format';

type PeriodKey = 'proximas' | 'todos' | 'mes' | 'passadas';

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'proximas', label: 'Próximas' },
  { key: 'mes', label: 'Este mês' },
  { key: 'passadas', label: 'Passadas' },
  { key: 'todos', label: 'Todas as datas' },
];

function periodRange(period: PeriodKey): { from?: string; to?: string } {
  const hoje = todayISO();
  switch (period) {
    case 'proximas':
      return { from: hoje };
    case 'passadas':
      return { to: addDays(hoje, -1) };
    case 'mes': {
      const d = new Date();
      return { from: toISODate(new Date(d.getFullYear(), d.getMonth(), 1)), to: toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
    }
    default:
      return {};
  }
}

export default function OrdersScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { search, error, clearError } = useOrders();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [period, setPeriod] = useState<PeriodKey>('proximas');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string, st: string, per: PeriodKey) => {
    setLoading(true);
    const { from, to } = periodRange(per);
    const data = await search(q, st, from, to);
    // Sem filtro de estado, as concluídas/entregues saem da lista principal.
    const visible = st === 'Todas' && per === 'proximas' ? data.filter((o) => o.status !== 'Concluída' && o.status !== 'Entregue') : data;
    setResults(per === 'passadas' || per === 'todos' ? [...visible].reverse() : visible);
    setLoading(false);
  }, [search]);

  const handleSearch = (t: string) => {
    setQuery(t);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(t, statusFilter, period), 300);
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useFocusEffect(
    useCallback(() => {
      doSearch(query, statusFilter, period);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doSearch, statusFilter, period]),
  );

  const filtrosAtivos = statusFilter !== 'Todas' || period !== 'proximas';

  return (
    <View style={styles.container}>
      <TabHeader title="Encomendas" subtitle={`${results.length} encontrada${results.length !== 1 ? 's' : ''}`} />

      {error && <ErrorBanner message={error} onRetry={() => doSearch(query, statusFilter, period)} onDismiss={clearError} />}

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={19} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar por cliente…"
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={handleSearch}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => handleSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={19} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} keyboardShouldPersistTaps="handled">
          {filtrosAtivos && (
            <Pressable
              style={[styles.chip, { backgroundColor: theme.textMuted, borderColor: theme.textMuted }]}
              onPress={() => {
                setStatusFilter('Todas');
                setPeriod('proximas');
              }}
            >
              <Ionicons name="close" size={13} color="#FFF" />
              <Text style={[styles.chipText, { color: '#FFF' }]}>Limpar</Text>
            </Pressable>
          )}
          {PERIODS.map((p) => {
            const active = period === p.key;
            return (
              <Pressable key={p.key} style={[styles.chip, active && { backgroundColor: brand.primary, borderColor: brand.primary }]} onPress={() => setPeriod(p.key)}>
                <Text style={[styles.chipText, active && { color: '#FFF' }]}>{p.label}</Text>
              </Pressable>
            );
          })}
          <View style={styles.chipDivider} />
          {['Todas', ...STATUSES].map((st) => {
            const active = statusFilter === st;
            const c = statusColors[st as keyof typeof statusColors] ?? brand.primary;
            return (
              <Pressable key={st} style={[styles.chip, active && { backgroundColor: c, borderColor: c }]} onPress={() => setStatusFilter(st)}>
                <Text style={[styles.chipText, active && { color: '#FFF' }]}>{st}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderCard order={item} onPress={() => router.push(`/order/${item.id}`)} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="search-outline"
              title="Nenhuma encomenda"
              subtitle={query || filtrosAtivos ? 'Tenta outro nome ou limpa os filtros' : 'Toca no + para criar a primeira'}
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshing={loading}
        onRefresh={() => doSearch(query, statusFilter, period)}
        keyboardShouldPersistTaps="handled"
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.93 }] }]}
        onPress={() => router.push('/new-order')}
        accessibilityLabel="Nova encomenda"
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </Pressable>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: t.surface,
      marginHorizontal: spacing.md,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: t.border,
      height: 50,
    },
    searchInput: { flex: 1, fontSize: font.size.base, color: t.text, height: '100%' },
    filterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    chipText: { fontSize: 12, fontWeight: '700', color: t.textSecondary },
    chipDivider: { width: 1, height: 20, backgroundColor: t.border, marginHorizontal: 2 },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 22,
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...liftShadow,
    },
  });
