import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Label, SectionTitle } from '../src/components/FormFields';
import { StackHeader } from '../src/components/ScreenHeader';
import { EmptyState } from '../src/components/ui/EmptyState';
import { ErrorBanner } from '../src/components/ui/ErrorBanner';
import { useProducts } from '../src/hooks/useProducts';
import { brand } from '../src/theme/colors';
import { radius, softShadow, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/ThemeContext';
import { font } from '../src/theme/typography';
import { Theme, useThemedStyles } from '../src/theme/useThemedStyles';
import { DEFAULT_CATEGORIES, Product } from '../src/types';
import { confirm, notify } from '../src/utils/alert';
import { normalizeText } from '../src/utils/format';

export default function ManageProductsScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { products, grouped, loading, error, add, update, remove } = useProducts();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Flores');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const categories = useMemo(() => {
    const extra = products.map((p) => p.category?.trim()).filter((c): c is string => !!c);
    return [...new Set([...DEFAULT_CATEGORIES, ...extra])];
  }, [products]);

  const handleAdd = async () => {
    const clean = name.trim();
    if (!clean) return;
    if (products.some((p) => normalizeText(p.name) === normalizeText(clean))) {
      notify('Produto repetido', `"${clean}" já existe.`);
      return;
    }
    setSaving(true);
    const ok = await add(clean, category);
    setSaving(false);
    if (ok) setName('');
  };

  const startEdit = (p: Product) => {
    setEditId(p.id);
    setEditName(p.name);
    setEditCategory(p.category ?? '');
  };

  const saveEdit = async () => {
    if (!editId || !editName.trim()) return;
    if (await update(editId, editName, editCategory)) setEditId(null);
  };

  const handleDelete = async (p: Product) => {
    const ok = await confirm('Apagar produto', `Apagar "${p.name}"? As encomendas antigas mantêm o nome.`, 'Apagar', true);
    if (ok) remove(p.id);
  };

  return (
    <View style={styles.container}>
      <StackHeader title="Gerir Produtos" subtitle={`${products.length} produto${products.length !== 1 ? 's' : ''}`} />
      {error && <ErrorBanner message={error} />}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>Novo produto</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Ex: Rosa de cetim, Bouquet noiva…"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
                onSubmitEditing={handleAdd}
                returnKeyType="done"
              />
              <Pressable style={[styles.addBtn, (!name.trim() || saving) && { opacity: 0.5 }]} onPress={handleAdd} disabled={!name.trim() || saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Ionicons name="add" size={24} color="#FFF" />}
              </Pressable>
            </View>
            <Label>Categoria</Label>
            <View style={styles.wrap}>
              {categories.map((c) => {
                const active = category === c;
                return (
                  <Pressable key={c} style={[styles.catChip, active && styles.catChipActive]} onPress={() => setCategory(active ? '' : c)}>
                    <Text style={[styles.catText, active && { color: '#FFF' }]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={[styles.addInput, { marginTop: spacing.sm }]}
              placeholder="…ou escreve uma categoria nova"
              placeholderTextColor={theme.textMuted}
              value={categories.includes(category) ? '' : category}
              onChangeText={setCategory}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 30 }} />
          ) : products.length === 0 ? (
            <EmptyState icon="flower-outline" title="Sem produtos" subtitle="Adiciona os teus produtos para os escolheres nas encomendas." />
          ) : (
            grouped.map(([cat, list]) => (
              <View key={cat}>
                <SectionTitle>
                  {cat} <Text style={styles.count}>({list.length})</Text>
                </SectionTitle>
                <View style={styles.listCard}>
                  {list.map((p, index) => (
                    <View key={p.id} style={[styles.item, index > 0 && styles.itemBorder]}>
                      {editId === p.id ? (
                        <View style={{ flex: 1, gap: 6 }}>
                          <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} autoFocus onSubmitEditing={saveEdit} />
                          <TextInput
                            style={styles.editInput}
                            value={editCategory}
                            onChangeText={setEditCategory}
                            placeholder="Categoria"
                            placeholderTextColor={theme.textMuted}
                          />
                        </View>
                      ) : (
                        <>
                          <Ionicons name="flower-outline" size={18} color={theme.accent} />
                          <Text style={styles.itemText}>{p.name}</Text>
                        </>
                      )}
                      {editId === p.id ? (
                        <>
                          <Pressable onPress={saveEdit} style={[styles.iconBtn, { backgroundColor: brand.primary }]}>
                            <Ionicons name="checkmark" size={18} color="#FFF" />
                          </Pressable>
                          <Pressable onPress={() => setEditId(null)} style={styles.iconBtn}>
                            <Ionicons name="close" size={18} color={theme.textSecondary} />
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <Pressable onPress={() => startEdit(p)} style={styles.iconBtn} accessibilityLabel={`Editar ${p.name}`}>
                            <Ionicons name="pencil" size={15} color={theme.accent} />
                          </Pressable>
                          <Pressable onPress={() => handleDelete(p)} style={[styles.iconBtn, { backgroundColor: brand.error + '14' }]} accessibilityLabel={`Apagar ${p.name}`}>
                            <Ionicons name="trash-outline" size={15} color={brand.error} />
                          </Pressable>
                        </>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    addCard: { backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: t.border, ...softShadow },
    addTitle: { fontFamily: font.serifBold, fontSize: 23, color: t.text, marginBottom: spacing.sm },
    addRow: { flexDirection: 'row', gap: spacing.sm },
    addInput: {
      flex: 1,
      backgroundColor: t.background,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 15,
      color: t.text,
      borderWidth: 1,
      borderColor: t.border,
    },
    addBtn: { width: 50, borderRadius: radius.md, backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center' },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: t.border, backgroundColor: t.background },
    catChipActive: { backgroundColor: brand.primary, borderColor: brand.primary },
    catText: { fontSize: 13, fontWeight: '600', color: t.textSecondary },
    count: { fontFamily: font.serifMedium, color: t.textMuted, fontSize: 18 },
    listCard: { backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, paddingHorizontal: spacing.md },
    item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
    itemText: { flex: 1, fontSize: 16, color: t.text },
    editInput: {
      fontSize: 15,
      color: t.text,
      borderBottomWidth: 1,
      borderColor: brand.primary,
      paddingVertical: 4,
    },
    iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' },
  });
