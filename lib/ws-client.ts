// lib/ws-client.ts
'use client'

type WSEventType =
  | 'CONNECTED'
  | 'ROOM_STATE'
  | 'PARTICIPANT_JOINED'
  | 'PARTICIPANT_LEFT'
  | 'PARTICIPANT_TIME_UPDATE'
  | 'PLAY'
  | 'PAUSE'
  | 'SEEK'
  | 'TIME_UPDATE'
  | 'CHANGE_PROVIDER'
  | 'CHANGE_DUBBING'
  | 'CHANGE_MOVIE'
  | 'CHAT_MESSAGE'
  | 'REACTION'
  | 'SYSTEM_MESSAGE'
  | 'SYNC_RESPONSE'
  | 'SYNC_NEEDED'
  | 'FORCE_SYNC'
  | 'HOST_TRANSFERRED'
  | 'ERROR'

type WSMessage = { type: WSEventType; payload: Record<string, unknown> }
type WSHandler = (payload: Record<string, unknown>) => void

const WS_URL        = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3004'
const RECONNECT_MS  = 2000
const MAX_RECONNECT = 10

class WSClient {
  private socket:       WebSocket | null = null
  private token:        string | null    = null
  private slug:         string | null    = null
  private handlers      = new Map<WSEventType, Set<WSHandler>>()
  private queue:        WSMessage[]      = []
  private reconnectCount                = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isIntentionalClose            = false
  private isConnecting                  = false

  // ─── Connection ────────────────────────────────────────────────────────────
  connect(token: string, slug: string): void {
    this.token            = token
    this.slug             = slug
    this.isIntentionalClose = false
    this.reconnectCount   = 0
    this._connect()
  }

  private _connect(): void {
    if (this.isConnecting) return
    if (this.socket?.readyState === WebSocket.OPEN) return

    this.isConnecting = true

    const url = `${WS_URL}?token=${encodeURIComponent(this.token ?? '')}`

    try {
      this.socket = new WebSocket(url)
    } catch {
      this.isConnecting = false
      this._scheduleReconnect()
      return
    }

    this.socket.onopen = () => {
      this.isConnecting   = false
      this.reconnectCount = 0

      // Flush queued messages
      const pending = [...this.queue]
      this.queue    = []
      for (const msg of pending) {
        this._sendRaw(msg)
      }

      this._emit('CONNECTED' as WSEventType, {})
    }

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as WSMessage
        this._emit(msg.type, msg.payload)
      } catch {
        // ignore
      }
    }

    this.socket.onclose = () => {
      this.isConnecting = false
      if (!this.isIntentionalClose) {
        this._scheduleReconnect()
      }
    }

    this.socket.onerror = () => {
      this.isConnecting = false
      // onclose will fire after onerror, handle reconnect there
    }
  }

  private _scheduleReconnect(): void {
    if (this.isIntentionalClose) return
    if (this.reconnectCount >= MAX_RECONNECT) {
      console.warn('[ws] max reconnect attempts reached')
      return
    }

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)

    const delay = Math.min(RECONNECT_MS * Math.pow(1.5, this.reconnectCount), 30_000)
    this.reconnectCount++

    this.reconnectTimer = setTimeout(() => {
      this._connect()
    }, delay)
  }

  disconnect(): void {
    this.isIntentionalClose = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.socket?.close(1000, 'Client disconnect')
    this.socket    = null
    this.token     = null
    this.slug      = null
    this.queue     = []
    this.reconnectCount = 0
  }

  // ─── Sending ───────────────────────────────────────────────────────────────
  send(message: { type: string; payload: Record<string, unknown> }): void {
    const msg = message as WSMessage
    if (this.socket?.readyState === WebSocket.OPEN) {
      this._sendRaw(msg)
    } else {
      // Queue message for when connection is restored
      if (this.queue.length < 50) {
        this.queue.push(msg)
      }
    }
  }

  private _sendRaw(msg: WSMessage): void {
    try {
      this.socket?.send(JSON.stringify(msg))
    } catch {
      this.queue.push(msg)
    }
  }

  // ─── Event handlers ────────────────────────────────────────────────────────
  on(event: WSEventType, handler: WSHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)

    // Return unsubscribe function
    return () => this.handlers.get(event)?.delete(handler)
  }

  off(event: WSEventType, handler: WSHandler): void {
    this.handlers.get(event)?.delete(handler)
  }

  private _emit(event: WSEventType, payload: Record<string, unknown>): void {
    this.handlers.get(event)?.forEach((h) => {
      try { h(payload) } catch (err) { console.error('[ws] handler error:', err) }
    })
  }

  get isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  get currentSlug(): string | null {
    return this.slug
  }
}

// Singleton
export const wsClient = new WSClient()