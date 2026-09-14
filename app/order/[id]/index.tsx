import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeartThread } from '../../../src/components/Logo';
import { StackHeader } from '../../../src/components/ScreenHeader';
import { Button } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ChannelChip, StatusChip } from '../../../src/components/ui/StatusChip';
import { useOrders } from '../../../src/hooks/useOrders';
import { errorMessage } from '../../../src/services/errors';
import { generateText, printReceipt, shareMessage, shareReceiptPdf } from '../../../src/services/receipt';
import { brand, channel as channelColors, channelIcon, status as statusColors } from '../../../src/theme/colors';
import { radius, softShadow, spacing } from '../../../src/theme/spacing';
import { useTheme } from '../../../src/theme/ThemeContext';
import { font } from '../../../src/theme/typography';
import { Theme, useThemedStyles } from '../../../src/theme/useThemedStyles';
import { Order, outstanding, STATUSES } from '../../../src/types';
import { confirm, notify } from '../../../src/utils/alert';
import { capitalize, formatDate, formatDateLong, formatMoney } from '../../../src/utils/format';

function contactUrl(order: Order): string | null {
  const contact = order.clientPhone?.trim();
  if (!contact) return null;
  if (order.sourceChannel === 'Instagram' || contact.startsWith('@')) {
    return `https://instagram.com/${contact.replace('@', '')}`;
  }
  let digits = contact.replace(/\D/g, '').replace(/^00/, '');
  if (!digits) return null;
  if (digits.length === 9) digits = `351${digits}`;
  return `https://wa.me/${digits}`;
}

