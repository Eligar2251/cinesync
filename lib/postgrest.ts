// lib/postgrest.ts
const POSTGREST_URL = process.env.POSTGREST_URL ?? 'http://127.0.0.1:3003'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string
  headers?: Record<string, string>
  prefer?: string
}

async function pgRequest<T>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    token,
    headers = {},
    prefer,
  } = opts

  const reqHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...headers,
  }

  if (token) {
    reqHeaders.Authorization = `Bearer ${token}`
  }

  if (prefer) {
    reqHeaders.Prefer = prefer
  }

  const res = await fetch(`${POSTGREST_URL}/${path}`, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PostgREST ${method} /${path} → ${res.status}: ${err}`)
  }

  const text = await res.text()
  return text ? JSON.parse(text) : ([] as T)
}

export const db = {
  get: <T>(
    path: string,
    opts?: Omit<RequestOptions, 'method' | 'body'>
  ) => pgRequest<T>(path, { ...opts, method: 'GET' }),

  post: <T>(
    path: string,
    body: unknown,
    opts?: Omit<RequestOptions, 'method'>
  ) =>
    pgRequest<T>(path, {
      ...opts,
      method: 'POST',
      body,
      prefer: opts?.prefer ?? 'return=representation',
    }),

  patch: <T>(
    path: string,
    body: unknown,
    opts?: Omit<RequestOptions, 'method'>
  ) =>
    pgRequest<T>(path, {
      ...opts,
      method: 'PATCH',
      body,
      prefer: opts?.prefer ?? 'return=representation',
    }),

  delete: <T>(
    path: string,
    opts?: Omit<RequestOptions, 'method' | 'body'>
  ) => pgRequest<T>(path, { ...opts, method: 'DELETE' }),
}