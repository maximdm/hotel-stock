import type { ZoneId } from './theme';

export interface PocItem {
  name: string;
  unit: string;
  balance: number;
  trend: number[];
  low?: boolean;
  kind: 'food' | 'tool' | 'soft' | 'bev' | 'linen' | 'spare';
}

export const fakeItems: Record<ZoneId, PocItem[]> = {
  restaurant: [
    { name: 'Milk 1L', unit: 'L', balance: 12, trend: [14, 13, 11, 12, 10, 9, 12], low: true, kind: 'bev' },
    { name: 'Pasta', unit: 'kg', balance: 8.5, trend: [9, 8.6, 9.2, 8.8, 9, 8.2, 8.5], kind: 'food' },
    { name: 'Espresso beans', unit: 'kg', balance: 3.2, trend: [4, 3.8, 3.5, 3.6, 3.4, 3.1, 3.2], kind: 'bev' },
    { name: 'Bar peanuts', unit: 'pcs', balance: 40, trend: [44, 41, 39, 42, 38, 41, 40], kind: 'food' },
    { name: 'Table linens', unit: 'set', balance: 6, trend: [8, 8, 7, 7, 6, 6, 6], low: true, kind: 'linen' },
  ],
  patio: [
    { name: 'Shade umbrellas', unit: 'pcs', balance: 4, trend: [6, 6, 5, 5, 4, 4, 4], low: true, kind: 'soft' },
    { name: 'Cushion sets', unit: 'set', balance: 11, trend: [12, 11, 11, 10, 10, 11, 11], kind: 'soft' },
    { name: 'Ice buckets', unit: 'pcs', balance: 18, trend: [20, 18, 19, 17, 18, 18, 18], kind: 'soft' },
    { name: 'String lights', unit: 'roll', balance: 3, trend: [4, 4, 3, 3, 3, 2, 3], kind: 'soft' },
  ],
  technical: [
    { name: 'LED bulbs', unit: 'pcs', balance: 25, trend: [30, 27, 28, 26, 25, 24, 25], kind: 'spare' },
    { name: 'Plumbing tape', unit: 'roll', balance: 9, trend: [10, 10, 9, 9, 8, 9, 9], kind: 'spare' },
    { name: 'Fuses 10A', unit: 'pcs', balance: 8, trend: [12, 10, 11, 9, 8, 8, 8], low: true, kind: 'spare' },
    { name: 'Contact cleaner', unit: 'can', balance: 2, trend: [4, 3, 3, 2, 2, 2, 2], low: true, kind: 'tool' },
  ],
  main: [
    { name: 'Napkin packs', unit: 'box', balance: 22, trend: [26, 24, 25, 23, 22, 21, 22], kind: 'linen' },
    { name: 'Paper towels', unit: 'box', balance: 5, trend: [9, 8, 7, 6, 6, 5, 5], low: true, kind: 'linen' },
    { name: 'Dishwasher salt', unit: 'bag', balance: 4, trend: [6, 5, 5, 4, 4, 4, 4], kind: 'tool' },
    { name: 'Detergent 5L', unit: 'can', balance: 7, trend: [9, 8, 8, 7, 7, 7, 7], kind: 'tool' },
  ],
};

export interface PocTrend {
  label: string;
  value: number;
  delta: number;
}

export const fakeTrend: Record<ZoneId, PocTrend[]> = {
  restaurant: [
    { label: 'Mon', value: 82, delta: 0 },
    { label: 'Tue', value: 79, delta: -3 },
    { label: 'Wed', value: 84, delta: 5 },
    { label: 'Thu', value: 77, delta: -7 },
    { label: 'Fri', value: 91, delta: 14 },
    { label: 'Sat', value: 96, delta: 5 },
    { label: 'Sun', value: 88, delta: -8 },
  ],
  patio: [
    { label: 'Mon', value: 34, delta: 0 },
    { label: 'Tue', value: 41, delta: 7 },
    { label: 'Wed', value: 38, delta: -3 },
    { label: 'Thu', value: 29, delta: -9 },
    { label: 'Fri', value: 47, delta: 18 },
    { label: 'Sat', value: 52, delta: 5 },
    { label: 'Sun', value: 44, delta: -8 },
  ],
  technical: [
    { label: 'Mon', value: 41, delta: 0 },
    { label: 'Tue', value: 40, delta: -1 },
    { label: 'Wed', value: 42, delta: 2 },
    { label: 'Thu', value: 39, delta: -3 },
    { label: 'Fri', value: 43, delta: 4 },
    { label: 'Sat', value: 42, delta: -1 },
    { label: 'Sun', value: 41, delta: -1 },
  ],
  main: [
    { label: 'Mon', value: 210, delta: 0 },
    { label: 'Tue', value: 196, delta: -14 },
    { label: 'Wed', value: 184, delta: -12 },
    { label: 'Thu', value: 172, delta: -12 },
    { label: 'Fri', value: 245, delta: 73 },
    { label: 'Sat', value: 238, delta: -7 },
    { label: 'Sun', value: 231, delta: -7 },
  ],
};

export type SyncState = 'live' | 'queued' | 'offline';

export interface PocSync {
  state: SyncState;
  label: string;
}

export const fakeSync: PocSync = { state: 'live', label: 'Synced · just now' };