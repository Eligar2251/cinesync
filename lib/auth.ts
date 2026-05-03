// lib/auth.ts
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-dev-secret-32-chars-minimum'
)

const JWT_ISSUER = process.env.JWT_ISSUER ?? 'cinesync'
const JWT_EXPIRY = process.env.JWT_EXPIRY ?? '7d'
const REFRESH_EXP = process.env.REFRESH_TOKEN_EXPIRY ?? '30d'

export interface TokenPayload extends JWTPayload {
  sub: string
  role: 'authenticated'
  username: string
  email?: string
  chatColor: string
  isGuest: boolean
}

export async function signAccessToken(
  payload: Omit<TokenPayload, 'iss' | 'iat' | 'role'>
): Promise<string> {
  return new SignJWT({
    ...payload,
    role: 'authenticated',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET)
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({
    sub: userId,
    role: 'authenticated',
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setExpirationTime(REFRESH_EXP)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET, {
    issuer: JWT_ISSUER,
  })

  return payload as TokenPayload
}

export async function getSessionFromCookies(): Promise<TokenPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) return null

  try {
    return await verifyToken(token)
  } catch {
    return null
  }
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  const isProd = process.env.NODE_ENV === 'production'

  const accessMaxAge = 7 * 24 * 60 * 60
  const refreshMaxAge = 30 * 24 * 60 * 60

  const baseCookie = [
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    isProd ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')

  res.headers.append(
    'Set-Cookie',
    `access_token=${accessToken}; ${baseCookie}; Max-Age=${accessMaxAge}`
  )

  res.headers.append(
    'Set-Cookie',
    `refresh_token=${refreshToken}; ${baseCookie}; Max-Age=${refreshMaxAge}`
  )
}

export function clearAuthCookies(res: Response): void {
  res.headers.append(
    'Set-Cookie',
    'access_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
  )

  res.headers.append(
    'Set-Cookie',
    'refresh_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
  )
}