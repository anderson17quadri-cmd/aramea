import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { ColorValue } from 'react-native';
import { IconName } from '../../src/components/ui/Button';
import { useTheme } from '../../src/theme/ThemeContext';

function tabIcon(outline: IconName, filled: IconName) {
  function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { theme } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen name="orders" options={{ title: 'Encomendas', tabBarIcon: tabIcon('flower-outline', 'flower') }} />
      <Tabs.Screen name="clientes" options={{ title: 'Clientes', tabBarIcon: tabIcon('people-outline', 'people') }} />
      <Tabs.Screen name="financeiro" options={{ title: 'Financeiro', tabBarIcon: tabIcon('wallet-outline', 'wallet') }} />
    </Tabs>
  );
}
