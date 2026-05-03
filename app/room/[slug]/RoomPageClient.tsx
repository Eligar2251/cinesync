// app/room/[slug]/RoomPageClient.tsx
'use client'

import { useEffect } from 'react'
import { RoomLayout }   from '@/components/Room/RoomLayout'
import { useRoomSync }  from '@/lib/useRoomSync'
import { useUserStore } from '@/store/user.store'
import { useRoomStore } from '@/store/room.store'

interface RoomPageClientProps {
  slug:   string
  hostId: string
  token:  string
}

export function RoomPageClient({ slug, hostId, token }: RoomPageClientProps) {
  useRoomSync({ slug, hostId, token })

  return <RoomLayout slug={slug} />
}