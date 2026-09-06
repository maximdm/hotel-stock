import { BlurView } from 'expo-blur';
import { ArrowUpDown, Minus, Plus, SlidersHorizontal } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import type { ZoneTheme } from './theme';

interface GlassSheetProps {
  visible: boolean;
  theme: ZoneTheme;
  onClose: () => void;
}

const actions = [
  { icon: Plus, label: 'Stock in', hint: 'Receive goods' },
  { icon: Minus, label: 'Stock out', hint: 'Deduct usage' },
  { icon: ArrowUpDown, label: 'Transfer', hint: 'Move between zones' },
  { icon: SlidersHorizontal, label: 'Adjust', hint: 'Fix a count' },
];

export function GlassSheet({ visible, theme, onClose }: GlassSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View entering={SlideInDown.springify().damping(20)} style={styles.sheetWrap}>
          <BlurView
            intensity={36}
            tint="dark"
            style={[styles.sheet, { backgroundColor: theme.glassStrong, borderColor: theme.border }]}
          >
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <Text style={[styles.title, { color: theme.text }]}>Stock actions</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Everything applies locally, then syncs
            </Text>
            <View style={styles.grid}>
              {actions.map((a) => {
                const Icon = a.icon;
                return (
                  <Pressable
                    key={a.label}
                    style={({ pressed }) => [
                      styles.action,
                      { borderColor: theme.border, backgroundColor: theme.glass },
                      pressed && styles.actionPressed,
                    ]}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
                      <Icon size={20} color={theme.accent} />
                    </View>
                    <Text style={[styles.actionLabel, { color: theme.text }]}>{a.label}</Text>
                    <Text style={[styles.actionHint, { color: theme.muted }]}>{a.hint}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancel,
                { borderColor: theme.border },
                pressed && styles.actionPressed,
              ]}
            >
              <Text style={[styles.cancelText, { color: theme.text }]}>Close</Text>
            </Pressable>
          </BlurView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    padding: 12,
  },
  sheet: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    marginBottom: 14,
    opacity: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  action: {
    width: '48%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 2,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionHint: {
    fontSize: 12,
    marginTop: 2,
  },
  cancel: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});