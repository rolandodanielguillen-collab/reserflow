import { redirect } from "next/navigation"

// NextAuth handles OAuth callbacks at /api/auth/callback/[provider]
// This legacy route just redirects to dashboard
export async function GET() {
  redirect("/dashboard")
}
