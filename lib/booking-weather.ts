import { resolveLocationToRegion } from './film-regions'

export const LEAVE_BY_BUFFER_MINUTES = 90  // fallback when routing unavailable
export const CHECK_IN_BUFFER_MINUTES = 45  // parking + BG check-in buffer

// ── Time helpers ──────────────────────────────────────────────────────────────

function parseHHMM(callTime: string): { h: number; m: number } | null {
  const parts = callTime.split(':')
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1] ?? '0', 10)
  return isNaN(h) || isNaN(m) ? null : { h, m }
}

function fmt12(hour: number, min: number): string {
  const ampm = hour < 12 ? 'AM' : 'PM'
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`
}

function subtractMinutes(h: number, m: number, minutes: number): string {
  const total = ((h * 60 + m - minutes) % 1440 + 1440) % 1440
  return fmt12(Math.floor(total / 60), total % 60)
}

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

// ── OSRM routing (public demo, no key required) ───────────────────────────────

async function fetchDriveMinutes(
  originLat: number, originLng: number,
  destLat: number, destLng: number,
): Promise<number | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${originLng},${originLat};${destLng},${destLat}?overview=false`

  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), 4000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(tid)
    if (!res.ok) return null
    const data = await res.json()
    const seconds: unknown = data?.routes?.[0]?.duration
    return typeof seconds === 'number' ? Math.ceil(seconds / 60) : null
  } catch {
    clearTimeout(tid)
    return null
  }
}

// ── Commute result ────────────────────────────────────────────────────────────

export interface CommuteResult {
  driveMinutes: number | null
  leaveBy: string
  arriveBy: string
  label: string
  isFallback: boolean
}

export async function computeCommute(
  callTime: string | null | undefined,
  homeLat: number | null | undefined,
  homeLng: number | null | undefined,
  destLat: number | null | undefined,
  destLng: number | null | undefined,
): Promise<CommuteResult | null> {
  if (!callTime) return null
  const parsed = parseHHMM(callTime)
  if (!parsed) return null
  const { h, m } = parsed
  const arriveBy = subtractMinutes(h, m, CHECK_IN_BUFFER_MINUTES)

  // No home location → 90-min fallback, nudge user to add home city
  if (!homeLat || !homeLng) {
    const leaveBy = subtractMinutes(h, m, LEAVE_BY_BUFFER_MINUTES)
    return {
      driveMinutes: null,
      leaveBy,
      arriveBy,
      label: `Leave by ~${leaveBy} (estimate — add home location for real drive times)`,
      isFallback: true,
    }
  }

  // Destination unresolvable → hide the commute line entirely
  if (!destLat || !destLng) return null

  const driveMinutes = await fetchDriveMinutes(homeLat, homeLng, destLat, destLng)

  if (driveMinutes === null) {
    // OSRM failed or timed out — fall back to 90-min buffer
    const leaveBy = subtractMinutes(h, m, LEAVE_BY_BUFFER_MINUTES)
    return {
      driveMinutes: null,
      leaveBy,
      arriveBy,
      label: `Leave by ~${leaveBy} (estimate — routing unavailable)`,
      isFallback: true,
    }
  }

  const leaveBy = subtractMinutes(h, m, driveMinutes + CHECK_IN_BUFFER_MINUTES)
  return {
    driveMinutes,
    leaveBy,
    arriveBy,
    label: `🚗 ~${driveMinutes} min drive · Leave by ~${leaveBy} · Arrive ~${arriveBy} (${CHECK_IN_BUFFER_MINUTES} min check-in buffer)`,
    isFallback: false,
  }
}

// ── Legacy helper (kept for any remaining callers) ────────────────────────────

export function computeLeaveBy(callTime: string | null | undefined): string | null {
  if (!callTime) return null
  const parsed = parseHHMM(callTime)
  if (!parsed) return null
  const { h, m } = parsed
  const leaveBy = subtractMinutes(h, m, LEAVE_BY_BUFFER_MINUTES)
  return `Call ${fmt12(h, m)} · Leave by ~${leaveBy} (allow ${LEAVE_BY_BUFFER_MINUTES} min)`
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
