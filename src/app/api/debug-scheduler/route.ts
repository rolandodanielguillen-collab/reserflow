import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const MAX_RETRIES = 3

export async function GET() {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()

  // Posts scheduled and due
  const { data: scheduledDue } = await supabase
    .from('carousels')
    .select('id, title, status, scheduled_at, fail_reason, retry_count')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)

  // Failed posts eligible for retry
  const { data: failedRetryable } = await supabase
    .from('carousels')
    .select('id, title, status, scheduled_at, fail_reason, retry_count')
    .eq('status', 'failed')
    .lte('scheduled_at', now)
    .lt('retry_count', MAX_RETRIES)

  // All failed posts (including exhausted retries)
  const { data: allFailed } = await supabase
    .from('carousels')
    .select('id, title, status, scheduled_at, fail_reason, retry_count, updated_at')
    .eq('status', 'failed')
    .order('updated_at', { ascending: false })
    .limit(10)

  // Future scheduled posts
  const { data: futureScheduled } = await supabase
    .from('carousels')
    .select('id, title, status, scheduled_at')
    .eq('status', 'scheduled')
    .gt('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(5)

  // Config check
  const envCheck = {
    CRON_SECRET: !!process.env.CRON_SECRET,
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
    VERCEL_URL: process.env.VERCEL_URL ?? 'NOT SET',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'NOT SET',
  }

  return NextResponse.json({
    now,
    env: envCheck,
    ready_to_publish: scheduledDue ?? [],
    failed_retryable: failedRetryable ?? [],
    recent_failures: allFailed ?? [],
    next_scheduled: futureScheduled ?? [],
  })
}
