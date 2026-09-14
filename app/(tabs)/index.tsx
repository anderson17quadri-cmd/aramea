import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../../src/components/Logo';
import { OrderCard } from '../../src/components/OrderCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { useOrders } from '../../src/hooks/useOrders';
import { supabaseConfigured } from '../../src/services/supabase';
import { brand, status as statusColors } from '../../src/theme/colors';
import { liftShadow, radius, softShadow, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/ThemeContext';
import { font } from '../../src/theme/typography';
import { Theme, useThemedStyles } from '../../src/theme/useThemedStyles';
import { MarkedDates, Order } from '../../src/types';
import { capitalize, formatDateLong, formatMoney, MONTHS, todayISO } from '../../src/utils/format';

LocaleConfig.locales['pt-pt'] = {
  monthNames: MONTHS,
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: 'Hoje',
};
LocaleConfig.defaultLocale = 'pt-pt';

const makeCalTheme = (t: Theme) => ({
  backgroundColor: 'transparent',
  calendarBackground: 'transparent',
  textSectionTitleColor: t.textMuted,
  selectedDayBackgroundColor: brand.primary,
  selectedDayTextColor: '#FFFFFF',
  todayTextColor: brand.secondary,
  dayTextColor: t.text,
  textDisabledColor: t.border,
  monthTextColor: t.text,
  arrowColor: t.accent,
  textMonthFontFamily: font.serifBold,
  textMonthFontSize: 24,
  textDayFontWeight: '600' as const,
  textDayFontSize: 14,
  textDayHeaderFontWeight: '700' as const,
  textDayHeaderFontSize: 11,
});

function parseYearMonth(dateStr: string) {
  const [y, m] = dateStr.split('-');
  return { year: parseInt(y, 10), month: parseInt(m, 10) };
}

export default function HomeScreen() {
  const { theme, isDark, toggle } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const calTheme = useThemedStyles(makeCalTheme);
  const insets = useSafeAreaInsets();
  const { error, clearError, getByDate, getCounts, getMarkedDates } = useOrders();

  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(today);
  const [dayOrders, setDayOrders] = useState<Order[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [counts, setCounts] = useState({ pending: 0, production: 0 });
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const latestDate = useRef(today);

  const { year, month } = useMemo(() => parseYearMonth(currentMonth), [currentMonth]);

  const loadMarks = useCallback(async (y: number, m: number) => {
    setMarkedDates(await getMarkedDates(y, m));
  }, [getMarkedDates]);

  const loadDay = useCallback(async (date: string) => {
    latestDate.current = date;
    setSelectedDate(date);
    setFetching(true);
    const result = await getByDate(date);
    if (latestDate.current === date) setDayOrders(result);
    setFetching(false);
  }, [getByDate]);

  const loadAll = useCallback(async () => {
    if (!supabaseConfigured) return;
    await Promise.all([
      getCounts().then(setCounts),
      loadMarks(year, month),
      loadDay(latestDate.current),
    ]);
  }, [getCounts, loadMarks, loadDay, year, month]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const calendarMarks = useMemo(() => {
    const result: MarkedDates = { ...markedDates };
    result[selectedDate] = {
      ...(result[selectedDate] ?? {}),
      selected: true,
      selectedColor: brand.primary,
      selectedTextColor: '#FFFFFF',
    };
    return result;
  }, [markedDates, selectedDate]);

  const dayRevenue = dayOrders.reduce((sum, o) => sum + (o.price ?? 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} colors={[brand.primary]} />}
      >
        <View style={styles.hero}>
          <Pressable style={styles.themeBtn} onPress={toggle} hitSlop={10} accessibilityLabel="Mudar tema">
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={theme.accent} />
          </Pressable>
          <Logo size={170} color={theme.accent} />
          <Text style={styles.heroSub}>Gestão de encomendas</Text>
        </View>

        {!supabaseConfigured && (
          <ErrorBanner message="Supabase por configurar — preenche o URL e a anon key no .env e no app.json." />
        )}
        {error && <ErrorBanner message={error} onRetry={handleRefresh} onDismiss={clearError} />}

        <View style={styles.statsRow}>
          <Stat styles={styles} icon="hourglass-outline" color={statusColors.Pendente} value={String(counts.pending)} label="Pendentes" />
          <Stat styles={styles} icon="color-wand-outline" color={statusColors['Em Produção']} value={String(counts.production)} label="Em produção" />
          <Stat styles={styles} icon="cash-outline" color={brand.success} value={formatMoney(dayRevenue)} label="Neste dia" small />
        </View>

        <View style={styles.calendarCard}>
          <Calendar
            current={currentMonth}
            markingType="multi-dot"
            markedDates={calendarMarks}
            onDayPress={(d: DateData) => loadDay(d.dateString)}
            onMonthChange={(m: DateData) => {
              const monthStr = `${m.year}-${String(m.month).padStart(2, '0')}-01`;
              setCurrentMonth(monthStr);
              loadMarks(m.year, m.month);
            }}
            enableSwipeMonths
            firstDay={1}
            theme={calTheme}
            renderArrow={(direction: 'left' | 'right') => (
              <View style={styles.arrow}>
                <Ionicons name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.accent} />
              </View>
            )}
          />
        </View>

        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{capitalize(formatDateLong(selectedDate))}</Text>
            <Text style={styles.sectionSub}>
              {dayOrders.length} encomenda{dayOrders.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <Pressable style={styles.prodBtn} onPress={() => router.push(`/producao?date=${selectedDate}`)}>
            <Ionicons name="leaf-outline" size={14} color={theme.accent} />
            <Text style={styles.prodText}>Produção</Text>
          </Pressable>
        </View>

        {fetching && !refreshing ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 24 }} />
        ) : dayOrders.length === 0 ? (
          <EmptyState icon="leaf-outline" title="Dia livre" subtitle="Sem encomendas para este dia. Toca no + para criar." />
        ) : (
          dayOrders.map((o) => <OrderCard key={o.id} order={o} showDate={false} onPress={() => router.push(`/order/${o.id}`)} />)
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.93 }] }]}
        onPress={() => router.push(`/new-order?date=${selectedDate}`)}
        accessibilityLabel="Nova encomenda"
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </Pressable>
    </View>
  );
}

function Stat({
  styles,
  icon,
  color,
  value,
  label,
  small,
}: {
  styles: ReturnType<typeof makeStyles>;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  value: string;
  label: string;
  small?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, small && { fontSize: 18 }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    hero: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.md },
    themeBtn: {
      position: 'absolute',
      right: spacing.md,
      top: spacing.sm,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroSub: { fontSize: 11, color: t.textMuted, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase', marginTop: spacing.sm },
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.md },
    statCard: {
      flex: 1,
      backgroundColor: t.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.border,
      ...softShadow,
    },
    statIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statValue: { fontFamily: font.serifBold, fontSize: 24, color: t.text },
    statLabel: { fontSize: 10, color: t.textMuted, fontWeight: '700', letterSpacing: 0.3 },
    calendarCard: {
      backgroundColor: t.surface,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: t.border,
      padding: spacing.sm,
      overflow: 'hidden',
      ...softShadow,
    },
    arrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md + 4,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    sectionTitle: { fontFamily: font.serifBold, fontSize: 24, color: t.text },
    sectionSub: { fontSize: font.size.xs, color: t.textMuted, fontWeight: '700' },
    prodBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: t.accentSoft,
      borderRadius: radius.full,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    prodText: { fontSize: 12, fontWeight: '800', color: t.accent },
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
