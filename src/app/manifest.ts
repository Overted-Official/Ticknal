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
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      }
    ],
  }
}
