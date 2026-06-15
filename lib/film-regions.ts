export interface FilmRegion {
  code: string
  name: string
  provinceCode: string
  cities: string[]
  adjacentRegions: string[]
  latitudeCenter: number
  longitudeCenter: number
}

export const FILM_REGIONS: Record<string, FilmRegion> = {
  // ── BC ──────────────────────────────────────────────────────────────────────
  BC_VANCOUVER: {
    code: 'BC_VANCOUVER',
    name: 'Greater Vancouver / Lower Mainland',
    provinceCode: 'BC',
    cities: ['Vancouver','Burnaby','Richmond','Surrey','New Westminster','Coquitlam','Port Moody','Delta','Langley','Maple Ridge','Abbotsford','North Vancouver','West Vancouver'],
    adjacentRegions: ['BC_SEATOSKY','BC_FRASERVALLEY','BC_SUNSHINE'],
    latitudeCenter: 49.2827,
    longitudeCenter: -123.1207,
  },
  BC_SEATOSKY: {
    code: 'BC_SEATOSKY',
    name: 'Sea-to-Sky Corridor',
    provinceCode: 'BC',
    cities: ['Squamish','Whistler','Pemberton','Lillooet'],
    adjacentRegions: ['BC_VANCOUVER','BC_FRASERVALLEY'],
    latitudeCenter: 50.1163,
    longitudeCenter: -122.9574,
  },
  BC_FRASERVALLEY: {
    code: 'BC_FRASERVALLEY',
    name: 'Fraser Valley',
    provinceCode: 'BC',
    cities: ['Abbotsford','Chilliwack','Hope','Mission','Agassiz','Harrison Hot Springs'],
    adjacentRegions: ['BC_VANCOUVER','BC_SEATOSKY','BC_OKANAGAN_THOMPSON'],
    latitudeCenter: 49.0504,
    longitudeCenter: -121.7781,
  },
  BC_SUNSHINE: {
    code: 'BC_SUNSHINE',
    name: 'Sunshine Coast',
    provinceCode: 'BC',
    cities: ['Gibsons','Sechelt','Powell River','Halfmoon Bay'],
    adjacentRegions: ['BC_VANCOUVER'],
    latitudeCenter: 49.7390,
    longitudeCenter: -124.0147,
  },
  BC_VANCOUVER_ISLAND_NORTH: {
    code: 'BC_VANCOUVER_ISLAND_NORTH',
    name: 'Vancouver Island North',
    provinceCode: 'BC',
    cities: ['Campbell River','Courtenay','Comox','Port Hardy','Tofino','Ucluelet','Port Alberni'],
    adjacentRegions: ['BC_VANCOUVER_ISLAND_SOUTH'],
    latitudeCenter: 49.7016,
    longitudeCenter: -125.2439,
  },
  BC_VANCOUVER_ISLAND_SOUTH: {
    code: 'BC_VANCOUVER_ISLAND_SOUTH',
    name: 'Vancouver Island South / Victoria',
    provinceCode: 'BC',
    cities: ['Victoria','Nanaimo','Duncan','Sidney','Langford','Saanich','Sooke','Ladysmith'],
    adjacentRegions: ['BC_VANCOUVER_ISLAND_NORTH','BC_VANCOUVER'],
    latitudeCenter: 48.4284,
    longitudeCenter: -123.3656,
  },
  BC_OKANAGAN_THOMPSON: {
    code: 'BC_OKANAGAN_THOMPSON',
    name: 'Okanagan / Thompson-Nicola',
    provinceCode: 'BC',
    cities: ['Kelowna','Penticton','Vernon','Osoyoos','Oliver','Summerland','West Kelowna','Peachland','Kamloops','Merritt','Chase','Salmon Arm','Armstrong','Enderby','Princeton','Keremeos'],
    adjacentRegions: ['BC_FRASERVALLEY','BC_SEATOSKY','BC_COLUMBIA_KOOTENAY','BC_NORTHERN'],
    latitudeCenter: 49.8880,
    longitudeCenter: -119.4960,
  },
  BC_COLUMBIA_KOOTENAY: {
    code: 'BC_COLUMBIA_KOOTENAY',
    name: 'Columbia / Shuswap / Kootenays',
    provinceCode: 'BC',
    cities: ['Nelson','Trail','Cranbrook','Fernie','Revelstoke','Golden','Castlegar','Rossland','Kimberley'],
    adjacentRegions: ['BC_OKANAGAN_THOMPSON'],
    latitudeCenter: 49.5000,
    longitudeCenter: -116.5000,
  },
  BC_CARIBOO: {
    code: 'BC_CARIBOO',
    name: 'Cariboo / Chilcotin',
    provinceCode: 'BC',
    cities: ['Williams Lake','Quesnel','100 Mile House','Clinton','Ashcroft','Cache Creek'],
    adjacentRegions: ['BC_OKANAGAN_THOMPSON','BC_NORTHERN'],
    latitudeCenter: 52.1418,
    longitudeCenter: -122.1407,
  },
  BC_NORTHERN: {
    code: 'BC_NORTHERN',
    name: 'Northern BC',
    provinceCode: 'BC',
    cities: ['Prince George','Prince Rupert','Terrace','Fort St. John','Dawson Creek','Smithers','Kitimat','Fort Nelson'],
    adjacentRegions: ['BC_CARIBOO','BC_OKANAGAN_THOMPSON'],
    latitudeCenter: 53.9171,
    longitudeCenter: -122.7497,
  },

  // ── AB ──────────────────────────────────────────────────────────────────────
  AB_CALGARY: {
    code: 'AB_CALGARY',
    name: 'Greater Calgary',
    provinceCode: 'AB',
    cities: ['Calgary','Airdrie','Okotoks','Cochrane','Canmore','High River','Strathmore'],
    adjacentRegions: ['AB_BANFF','AB_SOUTHERN'],
    latitudeCenter: 51.0447,
    longitudeCenter: -114.0719,
  },
  AB_EDMONTON: {
    code: 'AB_EDMONTON',
    name: 'Greater Edmonton',
    provinceCode: 'AB',
    cities: ['Edmonton','St. Albert','Leduc','Sherwood Park','Spruce Grove','Fort Saskatchewan','Beaumont'],
    adjacentRegions: ['AB_CENTRAL','AB_NORTHERN_AB'],
    latitudeCenter: 53.5461,
    longitudeCenter: -113.4938,
  },
  AB_BANFF: {
    code: 'AB_BANFF',
    name: 'Banff / Canmore / Rockies',
    provinceCode: 'AB',
    cities: ['Banff','Canmore','Jasper','Lake Louise'],
    adjacentRegions: ['AB_CALGARY'],
    latitudeCenter: 51.1784,
    longitudeCenter: -115.5708,
  },
  AB_SOUTHERN: {
    code: 'AB_SOUTHERN',
    name: 'Southern Alberta',
    provinceCode: 'AB',
    cities: ['Lethbridge','Medicine Hat','Taber','Coaldale','Brooks'],
    adjacentRegions: ['AB_CALGARY'],
    latitudeCenter: 49.6956,
    longitudeCenter: -112.8451,
  },
  AB_CENTRAL: {
    code: 'AB_CENTRAL',
    name: 'Central Alberta',
    provinceCode: 'AB',
    cities: ['Red Deer','Lacombe','Ponoka','Innisfail','Wetaskiwin'],
    adjacentRegions: ['AB_CALGARY','AB_EDMONTON'],
    latitudeCenter: 52.2681,
    longitudeCenter: -113.8112,
  },
  AB_NORTHERN_AB: {
    code: 'AB_NORTHERN_AB',
    name: 'Northern Alberta',
    provinceCode: 'AB',
    cities: ['Grande Prairie','Fort McMurray','Peace River','Slave Lake'],
    adjacentRegions: ['AB_EDMONTON'],
    latitudeCenter: 55.1707,
    longitudeCenter: -118.7956,
  },

  // ── ON ──────────────────────────────────────────────────────────────────────
  ON_GTA: {
    code: 'ON_GTA',
    name: 'Greater Toronto Area (GTA)',
    provinceCode: 'ON',
    cities: ['Toronto','Mississauga','Brampton','Vaughan','Markham','Richmond Hill','Pickering','Oshawa','Ajax','Whitby','Scarborough','North York','Etobicoke','Thornhill'],
    adjacentRegions: ['ON_HAMILTON','ON_OTTAWA','ON_SOUTHWESTERN'],
    latitudeCenter: 43.6532,
    longitudeCenter: -79.3832,
  },
  ON_HAMILTON: {
    code: 'ON_HAMILTON',
    name: 'Hamilton / Niagara',
    provinceCode: 'ON',
    cities: ['Hamilton','Burlington','St. Catharines','Niagara Falls','Brantford','Grimsby','Welland','Oakville'],
    adjacentRegions: ['ON_GTA','ON_SOUTHWESTERN'],
    latitudeCenter: 43.2557,
    longitudeCenter: -79.8711,
  },
  ON_OTTAWA: {
    code: 'ON_OTTAWA',
    name: 'Ottawa / Eastern Ontario',
    provinceCode: 'ON',
    cities: ['Ottawa','Kingston','Cornwall','Pembroke','Belleville','Trenton','Brockville'],
    adjacentRegions: ['ON_GTA'],
    latitudeCenter: 45.4215,
    longitudeCenter: -75.6972,
  },
  ON_SOUTHWESTERN: {
    code: 'ON_SOUTHWESTERN',
    name: 'Southwestern Ontario',
    provinceCode: 'ON',
    cities: ['London','Windsor','Kitchener','Waterloo','Cambridge','Guelph','Stratford','Sarnia','Chatham'],
    adjacentRegions: ['ON_GTA','ON_HAMILTON'],
    latitudeCenter: 43.0000,
    longitudeCenter: -81.0000,
  },
  ON_NORTHERN_ON: {
    code: 'ON_NORTHERN_ON',
    name: 'Northern Ontario',
    provinceCode: 'ON',
    cities: ['Sudbury','Thunder Bay','Sault Ste. Marie','Timmins','North Bay','Kenora'],
    adjacentRegions: ['ON_OTTAWA','ON_GTA'],
    latitudeCenter: 46.4917,
    longitudeCenter: -80.9930,
  },

  // ── QC ──────────────────────────────────────────────────────────────────────
  QC_MONTREAL: {
    code: 'QC_MONTREAL',
    name: 'Greater Montreal',
    provinceCode: 'QC',
    cities: ['Montreal','Laval','Longueuil','Brossard','Boucherville','Saint-Jean-sur-Richelieu','Terrebonne','Repentigny'],
    adjacentRegions: ['QC_CITY','QC_LAURENTIANS'],
    latitudeCenter: 45.5017,
    longitudeCenter: -73.5673,
  },
  QC_CITY: {
    code: 'QC_CITY',
    name: 'Quebec City Area',
    provinceCode: 'QC',
    cities: ['Quebec City','Lévis','Sainte-Foy','Charlesbourg'],
    adjacentRegions: ['QC_MONTREAL'],
    latitudeCenter: 46.8139,
    longitudeCenter: -71.2080,
  },
  QC_LAURENTIANS: {
    code: 'QC_LAURENTIANS',
    name: 'Laurentians / Lanaudière / Eastern Townships',
    provinceCode: 'QC',
    cities: ['Mont-Tremblant','Saint-Jérôme','Sherbrooke','Drummondville','Joliette'],
    adjacentRegions: ['QC_MONTREAL','QC_CITY'],
    latitudeCenter: 46.1179,
    longitudeCenter: -74.5956,
  },

  // ── Maritimes ───────────────────────────────────────────────────────────────
  NS_ALL: {
    code: 'NS_ALL',
    name: 'Nova Scotia',
    provinceCode: 'NS',
    cities: ['Halifax','Cape Breton','Sydney','Truro','Dartmouth','New Glasgow'],
    adjacentRegions: ['NB_ALL'],
    latitudeCenter: 44.6820,
    longitudeCenter: -63.7443,
  },
  NB_ALL: {
    code: 'NB_ALL',
    name: 'New Brunswick',
    provinceCode: 'NB',
    cities: ['Fredericton','Moncton','Saint John','Bathurst','Edmundston'],
    adjacentRegions: ['NS_ALL','PE_ALL'],
    latitudeCenter: 46.5653,
    longitudeCenter: -66.4619,
  },
  PE_ALL: {
    code: 'PE_ALL',
    name: 'Prince Edward Island',
    provinceCode: 'PE',
    cities: ['Charlottetown','Summerside','Stratford'],
    adjacentRegions: ['NB_ALL','NS_ALL'],
    latitudeCenter: 46.2382,
    longitudeCenter: -63.1311,
  },
  NL_ALL: {
    code: 'NL_ALL',
    name: 'Newfoundland and Labrador',
    provinceCode: 'NL',
    cities: ["St. John's",'Corner Brook','Gander','Grand Falls-Windsor'],
    adjacentRegions: [],
    latitudeCenter: 47.5615,
    longitudeCenter: -52.7126,
  },

  // ── Prairies ────────────────────────────────────────────────────────────────
  SK_ALL: {
    code: 'SK_ALL',
    name: 'Saskatchewan',
    provinceCode: 'SK',
    cities: ['Regina','Saskatoon','Moose Jaw','Prince Albert','Swift Current'],
    adjacentRegions: ['MB_ALL','AB_CALGARY'],
    latitudeCenter: 52.9399,
    longitudeCenter: -106.4509,
  },
  MB_ALL: {
    code: 'MB_ALL',
    name: 'Manitoba',
    provinceCode: 'MB',
    cities: ['Winnipeg','Brandon','Steinbach','Thompson'],
    adjacentRegions: ['SK_ALL','ON_NORTHERN_ON'],
    latitudeCenter: 49.8951,
    longitudeCenter: -97.1384,
  },

  // ── Territories ─────────────────────────────────────────────────────────────
  YT_ALL: {
    code: 'YT_ALL',
    name: 'Yukon',
    provinceCode: 'YT',
    cities: ['Whitehorse','Dawson City'],
    adjacentRegions: ['BC_NORTHERN'],
    latitudeCenter: 64.2823,
    longitudeCenter: -135.0000,
  },
  NT_ALL: {
    code: 'NT_ALL',
    name: 'Northwest Territories',
    provinceCode: 'NT',
    cities: ['Yellowknife','Hay River','Inuvik'],
    adjacentRegions: ['AB_NORTHERN_AB','YT_ALL'],
    latitudeCenter: 62.4540,
    longitudeCenter: -114.3718,
  },
  NU_ALL: {
    code: 'NU_ALL',
    name: 'Nunavut',
    provinceCode: 'NU',
    cities: ['Iqaluit','Rankin Inlet','Cambridge Bay'],
    adjacentRegions: ['NT_ALL'],
    latitudeCenter: 63.7467,
    longitudeCenter: -68.5170,
  },
}

