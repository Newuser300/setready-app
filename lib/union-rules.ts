export interface UnionMembershipPath {
  provinceCode: string
  provinceName: string
  unionOrganization: string
  unionShortName: string
  unionWebsite: string
  unionEmail: string

  entryTierName: string
  entryTierShortName: string
  qualifyingDaysRequired: number
  timeWindowDays: number
  timeWindowLabel: string
  voucherLimit: number
  canWorkNonUnionAfterJoining: boolean
  entryTierNotes: string

  nextTierName: string
  nextTierRequirement: string
  nextTierFee: string
  nextTierNotes: string

  fullMemberName: string
  fullMemberRequirement: string
  fullMemberInitiationFee: number
  fullMemberAnnualDues: number
  workingDuesPercent: number

  memberNumberExample: string

  applicationEmail: string
  applicationUrl: string
}

const UBCP_PATH: Partial<UnionMembershipPath> = {
  unionOrganization: 'UBCP/ACTRA',
  unionShortName: 'UBCP',
  unionWebsite: 'https://ubcpactra.ca',
  unionEmail: 'info@ubcpactra.ca',

  entryTierName: 'UBCP Background Member',
  entryTierShortName: 'Background Member',
  qualifyingDaysRequired: 15,
  timeWindowDays: 365,
  timeWindowLabel: '12 months',
  voucherLimit: 15,
  canWorkNonUnionAfterJoining: true,
  entryTierNotes:
    'After joining as a UBCP Background Member you CAN still accept non-union work while building toward Full Membership. You need vouchers from UBCP-signatory productions only.',

  nextTierName: 'UBCP Full Member',
  nextTierRequirement:
    '1,600 hours OR 200 days of on-camera work as a Background Member. Second and subsequent credits must be acting credits.',
  nextTierFee: '$1,600 initiation fee (less any Apprentice fees previously paid)',
  nextTierNotes:
    'UBCP does not have an Apprentice tier for the background performer path — you go directly from Background Member to Full Member.',

  fullMemberName: 'UBCP Full Member',
  fullMemberRequirement:
    '3 qualifying credits total. First credit can be 1,600 hours or 200 days as Background Member.',
  fullMemberInitiationFee: 1600,
  fullMemberAnnualDues: 195,
  workingDuesPercent: 2.25,

  memberNumberExample: 'Assigned by UBCP upon joining',
  applicationEmail: 'membership@ubcpactra.ca',
  applicationUrl: 'https://ubcpactra.ca/how-to-join/',
}

const ACTRA_PATH_BASE: Partial<UnionMembershipPath> = {
  unionOrganization: 'ACTRA',
  unionShortName: 'ACTRA',
  unionWebsite: 'https://www.actra.ca',

  entryTierName: 'ACTRA Additional Background Performer (AABP)',
  entryTierShortName: 'AABP',
  qualifyingDaysRequired: 15,
  timeWindowDays: 365,
  timeWindowLabel: '12 months',
  voucherLimit: 15,
  canWorkNonUnionAfterJoining: false,
  entryTierNotes:
    'IMPORTANT: Once you join ACTRA as an AABP member you CANNOT accept non-union work. Only vouchers from ACTRA-signatory productions count. You must submit exactly 15 vouchers — no more, no fewer.',

  nextTierName: 'ACTRA Apprentice Member',
  nextTierRequirement:
    '1,600 hours OR 200 days of on-camera background work as an AABP member. No time limit to accumulate hours.',
  nextTierFee: '$75 Apprentice initiation fee + $75 annual renewal fee',
  nextTierNotes:
    'ACTRA has an Apprentice tier between AABP and Full Member. After reaching 1,600 hours or 200 days you apply for Apprentice membership.',

  fullMemberName: 'ACTRA Full Member',
  fullMemberRequirement:
    '3 qualifying acting credits (principal roles on ACTRA productions) after becoming an Apprentice Member.',
  fullMemberInitiationFee: 1600,
  fullMemberAnnualDues: 195,
  workingDuesPercent: 2.25,

  memberNumberExample: 'EX-054321 (AABP format)',
}

