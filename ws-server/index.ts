// ws-server/index.ts
import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { jwtVerify } from 'jose'
import { roomManager } from './room.manager'
import { handleEvent } from './events.handler'

const PORT       = parseInt(process.env.WS_PORT ?? '3004', 10)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-dev-secret-32-chars-minimum'
)

export interface AuthenticatedSocket extends WebSocket {
  userId:    string
  username:  string
  chatColor: string
  isGuest:   boolean
  roomSlug:  string | null
  isAlive:   boolean
}

interface TokenPayload {
  sub:       string
  username:  string
  chatColor: string
  isGuest:   boolean
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

function extractToken(req: IncomingMessage): string | null {
  const url      = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const token    = url.searchParams.get('token')
  if (token) return token

  const auth     = req.headers['authorization']
  if (auth?.startsWith('Bearer ')) return auth.slice(7)

  return null
}

const wss = new WebSocketServer({ port: PORT })

// Heartbeat — keep connections alive, detect zombies
setInterval(() => {
  wss.clients.forEach((ws) => {
    const sock = ws as AuthenticatedSocket
    if (!sock.isAlive) {
      if (sock.roomSlug) {
        roomManager.leaveRoom(sock.roomSlug, sock.userId)
      }
      return sock.terminate()
    }
    sock.isAlive = false
    sock.ping()
  })
}, 30_000)

wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
  const sock = ws as AuthenticatedSocket
  sock.isAlive  = true
  sock.roomSlug = null

  // Auth
  const token = extractToken(req)
  if (!token) {
    sock.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Unauthorized' } }))
    sock.close(4001, 'Unauthorized')
    return
  }

  const payload = await verifyToken(token)
  if (!payload) {
    sock.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid token' } }))
    sock.close(4001, 'Invalid token')
    return
  }

  sock.userId    = payload.sub
  sock.username  = payload.username
  sock.chatColor = payload.chatColor
  sock.isGuest   = payload.isGuest

  // Send connection confirmation
  sock.send(JSON.stringify({ type: 'CONNECTED', payload: { userId: sock.userId } }))

  sock.on('pong', () => { sock.isAlive = true })

  sock.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { type: string; payload: Record<string, unknown> }
      handleEvent(sock, msg.type, msg.payload, wss)
    } catch {
      // ignore malformed messages
    }
  })

  sock.on('close', () => {
    if (sock.roomSlug) {
      roomManager.leaveRoom(sock.roomSlug, sock.userId)
      // Broadcast participant left
      const roomClients = getRoomClients(wss, sock.roomSlug)
      broadcast(roomClients, {
        type: 'PARTICIPANT_LEFT',
        payload: { userId: sock.userId },
      })
      broadcast(roomClients, {
        type: 'SYSTEM_MESSAGE',
        payload: {
          id:        crypto.randomUUID(),
          content:   `${sock.username} покинул комнату`,
          createdAt: Date.now(),
        },
      })

      // Auto host transfer if host disconnected
      const room = roomManager.getRoom(sock.roomSlug)
      if (room && room.hostId === sock.userId) {
        const nextParticipant = room.participants[0]
        if (nextParticipant) {
          room.hostId = nextParticipant.id
          broadcast(roomClients, {
            type: 'HOST_TRANSFERRED',
            payload: { newHostId: nextParticipant.id },
          })
        }
      }
    }
  })

  sock.on('error', (err) => {
    console.error(`[ws] socket error userId=${sock.userId}:`, err.message)
  })
})

wss.on('listening', () => {
  console.log(`[ws] CineSync WebSocket server listening on :${PORT}`)
})

wss.on('error', (err) => {
  console.error('[ws] server error:', err)
})

export function getRoomClients(
  server: WebSocketServer,
  slug: string
): AuthenticatedSocket[] {
  const clients: AuthenticatedSocket[] = []
  server.clients.forEach((ws) => {
    const sock = ws as AuthenticatedSocket
    if (sock.roomSlug === slug && sock.readyState === WebSocket.OPEN) {
      clients.push(sock)
    }
  })
  return clients
}

export function broadcast(
  clients: AuthenticatedSocket[],
  message: { type: string; payload: unknown },
  excludeId?: string
): void {
  const raw = JSON.stringify(message)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      if (excludeId && client.userId === excludeId) continue
      client.send(raw)
    }
  }
}