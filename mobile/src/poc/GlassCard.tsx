import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import type { ZoneTheme } from './theme';

interface GlassCardProps extends PropsWithChildren {
  theme: ZoneTheme;
  style?: ViewStyle;
}

export function GlassCard({ theme, style, children }: GlassCardProps) {
  return (
    <BlurView
      intensity={20}
      tint="dark"
      style={[styles.card, { borderColor: theme.border, backgroundColor: theme.glass }, style]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});