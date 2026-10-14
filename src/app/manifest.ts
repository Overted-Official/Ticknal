import { MetadataRoute } from 'next'

const APP_THEME_COLOR = '#000000';
const ICON_VERSION = 'v=7';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ticknal Trading Platform',
    short_name: 'Ticknal',
    description: 'Advanced Algorithmic Trading Platform for the EGX',
    start_url: '/home',
    scope: '/',
    id: '/home',
    display: 'standalone',
    orientation: 'portrait',
    background_color: APP_THEME_COLOR,
    theme_color: APP_THEME_COLOR,
    icons: [
      {
        src: `/icon-512x512.png?${ICON_VERSION}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/icon-192x192.png?${ICON_VERSION}`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/icon-384x384.png?${ICON_VERSION}`,
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/icon-maskable-512x512.png?${ICON_VERSION}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `/icon-maskable-192x192.png?${ICON_VERSION}`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `/Ticknal_icon.svg?${ICON_VERSION}`,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}