export const UNION_RULES: Record<string, UnionMembershipPath> = {
  BC: {
    ...UBCP_PATH,
    provinceCode: 'BC',
    provinceName: 'British Columbia',
  } as UnionMembershipPath,

  YT: {
    ...UBCP_PATH,
    provinceCode: 'YT',
    provinceName: 'Yukon',
    entryTierNotes:
      'Yukon is covered under the UBCP/ACTRA BCMPA agreement — same rules as British Columbia. ' +
      UBCP_PATH.entryTierNotes,
  } as UnionMembershipPath,

  AB: {
    ...ACTRA_PATH_BASE,
    provinceCode: 'AB',
    provinceName: 'Alberta',
    unionOrganization: 'ACTRA Alberta',
    unionShortName: 'ACTRA Alberta',
    unionWebsite: 'https://actraalberta.com',
    unionEmail: 'info@actraalberta.com',
    applicationEmail: 'info@actraalberta.com',
    applicationUrl: 'https://actraalberta.com',
    memberNumberExample: 'Assigned by ACTRA Alberta',
  } as UnionMembershipPath,

  ON: {
    ...ACTRA_PATH_BASE,
    provinceCode: 'ON',
    provinceName: 'Ontario',
    unionOrganization: 'ACTRA Toronto',
    unionShortName: 'ACTRA Toronto',
    unionWebsite: 'https://actratoronto.com',
    unionEmail: 'info@actratoronto.com',
    applicationEmail: 'info@actratoronto.com',
    applicationUrl: 'https://actratoronto.com/actra-additional-background-performer-aabp/',
    memberNumberExample: 'EX-054321',
  } as UnionMembershipPath,

  QC: {
    ...ACTRA_PATH_BASE,
    provinceCode: 'QC',
    provinceName: 'Quebec',
    unionOrganization: 'ACTRA Montreal',
    unionShortName: 'ACTRA Montreal',
    unionWebsite: 'https://actramontreal.ca',
    unionEmail: 'montreal@actra.ca',
    applicationEmail: 'montreal@actra.ca',
    applicationUrl: 'https://actramontreal.ca/specializations/background-work-performer/',
    entryTierNotes:
      ACTRA_PATH_BASE.entryTierNotes +
      ' Note: French-language productions in Quebec use UDA rules — contact UDA separately for French production work.',
    memberNumberExample: 'EX-054321',
  } as UnionMembershipPath,

  SK: {
    ...ACTRA_PATH_BASE,
    provinceCode: 'SK',
    provinceName: 'Saskatchewan',
    unionOrganization: 'ACTRA Saskatchewan',
    unionShortName: 'ACTRA Saskatchewan',
    unionWebsite: 'https://www.actra.ca',
    unionEmail: 'sk@actra.ca',
    applicationEmail: 'sk@actra.ca',
    applicationUrl: 'https://www.actra.ca/join/',
    memberNumberExample: 'EX-054321',
  } as UnionMembershipPath,

  MB: {
    ...ACTRA_PATH_BASE,
    provinceCode: 'MB',
    provinceName: 'Manitoba',
    unionOrganization: 'ACTRA Manitoba',
    unionShortName: 'ACTRA Manitoba',
    unionWebsite: 'https://www.actra.ca',
    unionEmail: 'mb@actra.ca',
    applicationEmail: 'mb@actra.ca',
    applicationUrl: 'https://www.actra.ca/join/',
    memberNumberExample: 'EX-054321',
  } as UnionMembershipPath,

  NS: {
    ...ACTRA_PATH_BASE,
    provinceCode: 'NS',
    provinceName: 'Nova Scotia',
    unionOrganization: 'ACTRA Maritimes',
    unionShortName: 'ACTRA Maritimes',
    unionWebsite: 'https://actramaritimes.ca',
    unionEmail: 'maritimes@actra.ca',
    applicationEmail: 'maritimes@actra.ca',
    applicationUrl: 'https://www.actra.ca/join/',
    entryTierNotes:
      ACTRA_PATH_BASE.entryTierNotes +
      ' ACTRA Maritimes covers Nova Scotia, New Brunswick and PEI.',
    memberNumberExample: 'EX-054321',
  } as UnionMembershipPath,

  NB: {
    ...ACTRA_PATH_BASE,
    provinceCode: 'NB',
    provinceName: 'New Brunswick',
    unionOrganization: 'ACTRA Maritimes',
    unionShortName: 'ACTRA Maritimes',
    unionWebsite: 'https://actramaritimes.ca',
    unionEmail: 'maritimes@actra.ca',
    applicationEmail: 'maritimes@actra.ca',
    applicationUrl: 'https://www.actra.ca/join/',
    entryTierNotes:
      ACTRA_PATH_BASE.entryTierNotes +
      ' ACTRA Maritimes covers Nova Scotia, New Brunswick and PEI.',
    memberNumberExample: 'EX-054321',
  } as UnionMembershipPath,

  PE: {
    ...ACTRA_PATH_BASE,
    provinceCode: 'PE',
    provinceName: 'Prince Edward Island',
    unionOrganization: 'ACTRA Maritimes',
    unionShortName: 'ACTRA Maritimes',
    unionWebsite: 'https://actramaritimes.ca',
    unionEmail: 'maritimes@actra.ca',
    applicationEmail: 'maritimes@actra.ca',
    applicationUrl: 'https://www.actra.ca/join/',
    entryTierNotes:
      ACTRA_PATH_BASE.entryTierNotes +
      ' ACTRA Maritimes covers Nova Scotia, New Brunswick and PEI.',
    memberNumberExample: 'EX-054321',
  } as UnionMembershipPath,

  NL: {
    ...ACTRA_PATH_BASE,
    provinceCode: 'NL',
    provinceName: 'Newfoundland and Labrador',
    unionOrganization: 'ACTRA Newfoundland',
    unionShortName: 'ACTRA Newfoundland',
    unionWebsite: 'https://www.actra.ca',
    unionEmail: 'nl@actra.ca',
    applicationEmail: 'nl@actra.ca',
    applicationUrl: 'https://www.actra.ca/join/',
    memberNumberExample: 'EX-054321',
  } as UnionMembershipPath,

  NT: {
    ...ACTRA_PATH_BASE,
    provinceCode: 'NT',
    provinceName: 'Northwest Territories',
    unionOrganization: 'ACTRA National',
    unionShortName: 'ACTRA',
    unionWebsite: 'https://www.actra.ca',
    unionEmail: 'info@actra.ca',
    applicationEmail: 'info@actra.ca',
    applicationUrl: 'https://www.actra.ca/join/',
    memberNumberExample: 'EX-054321',
  } as UnionMembershipPath,

  NU: {
    ...ACTRA_PATH_BASE,
    provinceCode: 'NU',
    provinceName: 'Nunavut',
    unionOrganization: 'ACTRA National',
    unionShortName: 'ACTRA',
    unionWebsite: 'https://www.actra.ca',
    unionEmail: 'info@actra.ca',
    applicationEmail: 'info@actra.ca',
    applicationUrl: 'https://www.actra.ca/join/',
    memberNumberExample: 'EX-054321',
  } as UnionMembershipPath,
}

