// app/room/[slug]/page.tsx
import { Suspense } from 'react'
import { RoomPageClient } from './page-client'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function RoomPage({ params }: PageProps) {
  const { slug } = await params

  return (
    <Suspense fallback={null}>
      <RoomPageClient slug={slug} />
    </Suspense>
  )
}