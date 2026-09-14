import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { TabHeader } from '../../src/components/ScreenHeader';
import { ChannelChip } from '../../src/components/ui/StatusChip';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { useClients } from '../../src/hooks/useClients';
import { brand } from '../../src/theme/colors';
import { radius, softShadow, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/ThemeContext';
import { font } from '../../src/theme/typography';
import { Theme, useThemedStyles } from '../../src/theme/useThemedStyles';
import { Client } from '../../src/types';
import { confirm } from '../../src/utils/alert';
import { getInitials } from '../../src/utils/format';

export default function ClientsScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { clients, loading, error, refresh, remove } = useClients();
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (t: string) => {
    setQuery(t);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => refresh(t), 300);
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh(query);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh]),
  );

  const handleDelete = async (client: Client) => {
    const ok = await confirm('Apagar cliente', `Apagar "${client.name}" da lista? As encomendas não são apagadas.`, 'Apagar', true);
    if (ok) remove(client.id, query);
  };

  const handleNewOrder = (client: Client) => {
    router.push(
      `/new-order?clientName=${encodeURIComponent(client.name)}&clientPhone=${encodeURIComponent(client.phone ?? '')}&sourceChannel=${encodeURIComponent(client.sourceChannel)}`,
    );
  };

  return (
    <View style={styles.container}>
      <TabHeader title="Clientes" subtitle={`${clients.length} cliente${clients.length !== 1 ? 's' : ''}`} />

      {error && <ErrorBanner message={error} onRetry={() => refresh(query)} />}

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={19} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar cliente…"
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={handleSearch}
          autoCorrect={false}
        />
        {query ? (
          <Pressable onPress={() => handleSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={19} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshing={loading}
        onRefresh={() => refresh(query)}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="people-outline"
              title={query ? 'Nenhum cliente' : 'Ainda sem clientes'}
              subtitle={query ? 'Tenta outro nome' : 'Os clientes guardam-se sozinhos quando crias uma encomenda'}
            />
          ) : null
        }
        ListFooterComponent={clients.length ? <Text style={styles.footer}>Toca num cliente para criar uma nova encomenda</Text> : null}
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} onPress={() => handleNewOrder(item)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.meta}>
                <ChannelChip channel={item.sourceChannel} iconOnly />
                <Text style={styles.phone} numberOfLines={1}>
                  {item.phone || 'Sem contacto'}
                </Text>
              </View>
            </View>
            <Pressable style={styles.iconBtn} onPress={() => handleNewOrder(item)} hitSlop={6} accessibilityLabel="Nova encomenda">
              <Ionicons name="add" size={22} color={theme.accent} />
            </Pressable>
            <Pressable style={[styles.iconBtn, { backgroundColor: brand.error + '14' }]} onPress={() => handleDelete(item)} hitSlop={6} accessibilityLabel="Apagar cliente">
              <Ionicons name="trash-outline" size={17} color={brand.error} />
            </Pressable>
          </Pressable>
        )}
      />
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
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.surface,
      marginHorizontal: spacing.md,
      marginVertical: 5,
      borderRadius: radius.lg,
      padding: 12,
      borderWidth: 1,
      borderColor: t.border,
      ...softShadow,
    },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.blush, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: font.serifBold, fontSize: 20, color: t.accent },
    info: { flex: 1, minWidth: 0 },
    name: { fontFamily: font.serifBold, fontSize: 20, color: t.text },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    phone: { flex: 1, fontSize: 13, color: t.textSecondary },
    iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' },
    footer: { textAlign: 'center', color: t.textMuted, fontSize: 12, marginTop: spacing.sm },
  });
