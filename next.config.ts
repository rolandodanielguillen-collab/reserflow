import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    mcpServer: true,
  },
  // Remotion and its bundler use native Node.js binaries — exclude them from
  // Turbopack/webpack bundling and let Node.js load them directly at runtime.
  serverExternalPackages: [
    '@remotion/renderer',
    '@remotion/bundler',
    '@remotion/compositor-win32-x64-msvc',
    '@remotion/compositor-darwin-arm64',
    '@remotion/compositor-darwin-x64',
    '@remotion/compositor-linux-x64-gnu',
    '@remotion/compositor-linux-x64-musl',
    'esbuild',
    'ffmpeg-static',
    'fluent-ffmpeg',
  ],
}

export default nextConfig