const PROVINCE_NAME_TO_CODE: Record<string, string> = {
  'british columbia': 'BC',
  'ontario': 'ON',
  'quebec': 'QC',
  'quebec (english)': 'QC',
  'quebec (french)': 'QC',
  'alberta': 'AB',
  'saskatchewan': 'SK',
  'manitoba': 'MB',
  'nova scotia': 'NS',
  'new brunswick': 'NB',
  'prince edward island': 'PE',
  'newfoundland': 'NL',
  'newfoundland and labrador': 'NL',
  'newfoundland & labrador': 'NL',
  'yukon': 'YT',
  'northwest territories': 'NT',
  'territories': 'NT',
  'nunavut': 'NU',
  'maritimes': 'NS',
}

export function getUnionRules(provinceCode: string): UnionMembershipPath {
  const upper = provinceCode?.toUpperCase()?.trim()

  if (UNION_RULES[upper]) {
    console.log('Province:', upper, '→ Union:', UNION_RULES[upper].unionShortName)
    return UNION_RULES[upper]
  }

  const code = PROVINCE_NAME_TO_CODE[provinceCode?.toLowerCase()?.trim()]
  if (code && UNION_RULES[code]) {
    console.log('Province name:', provinceCode, '→ Code:', code, '→ Union:', UNION_RULES[code].unionShortName)
    return UNION_RULES[code]
  }

  console.warn('Unknown province:', provinceCode, '— defaulting to BC')
  return UNION_RULES.BC
}