// Haversine distance between two lat/lng points in km
export function calculateDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// All region codes within radiusKm of sourceRegionCode
export function getRegionsWithinRadius(sourceRegionCode: string, radiusKm: number): string[] {
  const source = FILM_REGIONS[sourceRegionCode]
  if (!source) return [sourceRegionCode]

  return Object.values(FILM_REGIONS)
    .filter(r => calculateDistanceKm(
      source.latitudeCenter, source.longitudeCenter,
      r.latitudeCenter, r.longitudeCenter
    ) <= radiusKm)
    .map(r => r.code)
}

// Does performer's region match the shoot region given their travel settings?
export function getMatchingRegions(
  shootRegionCode: string,
  performerRegionCode: string,
  travelWillingness: string,
  travelRadiusKm: number
): boolean {
  if (shootRegionCode === performerRegionCode) return true

  const shootRegion = FILM_REGIONS[shootRegionCode]
  const performerRegion = FILM_REGIONS[performerRegionCode]
  if (!shootRegion || !performerRegion) return false

  if (travelWillingness === 'national') return true

  if (travelWillingness === 'provincial') {
    return shootRegion.provinceCode === performerRegion.provinceCode
  }

  // local or regional — distance-based
  const distance = calculateDistanceKm(
    shootRegion.latitudeCenter, shootRegion.longitudeCenter,
    performerRegion.latitudeCenter, performerRegion.longitudeCenter
  )
  return distance <= travelRadiusKm
}

