export interface UnionRequirement {
  unionName: string
  targetTier: string
  qualifyingDaysRequired: number
  timeWindowDays: number
  timeWindowLabel: string
  notes: string
  website: string
  nextTier?: string
  nextTierRequirement?: string
}

export const UNION_RULES: Record<string, UnionRequirement[]> = {
  BC: [
    {
      unionName: 'UBCP/ACTRA',
      targetTier: 'Background Member',
      qualifyingDaysRequired: 15,
      timeWindowDays: 365,
      timeWindowLabel: '12 months',
      notes: 'You need 15 days of on-camera work on UBCP/ACTRA productions within 12 months to qualify as a UBCP Background Member. Vouchers must be from UBCP-signatory productions.',
      website: 'https://ubcpactra.ca/how-to-join/',
      nextTier: 'Full Member',
      nextTierRequirement: '1,600 hours or 200 days of on-camera work from when you joined as a Background Member',
    },
  ],
  YT: [
    {
      unionName: 'UBCP/ACTRA',
      targetTier: 'Background Member',
      qualifyingDaysRequired: 15,
      timeWindowDays: 365,
      timeWindowLabel: '12 months',
      notes: 'Yukon is covered under the UBCP/ACTRA BCMPA agreement. Same requirements as BC.',
      website: 'https://ubcpactra.ca/how-to-join/',
    },
  ],
  AB: [
    {
      unionName: 'ACTRA Alberta',
      targetTier: 'Additional Background Performer',
      qualifyingDaysRequired: 15,
      timeWindowDays: 365,
      timeWindowLabel: '12 months',
      notes: 'You need 15 days of work on ACTRA-signatory productions within 12 months to qualify as an ACTRA Additional Background Performer in Alberta.',
      website: 'https://actraalberta.com',
    },
  ],
  ON: [
    {
      unionName: 'ACTRA Toronto',
      targetTier: 'Additional Background Performer',
      qualifyingDaysRequired: 15,
      timeWindowDays: 365,
      timeWindowLabel: '12 months',
      notes: 'You need 15 days of on-camera work on ACTRA-signatory productions within 12 months to qualify as an ACTRA Additional Background Performer in Ontario.',
      website: 'https://actratoronto.com/working-background/',
    },
  ],
  QC: [
    {
      unionName: 'ACTRA Montreal',
      targetTier: 'Additional Background Performer',
      qualifyingDaysRequired: 15,
      timeWindowDays: 365,
      timeWindowLabel: '12 months',
      notes: 'For English-language productions. You need 15 days on ACTRA-signatory productions within 12 months. French-language productions use UDA rules — contact UDA directly.',
      website: 'https://actramontreal.ca',
    },
  ],
  SK: [
    {
      unionName: 'ACTRA Saskatchewan',
      targetTier: 'Additional Background Performer',
      qualifyingDaysRequired: 15,
      timeWindowDays: 365,
      timeWindowLabel: '12 months',
      notes: '15 days on ACTRA-signatory productions within 12 months.',
      website: 'https://www.actra.ca',
    },
  ],
  MB: [
    {
      unionName: 'ACTRA Manitoba',
      targetTier: 'Additional Background Performer',
      qualifyingDaysRequired: 15,
      timeWindowDays: 365,
      timeWindowLabel: '12 months',
      notes: '15 days on ACTRA-signatory productions within 12 months.',
      website: 'https://www.actra.ca',
    },
  ],
  NS: [
    {
      unionName: 'ACTRA Maritimes',
      targetTier: 'Additional Background Performer',
      qualifyingDaysRequired: 15,
      timeWindowDays: 365,
      timeWindowLabel: '12 months',
      notes: '15 days on ACTRA-signatory productions within 12 months. Covers NS, NB and PEI.',
      website: 'https://www.actra.ca',
    },
  ],
  NB: [
    {
      unionName: 'ACTRA Maritimes',
      targetTier: 'Additional Background Performer',
      qualifyingDaysRequired: 15,
      timeWindowDays: 365,
      timeWindowLabel: '12 months',
      notes: '15 days on ACTRA-signatory productions within 12 months.',
      website: 'https://www.actra.ca',
    },
  ],
  PE: [
    {
      unionName: 'ACTRA Maritimes',
      targetTier: 'Additional Background Performer',
      qualifyingDaysRequired: 15,
      timeWindowDays: 365,
      timeWindowLabel: '12 months',
      notes: '15 days on ACTRA-signatory productions within 12 months.',
      website: 'https://www.actra.ca',
    },
  ],
  NL: [
    {
      unionName: 'ACTRA Newfoundland',
      targetTier: 'Additional Background Performer',
      qualifyingDaysRequired: 15,
      timeWindowDays: 365,
      timeWindowLabel: '12 months',
      notes: '15 days on ACTRA-signatory productions within 12 months.',
      website: 'https://www.actra.ca',
    },
  ],
  NT: [
    {
      unionName: 'ACTRA National',
      targetTier: 'Additional Background Performer',
      qualifyingDaysRequired: 15,
      timeWindowDays: 365,
      timeWindowLabel: '12 months',
      notes: '15 days on ACTRA-signatory productions within 12 months.',
      website: 'https://www.actra.ca',
    },
  ],
  NU: [
    {
      unionName: 'ACTRA National',
      targetTier: 'Additional Background Performer',
      qualifyingDaysRequired: 15,
      timeWindowDays: 365,
      timeWindowLabel: '12 months',
      notes: '15 days on ACTRA-signatory productions within 12 months.',
      website: 'https://www.actra.ca',
    },
  ],
}

export function getUnionRules(provinceCode: string): UnionRequirement[] {
  return UNION_RULES[provinceCode] || UNION_RULES.ON
}

export function calculateQualifyingDays(
  vouchers: any[],
  requirement: UnionRequirement
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

export const MILESTONE_THRESHOLDS = [5, 10, 13, 14, 15]

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