export function isUBCPProvince(provinceCode: string): boolean {
  const upper = provinceCode?.toUpperCase()?.trim()
  if (['BC', 'YT'].includes(upper)) return true
  const code = PROVINCE_NAME_TO_CODE[provinceCode?.toLowerCase()?.trim()]
  return ['BC', 'YT'].includes(code)
}

export function isACTRAProvince(provinceCode: string): boolean {
  return !isUBCPProvince(provinceCode)
}

export const MILESTONE_THRESHOLDS = [5, 10, 13, 14, 15]

export function calculateQualifyingDays(
  vouchers: any[],
  requirement: { timeWindowDays: number; qualifyingDaysRequired: number }
): {
  qualifyingDays: number
  windowStart: Date
  windowEnd: Date
  vouchersInWindow: any[]
  daysRemaining: number
  percentComplete: number
  isQualified: boolean
} {
  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setDate(windowStart.getDate() - requirement.timeWindowDays)

  const vouchersInWindow = vouchers.filter(v => {
    const shootDate = new Date(v.shoot_date)
    return shootDate >= windowStart && shootDate <= now && v.is_qualifying === true
  })

  const qualifyingDays = vouchersInWindow.reduce((sum, v) => sum + (v.days_worked || 1), 0)
  const daysRemaining = Math.max(0, requirement.qualifyingDaysRequired - qualifyingDays)
  const percentComplete = Math.min(
    100,
    Math.round((qualifyingDays / requirement.qualifyingDaysRequired) * 100)
  )
  const isQualified = qualifyingDays >= requirement.qualifyingDaysRequired

  return {
    qualifyingDays,
    windowStart,
    windowEnd: now,
    vouchersInWindow,
    daysRemaining,
    percentComplete,
    isQualified,
  }
}

export function getMilestoneMessage(
  days: number,
  unionName: string,
  tierName: string,
  daysRequired: number
): { title: string; message: string; type: string } | null {
  if (days >= daysRequired) {
    return {
      type: 'qualified',
      title: `🎉 YOU QUALIFY!`,
      message: `You have ${days} qualifying days. You are now eligible to apply for ${unionName} membership as a ${tierName}!`,
    }
  }
  if (days >= 14) {
    return {
      type: 'milestone_14',
      title: `⚡ One More Day!`,
      message: `You're one qualifying day away from ${unionName} membership eligibility! Book your next job and log it!`,
    }
  }
  if (days >= 13) {
    return {
      type: 'milestone_13',
      title: `🔥 Almost There!`,
      message: `Just ${daysRequired - days} more qualifying days needed for ${unionName} membership.`,
    }
  }
  if (days >= 10) {
    return {
      type: 'milestone_10',
      title: `🔥 10 Days — You're on Fire!`,
      message: `You've logged 10 qualifying days. Only ${daysRequired - days} more to go! You're 2/3 of the way to ${unionName} membership.`,
    }
  }
  if (days >= 5) {
    return {
      type: 'milestone_5',
      title: `🌟 5 Days — Great Start!`,
      message: `You've logged 5 qualifying days. You're 1/3 of the way to ${unionName} membership. Keep booking and logging your vouchers!`,
    }
  }
  return null
}
