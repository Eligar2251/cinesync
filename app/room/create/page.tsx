// app/room/create/page.tsx
import { Suspense } from 'react'
import { CreateRoomPageClient } from './page-client' // Новый компонент

export default function CreateRoomPage() {
  return (
    <Suspense fallback={null}>
      <CreateRoomPageClient />
    </Suspense>
  )
}