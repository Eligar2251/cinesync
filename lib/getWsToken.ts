// lib/getWsToken.ts
import { cookies } from 'next/headers'

export async function getWsToken(): Promise<string | null> {
  const store = await cookies()
  return store.get('access_token')?.value ?? null
}