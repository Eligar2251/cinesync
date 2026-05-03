// lib/providers.config.ts
export interface Provider {
  id: string
  label: string
  buildUrl: (kpId: string | number) => string
  supportedDubbings?: string[]
}

export const PROVIDERS: Provider[] = [
  {
    id: 'alloha',
    label: 'Alloha',
    buildUrl: (kpId) =>
      `https://allohastream.com/embed/${kpId}?token=0c9c98d3ded3e9c5370e5b66d3d62a&h=true`,
    supportedDubbings: ['Дубляж', 'Многоголосый', 'Оригинал', 'Субтитры'],
  },
  {
    id: 'turbo',
    label: 'Turbo',
    buildUrl: (kpId) =>
      `https://turbofilm.tv/embed/kinopoisk/${kpId}`,
    supportedDubbings: ['Дубляж', 'Многоголосый', 'Субтитры'],
  },
  {
    id: 'hdrezka',
    label: 'HDRezka',
    buildUrl: (kpId) =>
      `https://rezka.ag/embed/kinopoisk/${kpId}`,
    supportedDubbings: ['Дубляж', 'Оригинал', 'Субтитры'],
  },
  {
    id: 'collaps',
    label: 'Collaps',
    buildUrl: (kpId) =>
      `https://collaps.ru/embed/?kinopoisk_id=${kpId}`,
    supportedDubbings: ['Дубляж', 'Многоголосый', 'Субтитры'],
  },
]

export const DEFAULT_DUBBINGS = ['Дубляж', 'Многоголосый', 'Оригинал', 'Субтитры']

export function getProvider(id: string): Provider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0]!
}