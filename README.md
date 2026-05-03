# CineSync

Приватные кинозалы в браузере. Синхронный просмотр, чат в реальном времени.

---

## Стек

| Слой | Технология |
|---|---|
| Frontend | Next.js 15, TypeScript, CSS Modules, Tailwind |
| Анимации | Framer Motion |
| Состояние | Zustand |
| Реалтайм | WebSocket (ws) — отдельный Node.js сервер |
| База данных | PostgreSQL + PostgREST |
| Авторизация | JWT (httpOnly cookies) |
| Иконки | Lucide React |
| Фильмы | kinopoiskapiunofficial.tech |

---

## Быстрый старт

### 1. Клонировать и установить зависимости

```bash
git clone https://github.com/yourname/cinesync
cd cinesync
npm install
```

### 2. Переменные окружения

Создайте `.env.local` в корне:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3002

POSTGREST_URL=http://localhost:3001
DATABASE_URL=postgres://authenticator:changeme_strong_password@localhost:5432/cinesync

JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars-long
JWT_ISSUER=cinesync
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d

KP_API_KEY=your-kinopoisk-api-key
KP_API_URL=https://kinopoiskapiunofficial.tech/api

BCRYPT_ROUNDS=10
WS_PORT=3002
```

### 3. База данных

```bash
# Создать БД
createdb cinesync

# Применить схему
psql -U postgres -d cinesync -f schema.sql
```

### 4. PostgREST

```bash
# Скачать с https://postgrest.org
# Запустить:
postgrest postgrest.conf
```

### 5. Caddy (опционально, для продакшена)

```bash
# Установить Caddy: https://caddyserver.com/docs/install
caddy run --config Caddyfile
```

### 6. WebSocket сервер

```bash
# Dev режим с hot-reload:
npm run ws:dev

# Продакшен:
npm run ws:start
```

### 7. Next.js приложение

```bash
# Dev:
npm run dev

# Продакшен:
npm run build && npm run start
```

---

## Структура проекта

```
app/              — Next.js App Router страницы и API routes
components/       — React компоненты (Player, Chat, Room, Search, Profile, UI)
lib/              — Утилиты (auth, ws-client, postgrest, providers)
store/            — Zustand stores (user, room)
ws-server/        — Node.js WebSocket сервер
public/           — Статика (uploads/avatars)
schema.sql        — Полная SQL схема
postgrest.conf    — PostgREST конфиг
Caddyfile         — Caddy reverse proxy конфиг
```

---

## Архитектура синхронизации

```
Хост ──PLAY/PAUSE/SEEK──► WS Server ──► broadcast ──► Все участники
                                │
                                └──► updatePlayerState (in-memory)

Участник ──TIME_UPDATE──► WS Server ──drift check──► SYNC_NEEDED ──► клиент
Участник ──SYNC_REQUEST──► WS Server ──► SYNC_RESPONSE ──► клиент
Хост ──SYNC_REQUEST──► WS Server ──► FORCE_SYNC ──► все участники
```

---

## KinoPoisk API

Получить бесплатный ключ: https://kinopoiskapiunofficial.tech

Лимиты бесплатного тира: 500 запросов в сутки.

---

## Производительность

- Все анимации только через `transform` и `opacity`
- `will-change: transform` только на активно анимируемых элементах
- Chat виртуализирован через `react-window` при > 200 сообщений
- WS сообщения батчатся через `requestAnimationFrame`
- Скелетон-экраны вместо спиннеров
- `next/dynamic` для тяжёлых компонентов (Player, Chat, SearchGrid)
- Shimmer анимация через CSS `@keyframes` (GPU-composited)
- Heartbeat каждые 30с для детекции зомби-соединений

---

## Деплой

| Сервис | Что деплоить |
|---|---|
| Vercel | Next.js приложение (auto-deploy из main) |
| Railway / Fly.io | WebSocket сервер (`ws-server/`) |
| Supabase / Neon | PostgreSQL + PostgREST |
| Cloudflare | CDN для статики |

### Railway — WS сервер

```bash
# railway.json
{
  "build": { "builder": "nixpacks" },
  "deploy": { "startCommand": "npx tsx ws-server/index.ts" }
}
```

### Переменные на Vercel

```
NEXT_PUBLIC_WS_URL=wss://your-ws.railway.app
NEXT_PUBLIC_APP_URL=https://cinesync.vercel.app
JWT_SECRET=...
KP_API_KEY=...
POSTGREST_URL=https://your-postgrest.supabase.co
```