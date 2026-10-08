import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Noury — No Worries',
    short_name: 'Noury',
    description: 'Playful path toward freshness and healthy living: fruit, water, food, refreshing lifestyle.',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FAFCFB',
    theme_color: '#47957F',
    orientation: 'any',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    categories: ['shopping', 'business', 'productivity'],
  };
}
