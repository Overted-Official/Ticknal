import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QuantEGX Trading Platform',
    short_name: 'QuantEGX',
    description: 'Advanced Algorithmic Trading Platform for the EGX',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#06101A',
    theme_color: '#06101A',
    icons: [
      {
        src: '/icon-192x192.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
      },
      {
        src: '/icon-512x512.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  }
}
