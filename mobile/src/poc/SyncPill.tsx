import { StyleSheet, Text, View } from 'react-native';
import { CircleCheck, Clock3, WifiOff } from 'lucide-react-native';
import type { PocSync, SyncState } from './data';

const iconByState = {
  live: CircleCheck,
  queued: Clock3,
  offline: WifiOff,
} as const;

const paletteByState: Record<SyncState, { bg: string; dot: string }> = {
  live: { bg: 'rgba(76, 217, 175, 0.16)', dot: '#4cd9af' },
  queued: { bg: 'rgba(255, 197, 87, 0.16)', dot: '#ffc557' },
  offline: { bg: 'rgba(148, 158, 176, 0.16)', dot: '#949eb0' },
};

export function SyncPill({ sync, text, muted }: { sync: PocSync; text: string; muted: string }) {
  const Icon = iconByState[sync.state];
  const palette = paletteByState[sync.state];

  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <View style={[styles.dot, { backgroundColor: palette.dot }]} />
      <Icon size={14} color={palette.dot} />
      <Text style={[styles.label, { color: muted }]}>{sync.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});