export function getProvinceRegions(provinceCode: string): string[] {
  return Object.values(FILM_REGIONS)
    .filter(r => r.provinceCode === provinceCode)
    .map(r => r.code)
}

export function getRegionName(code: string): string {
  return FILM_REGIONS[code]?.name || code
}

export function getRegionFromCity(city: string): string | null {
  const normalized = city.toLowerCase().trim()
  for (const region of Object.values(FILM_REGIONS)) {
    if (region.cities.some(c =>
      c.toLowerCase().includes(normalized) || normalized.includes(c.toLowerCase())
    )) {
      return region.code
    }
  }
  return null
}

// Ordered list of regions for dropdowns — sorted by province then name
export const FILM_REGION_LIST = Object.values(FILM_REGIONS).sort((a, b) => {
  if (a.provinceCode !== b.provinceCode) return a.provinceCode.localeCompare(b.provinceCode)
  return a.name.localeCompare(b.name)
})

export function unionBadge(unionStatus: string | null | undefined): string {
  if (!unionStatus) return '⚫'
  const s = unionStatus.toLowerCase()
  if (s.includes('full')) return '👑'
  if (s.includes('apprentice')) return '⭐'
  if (s.includes('background') || s.includes('aabp') || s.includes('permit') || s.includes('additional-bg')) return '🟢'
  return '⚫'
}

export function unionTierLabel(unionStatus: string | null | undefined): string {
  if (!unionStatus) return 'Non-Union'
  const s = unionStatus.toLowerCase()
  if (s.includes('full')) return 'Full Member'
  if (s.includes('apprentice')) return 'Apprentice'
  if (s.includes('background') || s.includes('aabp') || s.includes('additional-bg')) return 'BG Member'
  if (s.includes('permit')) return 'Permit'
  return 'Non-Union'
}

export function unionPriority(unionStatus: string | null | undefined): number {
  if (!unionStatus) return 4
  const s = unionStatus.toLowerCase()
  if (s.includes('full')) return 1
  if (s.includes('apprentice')) return 2
  if (s.includes('background') || s.includes('aabp') || s.includes('permit') || s.includes('additional-bg')) return 3
  return 4
}
