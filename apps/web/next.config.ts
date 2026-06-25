import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,

  // Performance: enable output file tracing for smaller production builds
  output: process.env['NODE_ENV'] === 'production' ? 'standalone' : undefined,

  // Performance: compress static assets
  compress: true,

  // Performance: enable React compiler optimizations
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-avatar',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-switch',
      '@radix-ui/react-label',
      '@radix-ui/react-separator',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-popover',
    ],
  },

  images: {
    // Performance: use modern image formats
    formats: ['image/avif', 'image/webp'],
    // Performance: optimize device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // 24h image cache
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '*.reno-system.com' },
    ],
  },

  // Performance: HTTP cache headers for static assets
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/:path*`,
      },
    ]
  },
}

export default nextConfig
