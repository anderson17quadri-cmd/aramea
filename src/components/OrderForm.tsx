import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateBox, Input, Label, QtyRow, SectionTitle } from './FormFields';
import { PaymentFields } from './PaymentFields';
import { StackHeader } from './ScreenHeader';
import { Button } from './ui/Button';
import { ErrorBanner } from './ui/ErrorBanner';
import { useClients } from '../hooks/useClients';
import { useProducts } from '../hooks/useProducts';
import { errorMessage } from '../services/errors';
import { uploadPhoto } from '../services/photoStorage';
import { brand, channel as channelColors, channelIcon, status as statusColors } from '../theme/colors';
import { radius, softShadow, spacing } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { font } from '../theme/typography';
import { Theme, useThemedStyles } from '../theme/useThemedStyles';
import { CHANNELS, Client, Order, OrderInput, OrderItem, Product, STATUSES, summarizeItems } from '../types';
import { choose, confirm, notify } from '../utils/alert';
import {
  buildDateStr,
  buildTimeStr,
  isValidDate,
  isValidTime,
  parseDateParts,
  parseDecimal,
  parseTimeParts,
  toDecimalInput,
} from '../utils/format';

export interface FormValues {
  clientName: string;
  clientPhone: string;
  sourceChannel: string;
  items: OrderItem[];
  productsPrice: string;
  especialOn: boolean;
  especial: string;
  especialPrice: string;
  deposit: string;
  cost: string;
  paid: boolean;
  dia: string;
  mes: string;
  ano: string;
  hora: string;
  minuto: string;
  photoUri: string | null;
  notes: string;
  status: string;
}

export function emptyValues(patch: Partial<FormValues> = {}): FormValues {
  return {
    clientName: '',
    clientPhone: '',
    sourceChannel: 'WhatsApp',
    items: [],
    productsPrice: '',
    especialOn: false,
    especial: '',
    especialPrice: '',
    deposit: '',
    cost: '',
    paid: false,
    dia: '',
    mes: '',
    ano: '',
    hora: '',
    minuto: '',
    photoUri: null,
    notes: '',
    status: 'Pendente',
    ...patch,
  };
}

/** Preenche o formulário a partir de uma encomenda (editar ou duplicar). */
export function valuesFromOrder(o: Order, duplicate = false): FormValues {
  const date = duplicate ? { dia: '', mes: '', ano: '' } : parseDateParts(o.deliveryDate);
  const time = duplicate ? { hora: '', minuto: '' } : parseTimeParts(o.deliveryTime);
  return emptyValues({
    clientName: o.clientName,
    clientPhone: o.clientPhone ?? '',
    sourceChannel: o.sourceChannel || 'WhatsApp',
    items: o.items,
    productsPrice: toDecimalInput(o.productsPrice),
    especialOn: !!o.especial,
    especial: o.especial ?? '',
    especialPrice: toDecimalInput(o.especialPrice),
    // Ao duplicar, o pagamento e a data são sempre novos.
    deposit: duplicate ? '' : toDecimalInput(o.deposit),
    cost: toDecimalInput(o.cost),
    paid: duplicate ? false : o.paid,
    ...date,
    ...time,
    photoUri: duplicate ? null : o.photoUri,
    notes: o.notes ?? '',
    status: duplicate ? 'Pendente' : o.status,
  });
}

function totalOf(v: FormValues): number {
  return parseDecimal(v.productsPrice) + (v.especialOn ? parseDecimal(v.especialPrice) : 0);
}

interface Props {
  title: string;
  initial: FormValues;
  loading?: boolean;
  /** Mostra os botões de estado (só ao editar). */
  showStatus?: boolean;
  saveLabel: string;
  onSubmit: (input: OrderInput) => Promise<void>;
}

