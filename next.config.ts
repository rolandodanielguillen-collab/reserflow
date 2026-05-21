import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/compositor-linux-x64-gnu",
    "esbuild",
    "ffmpeg-static",
    "fluent-ffmpeg",
  ],
}

export default nextConfig
