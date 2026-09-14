import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { brand, light } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { font } from '../theme/typography';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Algo correu mal</Text>
        <Text style={styles.message}>{this.state.error.message || 'Erro inesperado'}</Text>
        <Pressable style={styles.button} onPress={() => this.setState({ error: null })}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: light.background },
  title: { fontFamily: font.serifBold, fontSize: 28, color: light.text, marginBottom: spacing.sm },
  message: { fontSize: font.size.sm, color: light.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  button: { backgroundColor: brand.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
