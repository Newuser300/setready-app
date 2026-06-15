import { FILM_REGIONS, getRegionFromCity } from './film-regions'

export const LEAVE_BY_BUFFER_MINUTES = 90

// ── Location resolution ───────────────────────────────────────────────────────

export function resolveLocationToCoords(
  locationText: string | null | undefined
): { lat: number; lng: number; regionName: string } | null {
  if (!locationText?.trim()) return null

  const regionCode = getRegionFromCity(locationText.trim())
  if (!regionCode) return null

  const region = FILM_REGIONS[regionCode]
  if (!region) return null

  return {
    lat: region.latitudeCenter,
    lng: region.longitudeCenter,
    regionName: region.name,
  }
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

// ── Leave-by estimate ─────────────────────────────────────────────────────────

export function computeLeaveBy(callTime: string | null | undefined): string | null {
  if (!callTime) return null
  const parts = callTime.split(':')
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1] ?? '0', 10)
  if (isNaN(h) || isNaN(m)) return null

  const totalMin = h * 60 + m
  const leaveTotal = ((totalMin - LEAVE_BY_BUFFER_MINUTES) % 1440 + 1440) % 1440
  const leaveH = Math.floor(leaveTotal / 60)
  const leaveM = leaveTotal % 60

  function fmt12(hour: number, min: number) {
    const ampm = hour < 12 ? 'AM' : 'PM'
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${h12}:${String(min).padStart(2, '0')} ${ampm}`
  }

  return `Call ${fmt12(h, m)} · Leave by ~${fmt12(leaveH, leaveM)} (allow ${LEAVE_BY_BUFFER_MINUTES} min)`
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

// ── Open-Meteo fetch ──────────────────────────────────────────────────────────

const FORECAST_WINDOW_DAYS = 16

export async function fetchBookingWeather(
  locationText: string | null | undefined,
  shootDate: string
): Promise<WeatherResult | null> {
  const coords = resolveLocationToCoords(locationText)
  if (!coords) return null

  // Respect the 16-day forecast window
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
