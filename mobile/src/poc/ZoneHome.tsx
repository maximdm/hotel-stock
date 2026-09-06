import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowDownUp,
  BedDouble,
  Home,
  RefreshCcw,
  ShoppingBasket,
  Sun,
  UtensilsCrossed,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fakeItems, fakeSync, fakeTrend } from './data';
import { GlassCard } from './GlassCard';
import { GlassSheet } from './GlassSheet';
import { Sparkline } from './Sparkline';
import { SyncPill } from './SyncPill';
import { zones, zoneOrder, type ZoneId } from './theme';

const zoneIcon: Record<ZoneId, LucideIcon> = {
  restaurant: UtensilsCrossed,
  patio: Sun,
  technical: Wrench,
  main: Warehouse,
};

const CARD_H = 22;
const W = Dimensions.get('window').width;

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function ZoneHome() {
  const insets = useSafeAreaInsets();
  const [zoneId, setZoneId] = useState<ZoneId>('restaurant');
  const [sheetOpen, setSheetOpen] = useState(false);

  const zone = zones[zoneId];
  const items = fakeItems[zoneId];
  const trend = fakeTrend[zoneId];
  const total = items.reduce((s, i) => s + i.balance, 0);
  const chartWidth = W - 40 - 36;
  const ZonesIcon = zoneIcon[zoneId];

  return (
    <View style={styles.root}>
      <Animated.View key={zone.id} entering={FadeIn.duration(420)} style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={zone.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 120 }]}
      >
        <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.chips}>
          {zoneOrder.map((id) => {
            const z = zones[id];
            const Icon = zoneIcon[id];
            const active = id === zoneId;
            return (
              <Pressable
                key={id}
                onPress={() => setZoneId(id)}
                style={[
                  styles.chip,
                  { borderColor: z.border, backgroundColor: active ? z.glassStrong : z.glass },
                ]}
              >
                <Icon size={15} color={active ? z.accent : z.muted} />
                <Text style={[styles.chipText, { color: active ? z.text : z.muted }]}>{z.name}</Text>
              </Pressable>
            );
          })}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={styles.heroRow}>
            <View style={styles.heroNameRow}>
              <ZonesIcon size={22} color={zone.accent} />
              <Text style={[styles.zoneName, { color: zone.text }]}>{zone.name}</Text>
            </View>
            <SyncPill sync={fakeSync} text={zone.text} muted={zone.muted} />
          </View>

          <View style={styles.heroBottom}>
            <Text style={[styles.heroNumber, { color: zone.text }]}>{formatNum(total)}</Text>
            <Text style={[styles.heroUnit, { color: zone.muted }]}>stock units · this zone</Text>
          </View>
          <Text style={[styles.tagline, { color: zone.muted }]}>{zone.tagline}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(500)}>
          <GlassCard theme={zone} style={styles.forecastCard}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: zone.text }]}>Stock forecast · 7 days</Text>
              <View style={[styles.deltaPill, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
                <Text style={[styles.deltaText, { color: zone.accent }]}>
                  {trend[trend.length - 1].delta >= 0 ? '+' : ''}
                  {trend[trend.length - 1].delta}
                </Text>
              </View>
            </View>
            <Sparkline
              values={trend.map((t) => t.value)}
              width={chartWidth}
              height={64}
              stroke={zone.accent}
            />
            <View style={styles.dayRow}>
              {trend.map((t) => (
                <Text key={t.label} style={[styles.dayLabel, { color: zone.muted }]}>
                  {t.label}
                </Text>
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(500)}>
          <GlassCard theme={zone}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: zone.text }]}>Stock levels</Text>
              <Pressable
                onPress={() => setSheetOpen(true)}
                style={({ pressed }) => [
                  styles.actionsBtn,
                  { borderColor: zone.border, backgroundColor: zone.glass },
                  pressed && styles.pressed,
                ]}
              >
                <ArrowDownUp size={14} color={zone.accent} />
                <Text style={[styles.actionsText, { color: zone.text }]}>Stock actions</Text>
              </Pressable>
            </View>

            {items.map((item, idx) => (
              <View
                key={item.name}
                style={[styles.itemRow, idx > 0 && { borderTopColor: zone.border, borderTopWidth: StyleSheet.hairlineWidth }]}
              >
                <View style={styles.itemLeft}>
                  <Text style={[styles.itemName, { color: zone.text }]}>{item.name}</Text>
                  <View style={styles.itemTrend}>
                    <Sparkline values={item.trend} width={70} height={22} stroke={zone.accent} />
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[styles.itemBalance, { color: zone.text }]}>
                    {formatNum(item.balance)}
                    <Text style={[styles.itemUnit, { color: zone.muted }]}> {item.unit}</Text>
                  </Text>
                  {item.low && (
                    <View style={[styles.lowPill, { backgroundColor: 'rgba(255,197,87,0.16)' }]}>
                      <Text style={styles.lowText}>low</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </GlassCard>
        </Animated.View>
      </ScrollView>

      <Animated.View
        entering={FadeInDown.delay(240).duration(600)}
        style={[styles.nav, { paddingBottom: insets.bottom + 8 }]}
      >
        {[
          { icon: Home, label: 'Home', active: true },
          { icon: BedDouble, label: 'Rooms' },
          { icon: ShoppingBasket, label: 'To buy' },
          { icon: RefreshCcw, label: 'Sync' },
        ].map((n) => {
          const Icon = n.icon;
          return (
            <Pressable key={n.label} style={styles.navItem}>
              <View>
                <Icon size={20} color={n.active ? zone.accent : zone.muted} />
                {n.label === 'To buy' && <View style={[styles.navDot, { backgroundColor: '#ffc557' }]} />}
              </View>
              <Text style={[styles.navLabel, { color: n.active ? zone.text : zone.muted }]}>
                {n.label}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>

      <GlassSheet visible={sheetOpen} theme={zone} onClose={() => setSheetOpen(false)} />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 18,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoneName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroBottom: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  heroNumber: {
    fontSize: 68,
    fontWeight: '300',
    letterSpacing: -2,
  },
  heroUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagline: {
    fontSize: 14,
    marginTop: 2,
  },
  forecastCard: {
    marginTop: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  deltaPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deltaText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  actionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  itemLeft: {
    gap: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemTrend: {
    width: 70,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemBalance: {
    fontSize: 17,
    fontWeight: '700',
  },
  itemUnit: {
    fontSize: 13,
    fontWeight: '500',
  },
  lowPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lowText: {
    color: '#ffc557',
    fontSize: 11,
    fontWeight: '700',
  },
  nav: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(18, 16, 28, 0.55)',
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    gap: 3,
  },
  navDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});