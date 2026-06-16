import { resolveLocationToRegion } from './film-regions'

// ── Location resolution ───────────────────────────────────────────────────────

export function resolveLocationToCoords(
  locationText: string | null | undefined
): { lat: number; lng: number; regionName: string } | null {
  if (!locationText?.trim()) return null
  const r = resolveLocationToRegion(locationText.trim())
  if (!r) return null
  return { lat: r.lat, lng: r.lng, regionName: r.name }
}

// ── Weather advisory ──────────────────────────────────────────────────────────

export function computeAdvisory(precipProb: number, tempMax: number, windspeed: number): string {
  if (precipProb >= 60) return 'Rain likely — bring rain gear'
  if (precipProb >= 30) return 'Possible showers — pack a layer'
  if (tempMax <= 5) return 'Cold — dress warm under wardrobe'
  if (windspeed >= 50) return 'Windy on set'
  return 'Clear conditions expected'
}

export function advisoryIcon(advisory: string): string {
  if (advisory.startsWith('Rain likely')) return '🌧️'
  if (advisory.startsWith('Possible')) return '🌦️'
  if (advisory.startsWith('Cold')) return '🥶'
  if (advisory.startsWith('Windy')) return '💨'
  return '☀️'
}

// ── Weather result type ───────────────────────────────────────────────────────

export interface WeatherResult {
  tempMax: number
  tempMin: number
  precipProb: number
  windspeed: number
  advisory: string
  icon: string
  regionName: string
}

// ── Open-Meteo fetch (16-day window, no key required) ─────────────────────────

const FORECAST_WINDOW_DAYS = 16

export async function fetchBookingWeather(
  locationText: string | null | undefined,
  shootDate: string
): Promise<WeatherResult | null> {
  const coords = resolveLocationToCoords(locationText)
  if (!coords) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const shoot = new Date(shootDate + 'T00:00:00')
  const daysAway = Math.ceil((shoot.getTime() - today.getTime()) / 86400000)
  if (daysAway > FORECAST_WINDOW_DAYS || daysAway < 0) return null

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${coords.lat}&longitude=${coords.lng}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,windspeed_10m_max` +
    `&timezone=America%2FVancouver` +
    `&start_date=${shootDate}&end_date=${shootDate}`

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } } as RequestInit)
    if (!res.ok) return null

    const data = await res.json()
    const daily = data.daily

    const tempMax = daily?.temperature_2m_max?.[0]
    if (tempMax === undefined || tempMax === null) return null

    const tempMin = Math.round(daily.temperature_2m_min[0] ?? 0)
    const precipProb = daily.precipitation_probability_max[0] ?? 0
    const windspeed = Math.round(daily.windspeed_10m_max[0] ?? 0)
    const advisory = computeAdvisory(precipProb, Math.round(tempMax), windspeed)

    return {
      tempMax: Math.round(tempMax),
      tempMin,
      precipProb,
      windspeed,
      advisory,
      icon: advisoryIcon(advisory),
      regionName: coords.regionName,
    }
  } catch {
    return null
  }
}