export function OrderForm({ title, initial, loading, showStatus, saveLabel, onSubmit }: Props) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [v, setV] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { grouped, products, loading: loadingProducts, error: productsError } = useProducts();
  const { clients: clientMatches, refresh: searchClients } = useClients();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  // O valor inicial pode chegar depois (ex: ao abrir a edição).
  useEffect(() => {
    setV(initial);
  }, [initial]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    dirty.current = true;
    setV((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) setErrors((prev) => ({ ...prev, [key as string]: '' }));
  };

  const handleClientName = (t: string) => {
    set('clientName', t);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (t.trim().length < 2) {
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      searchClients(t);
      setShowSuggestions(true);
    }, 250);
  };

  const pickClient = (c: Client) => {
    setV((prev) => ({
      ...prev,
      clientName: c.name,
      clientPhone: c.phone ?? prev.clientPhone,
      sourceChannel: c.sourceChannel || prev.sourceChannel,
    }));
    setShowSuggestions(false);
  };

  const toggleProduct = (p: Product) => {
    dirty.current = true;
    setV((prev) => {
      const exists = prev.items.some((i) => i.productId === p.id);
      return {
        ...prev,
        items: exists
          ? prev.items.filter((i) => i.productId !== p.id)
          : [...prev.items, { productId: p.id, name: p.name, category: p.category, qty: 1 }],
      };
    });
    if (errors.items) setErrors((prev) => ({ ...prev, items: '' }));
  };

  const setQty = (productId: string, qty: number) =>
    setV((prev) => ({ ...prev, items: prev.items.map((i) => (i.productId === productId ? { ...i, qty } : i)) }));

  const removeItem = (productId: string) =>
    setV((prev) => ({ ...prev, items: prev.items.filter((i) => i.productId !== productId) }));

  const pickImage = async () => {
    const choice = Platform.OS === 'web' ? 1 : await choose('Adicionar foto', ['Tirar foto', 'Escolher da galeria']);
    if (choice < 0) return;
    try {
      if (choice === 0) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          notify('Permissão necessária', 'Autoriza o acesso à câmara nas Definições do iPhone.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
      const result = choice === 0 ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      const uri = result.canceled ? null : result.assets[0]?.uri;
      if (uri) set('photoUri', uri);
    } catch (e) {
      notify('Foto', errorMessage(e, 'Não foi possível abrir as fotos.'));
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!v.clientName.trim()) errs.clientName = 'Nome obrigatório';
    if (!isValidDate(v.dia, v.mes, v.ano)) errs.deliveryDate = 'Data inválida';
    if (!isValidTime(v.hora, v.minuto)) errs.deliveryTime = 'Hora inválida';
    const validItems = v.items.filter((i) => i.qty > 0);
    if (!validItems.length && !(v.especialOn && v.especial.trim())) errs.items = 'Escolhe pelo menos um produto ou descreve o especial';
    if (v.especialOn && !v.especial.trim()) errs.especial = 'Descreve a encomenda especial';
    setErrors(errs);
    return Object.values(errs).every((e) => !e);
  };

  const handleSave = async () => {
    if (!validate()) {
      notify('Falta preencher', 'Revê os campos assinalados a vermelho.');
      return;
    }
    setSaving(true);
    try {
      const photoUri = v.photoUri ? await uploadPhoto(v.photoUri) : null;
      const summary = summarizeItems(v.items);
      const especial = v.especialOn ? v.especial.trim() : '';
      await onSubmit({
        clientName: v.clientName.trim(),
        clientPhone: v.clientPhone.trim() || null,
        deliveryDate: buildDateStr(v.dia, v.mes, v.ano),
        deliveryTime: buildTimeStr(v.hora, v.minuto),
        items: summary.items,
        productId: summary.productId,
        productName: summary.productName,
        quantity: summary.quantity,
        productsPrice: parseDecimal(v.productsPrice),
        especial: especial || null,
        especialPrice: especial ? parseDecimal(v.especialPrice) : 0,
        price: totalOf(v),
        deposit: parseDecimal(v.deposit),
        cost: parseDecimal(v.cost),
        paid: v.paid,
        photoUri,
        sourceChannel: v.sourceChannel,
        notes: v.notes.trim() || null,
        status: v.status,
      });
      dirty.current = false;
    } catch (e) {
      notify('Não foi possível guardar', errorMessage(e, 'Tenta outra vez.'));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    if (dirty.current && !(await confirm('Descartar alterações?', 'O que preencheste vai perder-se.', 'Descartar', true))) return;
    router.back();
  };

  const header = (
    <StackHeader
      title={title}
      onBack={handleBack}
      right={
        <Pressable onPress={handleSave} disabled={saving} hitSlop={12} accessibilityLabel="Guardar">
          {saving ? <ActivityIndicator color={theme.accent} /> : <Ionicons name="checkmark" size={28} color={theme.accent} />}
        </Pressable>
      }
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {header}
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const selectedIds = new Set(v.items.map((i) => i.productId));
  const liveName = (item: OrderItem) => products.find((p) => p.id === item.productId)?.name ?? item.name;

  return (
    <View style={styles.container}>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 60 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ---------------- Cliente ---------------- */}
          <SectionTitle>Cliente</SectionTitle>
          <View style={styles.clientWrap}>
            <Input
              placeholder="Nome do cliente *"
              value={v.clientName}
              onChange={handleClientName}
              error={errors.clientName}
              autoCapitalize="words"
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && clientMatches.length > 0 && (
              <View style={styles.suggestBox}>
                {clientMatches.slice(0, 5).map((c) => (
                  <Pressable key={c.id} style={styles.suggestItem} onPress={() => pickClient(c)}>
                    <Ionicons name="person-circle-outline" size={20} color={theme.accent} />
                    <Text style={styles.suggestName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    {!!c.phone && <Text style={styles.suggestPhone}>{c.phone}</Text>}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          <Input
            placeholder="Telemóvel ou @instagram"
            value={v.clientPhone}
            onChange={(t) => set('clientPhone', t)}
            autoCapitalize="none"
            containerStyle={{ marginTop: spacing.sm }}
          />

          <Label>Canal</Label>
          <View style={styles.row}>
            {CHANNELS.map((ch) => {
              const active = v.sourceChannel === ch;
              const c = channelColors[ch];
              return (
                <Pressable
                  key={ch}
                  style={[styles.channelBtn, active && { backgroundColor: c, borderColor: c }]}
                  onPress={() => set('sourceChannel', ch)}
                >
                  <Ionicons name={channelIcon[ch]} size={18} color={active ? '#FFF' : c} />
                  <Text style={[styles.channelText, { color: active ? '#FFF' : c }]}>{ch}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* ---------------- Produtos ---------------- */}
          <SectionTitle
            right={
              <Pressable style={styles.manageLink} onPress={() => router.push('/gerir-produtos')}>
                <Ionicons name="options-outline" size={15} color={theme.accent} />
                <Text style={styles.manageText}>Gerir Produtos</Text>
              </Pressable>
            }
          >
            Produtos
          </SectionTitle>
          {productsError ? <ErrorBanner message={productsError} /> : null}
          {loadingProducts ? (
            <ActivityIndicator color={theme.accent} />
          ) : products.length === 0 ? (
            <Pressable style={styles.emptyProducts} onPress={() => router.push('/gerir-produtos')}>
              <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
              <Text style={styles.emptyProductsText}>Ainda não há produtos — toca para adicionar</Text>
            </Pressable>
          ) : (
            grouped.map(([category, list]) => (
              <View key={category} style={{ marginBottom: spacing.sm }}>
                <Text style={styles.category}>{category}</Text>
                <View style={styles.wrap}>
                  {list.map((p) => {
                    const active = selectedIds.has(p.id);
                    return (
                      <Pressable key={p.id} style={[styles.productChip, active && styles.productChipActive]} onPress={() => toggleProduct(p)}>
                        {active ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
                        <Text style={[styles.productChipText, active && { color: '#FFF' }]}>{p.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}

          {v.items.length > 0 && (
            <View style={{ marginTop: spacing.sm }}>
              <Label>Quantidades</Label>
              {v.items.map((item) => (
                <QtyRow
                  key={item.productId}
                  label={liveName(item)}
                  sub={item.category}
                  value={item.qty}
                  onChangeValue={(q) => setQty(item.productId, q)}
                  onRemove={() => removeItem(item.productId)}
                />
              ))}
              <Input
                label="Preço dos produtos (€)"
                placeholder="0,00"
                value={v.productsPrice}
                onChange={(t) => set('productsPrice', t)}
                keyboardType="decimal-pad"
              />
            </View>
          )}
          {errors.items ? <Text style={styles.error}>{errors.items}</Text> : null}

          {/* ---------------- Especial ---------------- */}
          <Pressable style={[styles.especialToggle, v.especialOn && styles.especialToggleOn]} onPress={() => set('especialOn', !v.especialOn)}>
            <Text style={[styles.especialIcon, v.especialOn && { color: '#FFF' }]}>✦</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.especialTitle, v.especialOn && { color: '#FFF' }]}>Especial</Text>
              <Text style={[styles.especialSub, v.especialOn && { color: 'rgba(255,255,255,0.85)' }]}>
                Encomenda personalizada, com descrição livre
              </Text>
            </View>
            <Ionicons name={v.especialOn ? 'checkmark-circle' : 'add-circle-outline'} size={22} color={v.especialOn ? '#FFF' : theme.accent} />
          </Pressable>
          {v.especialOn && (
            <>
              <Input
                placeholder="Ex: bouquet de noiva em tons de marfim, com fita de cetim…"
                value={v.especial}
                onChange={(t) => set('especial', t)}
                multiline
                error={errors.especial}
                containerStyle={{ marginTop: spacing.sm }}
              />
              <Input
                label="Preço do especial (€)"
                placeholder="0,00"
                value={v.especialPrice}
                onChange={(t) => set('especialPrice', t)}
                keyboardType="decimal-pad"
              />
            </>
          )}

          {/* ---------------- Pagamento ---------------- */}
          <SectionTitle>Pagamento</SectionTitle>
          <PaymentFields
            price={totalOf(v)}
            deposit={v.deposit}
            cost={v.cost}
            paid={v.paid}
            onChange={(field, value) => set(field, value)}
            onPaidChange={(paid) => set('paid', paid)}
          />

          {/* ---------------- Entrega ---------------- */}
          <SectionTitle>Entrega</SectionTitle>
          <Label>Data de entrega *</Label>
          <View style={styles.dateRow}>
            <DateBox value={v.dia} onChange={(t) => set('dia', t)} placeholder="DD" maxLen={2} error={!!errors.deliveryDate} />
            <Text style={styles.dateSep}>/</Text>
            <DateBox value={v.mes} onChange={(t) => set('mes', t)} placeholder="MM" maxLen={2} error={!!errors.deliveryDate} />
            <Text style={styles.dateSep}>/</Text>
            <DateBox value={v.ano} onChange={(t) => set('ano', t)} placeholder="AAAA" maxLen={4} wide error={!!errors.deliveryDate} />
          </View>
          {errors.deliveryDate ? <Text style={styles.error}>{errors.deliveryDate}</Text> : null}

          <Label>Hora de entrega</Label>
          <View style={styles.dateRow}>
            <DateBox value={v.hora} onChange={(t) => set('hora', t)} placeholder="HH" maxLen={2} error={!!errors.deliveryTime} />
            <Text style={styles.dateSep}>:</Text>
            <DateBox value={v.minuto} onChange={(t) => set('minuto', t)} placeholder="MM" maxLen={2} error={!!errors.deliveryTime} />
          </View>
          {errors.deliveryTime ? <Text style={styles.error}>{errors.deliveryTime}</Text> : null}

          {showStatus && (
            <>
              <Label>Estado</Label>
              <View style={styles.wrap}>
                {STATUSES.map((s) => {
                  const active = v.status === s;
                  const c = statusColors[s];
                  return (
                    <Pressable
                      key={s}
                      style={[styles.statusBtn, active && { backgroundColor: c, borderColor: c }]}
                      onPress={() => set('status', s)}
                    >
                      <Text style={[styles.statusText, active && { color: '#FFF' }]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* ---------------- Foto ---------------- */}
          <SectionTitle>Foto</SectionTitle>
          {v.photoUri ? (
            <View>
              <Image source={{ uri: v.photoUri }} style={styles.photo} />
              <View style={styles.photoActions}>
                <Pressable style={styles.photoAction} onPress={pickImage}>
                  <Ionicons name="swap-horizontal" size={18} color="#FFF" />
                </Pressable>
                <Pressable style={styles.photoAction} onPress={() => set('photoUri', null)}>
                  <Ionicons name="trash-outline" size={18} color="#FFF" />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.photoPlaceholder} onPress={pickImage}>
              <Ionicons name="camera-outline" size={30} color={theme.accent} />
              <Text style={styles.photoText}>Adicionar foto</Text>
              <Text style={styles.photoHint}>Fica guardada no Supabase</Text>
            </Pressable>
          )}

          {/* ---------------- Observações ---------------- */}
          <SectionTitle>Observações</SectionTitle>
          <Input placeholder="Morada, mensagem do cartão, cores preferidas…" value={v.notes} onChange={(t) => set('notes', t)} multiline />

          <Button title={saving ? 'A guardar…' : saveLabel} icon="checkmark" size="lg" onPress={handleSave} loading={saving} style={{ marginTop: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    form: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
    row: { flexDirection: 'row', gap: spacing.sm },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    error: { color: brand.error, fontSize: font.size.xs, marginTop: 4, marginLeft: 4 },
    clientWrap: { position: 'relative', zIndex: 20 },
    suggestBox: {
      position: 'absolute',
      top: 54,
      left: 0,
      right: 0,
      backgroundColor: t.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.border,
      overflow: 'hidden',
      ...softShadow,
      boxShadow: '0px 10px 24px rgba(40, 42, 35, 0.16)',
    },
    suggestItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    suggestName: { flex: 1, fontSize: 15, fontWeight: '700', color: t.text },
    suggestPhone: { fontSize: 12, color: t.textMuted },
    channelBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    channelText: { fontSize: 14, fontWeight: '700' },
    manageLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: t.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.full,
    },
    manageText: { color: t.accent, fontSize: 13, fontWeight: '700' },
    category: { fontSize: 11, fontWeight: '800', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 },
    productChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    productChipActive: { backgroundColor: brand.primary, borderColor: brand.primary },
    productChipText: { fontSize: 14, fontWeight: '600', color: t.text },
    emptyProducts: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: t.border,
    },
    emptyProductsText: { flex: 1, color: t.textSecondary, fontWeight: '600' },
    especialToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: t.blush,
      borderWidth: 1,
      borderColor: t.border,
    },
    especialToggleOn: { backgroundColor: brand.secondary, borderColor: brand.secondary },
    especialIcon: { fontSize: 22, color: brand.secondary, width: 26, textAlign: 'center' },
    especialTitle: { fontFamily: font.serifBold, fontSize: 21, color: t.text },
    especialSub: { fontSize: 12, color: t.textSecondary },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateSep: { fontSize: 22, fontWeight: '600', color: t.textMuted, marginHorizontal: 2 },
    statusBtn: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    statusText: { fontSize: 13, fontWeight: '700', color: t.textSecondary },
    photoPlaceholder: {
      borderWidth: 1.5,
      borderColor: t.border,
      borderStyle: 'dashed',
      borderRadius: radius.lg,
      paddingVertical: spacing.xl,
      alignItems: 'center',
      backgroundColor: t.surface,
    },
    photoText: { fontSize: 15, color: t.text, fontWeight: '700', marginTop: spacing.xs },
    photoHint: { fontSize: 12, color: t.textMuted, marginTop: 2 },
    photo: { width: '100%', height: 240, borderRadius: radius.lg, backgroundColor: t.surfaceElevated },
    photoActions: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 8 },
    photoAction: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(40, 42, 35, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
