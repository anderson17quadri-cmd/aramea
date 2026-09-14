import {
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
  useFonts,
} from '@expo-google-fonts/cormorant-garamond';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { completeOverdueOrders } from '../src/services/database';
import { onNotificationTap, syncReminders } from '../src/services/notifications';
import { supabaseConfigured } from '../src/services/supabase';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    if (supabaseConfigured) {
      // Fecha o que passou da hora há mais de 1h e reagenda os lembretes.
      completeOverdueOrders()
        .catch(() => 0)
        .finally(() => syncReminders());
    }
    return onNotificationTap((orderId) => router.push(`/order/${orderId}`));
  }, [ready]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function ThemedStack() {
  const { theme, isDark } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new-order" options={{ presentation: 'modal' }} />
        <Stack.Screen name="order/[id]/index" />
        <Stack.Screen name="order/[id]/edit" />
        <Stack.Screen name="gerir-produtos" />
        <Stack.Screen name="producao" />
      </Stack>
    </View>
  );
}
