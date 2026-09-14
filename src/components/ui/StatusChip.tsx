import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { channel as channelColors, channelIcon, status as statusColors } from '../../theme/colors';
import { radius } from '../../theme/spacing';

export function StatusChip({ status, large }: { status: string; large?: boolean }) {
  const color = statusColors[status as keyof typeof statusColors] ?? '#A09F94';
  return (
    <View style={[styles.chip, { backgroundColor: color + '22' }, large && styles.large]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }, large && { fontSize: 14 }]}>{status}</Text>
    </View>
  );
}

export function ChannelChip({ channel, iconOnly }: { channel: string; iconOnly?: boolean }) {
  const color = channelColors[channel as keyof typeof channelColors] ?? '#A09F94';
  return (
    <View style={[styles.chip, { backgroundColor: color + '18' }]}>
      <Ionicons name={channelIcon[channel] ?? 'chatbubble-outline'} size={11} color={color} />
      {iconOnly ? null : <Text style={[styles.text, { color }]}>{channel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  large: { paddingHorizontal: 14, paddingVertical: 7 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
});
