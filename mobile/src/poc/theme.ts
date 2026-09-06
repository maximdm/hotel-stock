export type ZoneId = 'restaurant' | 'patio' | 'technical' | 'main';

export interface ZoneTheme {
  id: ZoneId;
  name: string;
  short: string;
  tagline: string;
  gradient: [string, string, string];
  accent: string;
  glass: string;
  glassStrong: string;
  border: string;
  text: string;
  muted: string;
  forecast: string;
}

export const zones: Record<ZoneId, ZoneTheme> = {
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant',
    short: 'Restaurant',
    tagline: 'Warm evenings · fresh produce',
    gradient: ['#260f17', '#6e2428', '#d97a49'],
    accent: '#f5c26b',
    glass: 'rgba(255, 255, 255, 0.09)',
    glassStrong: 'rgba(30, 18, 24, 0.72)',
    border: 'rgba(255, 255, 255, 0.20)',
    text: '#fff7ef',
    muted: 'rgba(255, 247, 239, 0.62)',
    forecast: 'Breakfast forecast · Restaurant',
  },
  patio: {
    id: 'patio',
    name: 'Patio',
    short: 'Patio',
    tagline: 'Golden hour · open air',
    gradient: ['#180f33', '#55276b', '#f0914c'],
    accent: '#ffd8a8',
    glass: 'rgba(255, 255, 255, 0.09)',
    glassStrong: 'rgba(28, 16, 42, 0.72)',
    border: 'rgba(255, 255, 255, 0.20)',
    text: '#fff6ec',
    muted: 'rgba(255, 246, 236, 0.62)',
    forecast: 'Patio season · weather dependent',
  },
  technical: {
    id: 'technical',
    name: 'Technical',
    short: 'Technical',
    tagline: 'Tools · spares · deep storage',
    gradient: ['#0a121d', '#142f47', '#3a6b92'],
    accent: '#8fd0ff',
    glass: 'rgba(255, 255, 255, 0.09)',
    glassStrong: 'rgba(10, 18, 29, 0.74)',
    border: 'rgba(255, 255, 255, 0.20)',
    text: '#f0f7ff',
    muted: 'rgba(240, 247, 255, 0.60)',
    forecast: 'Technical spares · low mobility stock',
  },
  main: {
    id: 'main',
    name: 'Main Storage',
    short: 'Storage',
    tagline: 'Receiving hub · bulk orders',
    gradient: ['#0d2030', '#194555', '#67a2b3'],
    accent: '#9be8ff',
    glass: 'rgba(255, 255, 255, 0.09)',
    glassStrong: 'rgba(9, 24, 34, 0.74)',
    border: 'rgba(255, 255, 255, 0.20)',
    text: '#f0fbff',
    muted: 'rgba(240, 251, 255, 0.60)',
    forecast: 'Main storage · next delivery',
  },
};

export const zoneOrder: ZoneId[] = ['restaurant', 'patio', 'technical', 'main'];