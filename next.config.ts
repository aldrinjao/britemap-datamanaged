import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // deck.gl and maplibre-gl are ESM-only; transpile them for the Next.js bundler
  transpilePackages: [
    'maplibre-gl',
    '@deck.gl/core',
    '@deck.gl/react',
    '@deck.gl/layers',
    '@deck.gl/aggregation-layers',
    '@deck.gl/mapbox',
  ],
}

export default nextConfig
