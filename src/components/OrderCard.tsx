import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChannelChip, StatusChip } from './ui/StatusChip';
import { radius, softShadow, spacing } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { font } from '../theme/typography';
import { Theme, useThemedStyles } from '../theme/useThemedStyles';
import { Order } from '../types';
import { formatDate, formatMoney } from '../utils/format';

export function orderSummary(order: Order): string {
  const parts: string[] = [];
  if (order.productName) parts.push(order.productName);
  if (order.especial) parts.push(`✦ ${order.especial}`);
  return parts.join(' · ') || 'Encomenda';
}

function OrderCardInner({ order, onPress, showDate = true }: { order: Order; onPress?: () => void; showDate?: boolean }) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const done = order.status === 'Concluída' || order.status === 'Entregue';

  return (
    <Pressable style={({ pressed }) => [styles.card, done && { opacity: 0.8 }, pressed && styles.pressed]} onPress={onPress}>
      {order.photoUri ? (
        <Image source={{ uri: order.photoUri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Ionicons name="flower-outline" size={24} color={theme.accent} />
        </View>
      )}

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {order.clientName || 'Sem nome'}
          </Text>
          {order.price > 0 && <Text style={styles.price}>{formatMoney(order.price)}</Text>}
        </View>
        <Text style={styles.subtitle} numberOfLines={2}>
          {orderSummary(order)}
        </Text>
        <View style={styles.meta}>
          {showDate && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={theme.textMuted} />
              <Text style={styles.metaText}>{formatDate(order.deliveryDate)}</Text>
            </View>
          )}
          {order.deliveryTime && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={theme.textMuted} />
              <Text style={styles.metaText}>{order.deliveryTime}</Text>
            </View>
          )}
        </View>
        <View style={styles.bottom}>
          <StatusChip status={order.status} />
          <ChannelChip channel={order.sourceChannel} iconOnly />
          {!order.paid && order.price > 0 && order.deposit < order.price && !done && (
            <Text style={styles.unpaid}>por pagar</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export const OrderCard = React.memo(OrderCardInner);

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: t.surface,
      borderRadius: radius.lg,
      marginHorizontal: spacing.md,
      marginVertical: 5,
      padding: 12,
      borderWidth: 1,
      borderColor: t.border,
      ...softShadow,
    },
    pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
    thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: t.surfaceElevated },
    thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: t.blush },
    info: { flex: 1, minWidth: 0 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { flex: 1, fontFamily: font.serifBold, fontSize: 20, color: t.text },
    price: { fontSize: font.size.sm, fontWeight: '800', color: t.accent },
    subtitle: { fontSize: font.size.sm, color: t.textSecondary, marginTop: 1, lineHeight: 18 },
    meta: { flexDirection: 'row', gap: spacing.md, marginTop: 5 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: font.size.xs, color: t.textMuted, fontWeight: '600' },
    bottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' },
    unpaid: { fontSize: 10, fontWeight: '700', color: '#C4964F', textTransform: 'uppercase', letterSpacing: 0.6 },
  });
