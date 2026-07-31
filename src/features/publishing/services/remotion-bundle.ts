import path from "path"
import { bundle } from "@remotion/bundler"

// Bundle Remotion una sola vez por proceso; stills y reels comparten el serveUrl.
let cached: Promise<string> | null = null

export function getRemotionBundle(): Promise<string> {
  if (!cached) {
    cached = bundle({
      entryPoint: path.resolve(process.cwd(), "src/features/content-studio/remotion/index.ts"),
      webpackOverride: (cfg) => cfg,
    })
    cached.catch(() => {
      cached = null
    })
  }
  return cached
}
