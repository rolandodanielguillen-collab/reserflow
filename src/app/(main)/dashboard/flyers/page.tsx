import { FlyerEditor } from '@/features/flyers/FlyerEditor'

export default async function FlyersPage({
  searchParams,
}: {
  searchParams: Promise<{ piece?: string }>
}) {
  const { piece } = await searchParams
  return <FlyerEditor initialPieceId={piece ?? null} />
}