export default function OrderDetailScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { getById, remove, updateStatus } = useOrders();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [imageModal, setImageModal] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const o = await getById(id);
    setOrder(o);
    setLoading(false);
  }, [id, getById]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      const msg = errorMessage(e, 'Tenta outra vez.');
      // Fechar o diálogo de impressão/partilha não é um erro.
      if (!/cancel|did not complete|dismiss/i.test(msg)) notify('Ups', msg);
    } finally {
      setBusy(null);
    }
  };

  const handleStatus = async (status: string) => {
    if (!order || status === order.status) return;
    if (!(await confirm('Alterar estado', `Marcar como "${status}"?`))) return;
    run('status', async () => {
      await updateStatus(order.id, status);
      await load();
    });
  };

  const handleDelete = async () => {
    setMenuVisible(false);
    if (!order) return;
    if (!(await confirm('Apagar encomenda', `A encomenda de ${order.clientName} vai ser apagada. Não dá para desfazer.`, 'Apagar', true))) return;
    run('delete', async () => {
      await remove(order.id);
      router.back();
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StackHeader title="Encomenda" />
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <StackHeader title="Encomenda" />
        <EmptyState icon="alert-circle-outline" title="Encomenda não encontrada" subtitle="Pode ter sido apagada." />
      </View>
    );
  }

  const url = contactUrl(order);
  const channelColor = channelColors[order.sourceChannel as keyof typeof channelColors] ?? theme.textMuted;
  const falta = outstanding(order);

  return (
    <View style={styles.container}>
      <StackHeader
        title="Encomenda"
        subtitle={`#${order.id.slice(0, 6).toUpperCase()}`}
        right={
          <Pressable onPress={() => setMenuVisible(true)} hitSlop={12} accessibilityLabel="Mais opções">
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.accent} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {order.photoUri ? (
          <Pressable onPress={() => setImageModal(true)}>
            <Image source={{ uri: order.photoUri }} style={styles.hero} resizeMode="cover" />
          </Pressable>
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="flower-outline" size={48} color={theme.accent} />
            <HeartThread width={90} color={theme.accent} />
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.chips}>
            <StatusChip status={order.status} />
            <ChannelChip channel={order.sourceChannel} />
          </View>
          <Text style={styles.clientName}>{order.clientName}</Text>

          {order.clientPhone ? (
            <Pressable
              style={[styles.contactBadge, { backgroundColor: channelColor + '18' }]}
              onPress={() => (url ? Linking.openURL(url) : undefined)}
              disabled={!url}
            >
              <Ionicons name={channelIcon[order.sourceChannel] ?? 'call-outline'} size={15} color={channelColor} />
              <Text style={[styles.contactText, { color: channelColor }]}>{order.clientPhone}</Text>
              {url ? <Ionicons name="open-outline" size={12} color={channelColor} /> : null}
            </Pressable>
          ) : (
            <Text style={styles.muted}>Sem contacto</Text>
          )}

          <View style={styles.divider} />

          <Info styles={styles} icon="calendar-outline" label="Entrega" value={capitalize(formatDateLong(order.deliveryDate))} />
          <Info styles={styles} icon="time-outline" label="Hora" value={order.deliveryTime ?? 'Sem hora'} />

          {order.items.length > 0 && (
            <>
              <Text style={styles.subTitle}>Produtos</Text>
              {order.items.map((i) => (
                <View key={i.productId || i.name} style={styles.itemRow}>
                  <Text style={styles.itemQty}>{i.qty}×</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{i.name}</Text>
                    {i.category ? <Text style={styles.itemCat}>{i.category}</Text> : null}
                  </View>
                </View>
              ))}
              <View style={styles.totalLine}>
                <Text style={styles.muted}>Quantidade total</Text>
                <Text style={styles.totalLineValue}>{order.quantity}</Text>
              </View>
            </>
          )}

          {order.especial && (
            <View style={styles.especial}>
              <Text style={styles.especialTitle}>✦ Especial</Text>
              <Text style={styles.notesText}>{order.especial}</Text>
            </View>
          )}

          {order.notes && (
            <>
              <Text style={styles.subTitle}>Observações</Text>
              <Text style={styles.notesText}>{order.notes}</Text>
            </>
          )}

          <View style={styles.divider} />
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Total</Text>
            <Text style={styles.payTotal}>{formatMoney(order.price)}</Text>
          </View>
          {order.deposit > 0 && (
            <View style={styles.payRow}>
              <Text style={styles.muted}>Sinal recebido</Text>
              <Text style={styles.payValue}>{formatMoney(order.deposit)}</Text>
            </View>
          )}
          <View style={styles.payRow}>
            <Text style={styles.muted}>{order.paid ? 'Pagamento' : 'Falta receber'}</Text>
            <Text style={[styles.payValue, { color: order.paid || falta === 0 ? brand.success : brand.warning }]}>
              {order.paid ? 'Pago ✓' : formatMoney(falta)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Estado da encomenda</Text>
        <View style={styles.statusRow}>
          {STATUSES.map((s) => {
            const active = order.status === s;
            const c = statusColors[s];
            return (
              <Pressable key={s} style={[styles.statusBtn, active && { backgroundColor: c, borderColor: c }]} onPress={() => handleStatus(s)} disabled={busy === 'status'}>
                <Text style={[styles.statusBtnText, active && { color: '#FFF' }]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>Passa a “Concluída” sozinha 1h depois da hora de entrega.</Text>

        <View style={styles.actions}>
          <Button title="Partilhar" variant="outline" icon="share-outline" onPress={() => run('share', () => shareMessage(order))} loading={busy === 'share'} style={{ flex: 1 }} />
          <Button title="Imprimir 58mm" variant="outline" icon="print-outline" onPress={() => run('print', () => printReceipt(order))} loading={busy === 'print'} style={{ flex: 1 }} />
        </View>
        <View style={styles.actions}>
          <Button title="Talão PDF" variant="soft" icon="document-outline" size="sm" onPress={() => run('pdf', () => shareReceiptPdf(order))} loading={busy === 'pdf'} style={{ flex: 1 }} />
          <Button title="Editar" variant="soft" icon="create-outline" size="sm" onPress={() => router.push(`/order/${order.id}/edit`)} style={{ flex: 1 }} />
        </View>

        <Pressable style={styles.receiptToggle} onPress={() => setShowReceipt((s) => !s)}>
          <Ionicons name="receipt-outline" size={17} color={theme.accent} />
          <Text style={styles.receiptToggleText}>Pré-visualizar talão (32 colunas)</Text>
          <Ionicons name={showReceipt ? 'chevron-up' : 'chevron-down'} size={17} color={theme.textMuted} />
        </Pressable>
        {showReceipt && (
          <View style={styles.receipt}>
            <Text style={styles.receiptText}>{generateText(order)}</Text>
          </View>
        )}

        <Text style={styles.created}>Criada em {formatDate(order.createdAt)}</Text>
      </ScrollView>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menu, { marginTop: insets.top + 50 }]}>
            <MenuItem styles={styles} icon="create-outline" label="Editar" color={theme.text} onPress={() => { setMenuVisible(false); router.push(`/order/${order.id}/edit`); }} />
            <MenuItem styles={styles} icon="copy-outline" label="Duplicar" color={theme.text} onPress={() => { setMenuVisible(false); router.push(`/new-order?duplicate=${order.id}`); }} />
            <MenuItem styles={styles} icon="document-outline" label="Partilhar talão PDF" color={theme.text} onPress={() => { setMenuVisible(false); run('pdf', () => shareReceiptPdf(order)); }} />
            <MenuItem styles={styles} icon="trash-outline" label="Apagar" color={brand.error} onPress={handleDelete} />
          </View>
        </Pressable>
      </Modal>

      <Modal visible={imageModal} transparent animationType="fade" onRequestClose={() => setImageModal(false)}>
        <View style={styles.imageModal}>
          <Pressable style={[styles.imageClose, { top: insets.top + 12 }]} onPress={() => setImageModal(false)} hitSlop={12}>
            <Ionicons name="close" size={30} color="#FFF" />
          </Pressable>
          {order.photoUri && <Image source={{ uri: order.photoUri }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Info({ styles, icon, label, value }: { styles: Styles; icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={theme.accent} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function MenuItem({ styles, icon, label, color, onPress }: { styles: Styles; icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.menuText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    hero: { width: '100%', height: 300, backgroundColor: t.surfaceElevated },
    heroPlaceholder: { width: '100%', height: 170, backgroundColor: t.blush, alignItems: 'center', justifyContent: 'center', gap: 6 },
    card: {
      backgroundColor: t.surface,
      borderRadius: radius.xl,
      marginHorizontal: spacing.md,
      marginTop: -spacing.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: t.border,
      ...softShadow,
    },
    chips: { flexDirection: 'row', gap: 6 },
    clientName: { fontFamily: font.serifBold, fontSize: 34, color: t.text, marginTop: spacing.xs, marginBottom: spacing.xs },
    contactBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, alignSelf: 'flex-start' },
    contactText: { fontSize: 13, fontWeight: '700' },
    muted: { fontSize: 13, color: t.textMuted },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: spacing.md },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
    infoIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' },
    infoLabel: { fontSize: 14, color: t.textSecondary, flex: 1 },
    infoValue: { fontSize: 14, fontWeight: '700', color: t.text, flexShrink: 1, textAlign: 'right' },
    subTitle: { fontFamily: font.serifBold, fontSize: 21, color: t.text, marginTop: spacing.md, marginBottom: 4 },
    itemRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 5 },
    itemQty: { minWidth: 34, fontSize: 16, fontWeight: '800', color: t.accent },
    itemName: { fontSize: 15, color: t.text, fontWeight: '600' },
    itemCat: { fontSize: 11, color: t.textMuted },
    totalLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    totalLineValue: { fontSize: 14, fontWeight: '800', color: t.text },
    especial: { backgroundColor: t.blush, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, gap: 4 },
    especialTitle: { fontFamily: font.serifBold, fontSize: 19, color: brand.secondary },
    notesText: { fontSize: 15, color: t.textSecondary, lineHeight: 22 },
    payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
    payLabel: { fontSize: 13, fontWeight: '800', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1.2 },
    payTotal: { fontFamily: font.serifBold, fontSize: 30, color: t.accent },
    payValue: { fontSize: 15, fontWeight: '800', color: t.text },
    sectionLabel: { fontSize: 12, fontWeight: '800', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginHorizontal: spacing.md },
    statusBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
    statusBtnText: { fontSize: 13, fontWeight: '700', color: t.textSecondary },
    hint: { fontSize: 11, color: t.textMuted, marginHorizontal: spacing.md, marginTop: 6 },
    actions: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.md, marginTop: spacing.md },
    receiptToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    receiptToggleText: { flex: 1, fontSize: 14, fontWeight: '600', color: t.text },
    receipt: {
      alignSelf: 'center',
      backgroundColor: '#FFFFFF',
      padding: 12,
      marginTop: spacing.sm,
      borderRadius: 6,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#D8CFC4',
    },
    receiptText: { fontFamily: 'Courier', fontSize: 11, lineHeight: 15, color: '#111' },
    created: { textAlign: 'center', fontSize: 11, color: t.textMuted, marginTop: spacing.lg },
    overlay: { flex: 1, backgroundColor: t.overlay, alignItems: 'flex-end', paddingRight: spacing.md },
    menu: { backgroundColor: t.surface, borderRadius: radius.lg, paddingVertical: 4, minWidth: 220, ...softShadow },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 14 },
    menuText: { fontSize: 16, fontWeight: '600' },
    imageModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    imageClose: { position: 'absolute', right: 20, zIndex: 10 },
    fullImage: { width: '94%', height: '82%' },
  });
