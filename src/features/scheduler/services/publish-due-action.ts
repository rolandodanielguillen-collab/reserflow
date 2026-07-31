'use server'

import { auth } from '@/lib/auth'
import { publishDuePosts, type PublishDueResult } from './publish-due'

/** Server action detrás del botón "Publicar programados" del Studio. */
export async function runDuePublishes(): Promise<PublishDueResult | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }
  return publishDuePosts()
}
