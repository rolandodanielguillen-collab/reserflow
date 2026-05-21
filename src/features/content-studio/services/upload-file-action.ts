'use server'

import { uploadFile } from '@/lib/storage'
import { auth } from '@/lib/auth'

/**
 * Server action to upload a file (as base64) to local storage.
 * Used by client-side code that can't directly access fs.
 */
export async function uploadFileFromClient(
  base64Data: string,
  folder: string,
  filename: string,
  contentType: string,
): Promise<{ url?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  try {
    const buffer = Buffer.from(base64Data, 'base64')
    const url = await uploadFile(buffer, folder, filename)
    return { url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error subiendo archivo' }
  }
}
