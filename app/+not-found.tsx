import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Logo } from '../src/components/Logo';
import { Button } from '../src/components/ui/Button';
import { spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/ThemeContext';
import { font } from '../src/theme/typography';

export default function NotFoundScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Logo size={140} color={theme.accent} />
      <Text style={[styles.title, { color: theme.text }]}>Página não encontrada</Text>
      <Button title="Voltar ao início" onPress={() => router.replace('/')} style={{ marginTop: spacing.lg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title: { fontFamily: font.serifBold, fontSize: 28, marginTop: spacing.lg },
});
