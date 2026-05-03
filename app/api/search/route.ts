// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import type {
  KPFilm,
  KPFilmRaw,
  KPSearchResponse,
  KPSearchResponseRaw,
  KPTopResponseRaw,
} from '@/lib/kp.types'

const KP_API_URL = process.env.KP_API_URL ?? 'https://kinopoiskapiunofficial.tech/api'
const KP_API_KEY = process.env.KP_API_KEY ?? ''

async function kpFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${KP_API_URL}${path}`, {
    headers: {
      'X-API-KEY': KP_API_KEY,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`KP API error: ${res.status}`)
  }

  return res.json() as Promise<T>
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeFilm(raw: KPFilmRaw): KPFilm | null {
  const kinopoiskId = raw.kinopoiskId ?? raw.filmId ?? null
  if (!kinopoiskId || !Number.isFinite(kinopoiskId)) return null

  return {
    kinopoiskId,
    imdbId: raw.imdbId ?? null,
    nameRu: raw.nameRu ?? null,
    nameEn: raw.nameEn ?? null,
    nameOriginal: raw.nameOriginal ?? null,
    countries: raw.countries ?? [],
    genres: raw.genres ?? [],
    ratingKinopoisk: raw.ratingKinopoisk ?? toNumber(raw.rating) ?? null,
    ratingImdb: raw.ratingImdb ?? null,
    year: toNumber(raw.year),
    type: raw.type ?? 'FILM',
    posterUrl: raw.posterUrl ?? '',
    posterUrlPreview: raw.posterUrlPreview ?? raw.posterUrl ?? '',
  }
}

function dedupeFilms(films: KPFilm[]): KPFilm[] {
  const seen = new Set<number>()
  const result: KPFilm[] = []

  for (const film of films) {
    if (seen.has(film.kinopoiskId)) continue
    seen.add(film.kinopoiskId)
    result.push(film)
  }

  return result
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const query = searchParams.get('q')?.trim() ?? ''
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const type = searchParams.get('type') ?? 'top'

  try {
    if (query.length > 0) {
      const raw = await kpFetch<KPSearchResponseRaw>(
        `/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(query)}&page=${page}`
      )

      const films = dedupeFilms(
        raw.films
          .map(normalizeFilm)
          .filter((film): film is KPFilm => film !== null)
      )

      const response: KPSearchResponse = {
        keyword: raw.keyword,
        pagesCount: raw.pagesCount,
        searchFilmsCountResult: films.length,
        films,
      }

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      })
    }

    const topType = type === 'popular' ? 'TOP_100_POPULAR_FILMS' : 'TOP_250_BEST_FILMS'
    const raw = await kpFetch<KPTopResponseRaw>(
      `/v2.2/films/top?type=${topType}&page=${page}`
    )

    const films = dedupeFilms(
      raw.films
        .map(normalizeFilm)
        .filter((film): film is KPFilm => film !== null)
    )

    const response: KPSearchResponse = {
      keyword: '',
      pagesCount: raw.pagesCount,
      searchFilmsCountResult: films.length,
      films,
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json(
      { error: 'Не удалось получить данные' },
      { status: 502 }
    )
  }
}