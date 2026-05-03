// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kinopoiskapiunofficial.tech',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.mds.yandex.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.kinopoisk.ru',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'st.kp.yandex.net',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
}

export default nextConfig