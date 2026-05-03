// app/room/[slug]/page.tsx
import { Suspense } from 'react'
import { RoomPageClient } from './page-client' // Новый компонент

interface PageProps {
  params: { slug: string }
}

export default function RoomPage({ params }: PageProps) {
  return (
    <Suspense fallback={null}>
      <RoomPageClient slug={params.slug} />
    </Suspense>
  )
}