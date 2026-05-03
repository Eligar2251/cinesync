// lib/kp.types.ts

export interface KPCountry {
  country: string
}

export interface KPGenre {
  genre: string
}

/**
 * Нормализованный фильм — только этот тип используется на фронте.
 */
export interface KPFilm {
  kinopoiskId: number
  imdbId: string | null
  nameRu: string | null
  nameEn: string | null
  nameOriginal: string | null
  countries: KPCountry[]
  genres: KPGenre[]
  ratingKinopoisk: number | null
  ratingImdb: number | null
  year: number | null
  type: string
  posterUrl: string
  posterUrlPreview: string
}

/**
 * Raw фильм из любого эндпоинта KP API.
 * Все поля optional — разные эндпоинты возвращают разные наборы.
 */
export interface KPFilmRaw {
  filmId?: number
  kinopoiskId?: number
  imdbId?: string | null
  nameRu?: string | null
  nameEn?: string | null
  nameOriginal?: string | null
  countries?: KPCountry[]
  genres?: KPGenre[]
  rating?: string | number | null
  ratingKinopoisk?: number | null
  ratingImdb?: number | null
  ratingVoteCount?: number
  year?: string | number | null
  type?: string
  posterUrl?: string
  posterUrlPreview?: string
}

export interface KPSearchResponseRaw {
  keyword: string
  pagesCount: number
  searchFilmsCountResult: number
  films: KPFilmRaw[]
}

export interface KPTopResponseRaw {
  pagesCount: number
  films: KPFilmRaw[]
}

export interface KPSearchResponse {
  keyword: string
  pagesCount: number
  searchFilmsCountResult: number
  films: KPFilm[]
}