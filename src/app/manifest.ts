import { MetadataRoute } from 'next'

const APP_THEME_COLOR = 'black';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ticknal Trading Platform',
    short_name: 'Ticknal',
    description: 'Advanced Algorithmic Trading Platform for the EGX',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: APP_THEME_COLOR,
    theme_color: APP_THEME_COLOR,
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/Ticknal_icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
