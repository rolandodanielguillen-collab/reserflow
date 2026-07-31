import { NextResponse } from "next/server"
import { publishDuePosts } from "@/features/scheduler/services/publish-due"
import { warnExpiringMetaTokens } from "@/features/scheduler/services/token-watch"
import { refreshStaleInsights } from "@/features/scheduler/services/insights"

export async function GET(request: Request) {
  console.log("[Cron] === Publish-scheduled START ===", new Date().toISOString())

  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET env var is NOT SET")
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error("[Cron] Auth failed.")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await warnExpiringMetaTokens().catch(e => console.error("[Cron] token-watch:", e))
  await refreshStaleInsights().catch(e => console.error("[Cron] insights:", e))
  const result = await publishDuePosts()
  return NextResponse.json(result)
}
