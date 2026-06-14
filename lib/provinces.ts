export interface ProvinceInfo {
  code: string;
  name: string;
  nonUnionMin: number;
  minCallHours: number;
  minCallPay: number;
  rateNote: string;
}

export const PROVINCES: Record<string, ProvinceInfo> = {
  BC: {
    code: 'BC',
    name: 'British Columbia',
    nonUnionMin: 18.25,
    minCallHours: 8,
    minCallPay: 146.00,
    rateNote: 'BC Minimum Wage — effective June 1, 2026',
  },
  ON: {
    code: 'ON',
    name: 'Ontario',
    nonUnionMin: 16.25,
    minCallHours: 8,
    minCallPay: 130.00,
    rateNote: 'ACTRA IPA non-union rate',
  },
  AB: {
    code: 'AB',
    name: 'Alberta',
    nonUnionMin: 15.00,
    minCallHours: 8,
    minCallPay: 120.00,
    rateNote: 'Alberta Minimum Wage — verify current rate',
  },
  QC: {
    code: 'QC',
    name: 'Québec',
    nonUnionMin: 15.75,
    minCallHours: 8,
    minCallPay: 126.00,
    rateNote: 'Québec Minimum Wage — verify current rate',
  },
  SK: {
    code: 'SK',
    name: 'Saskatchewan',
    nonUnionMin: 15.00,
    minCallHours: 8,
    minCallPay: 120.00,
    rateNote: 'Saskatchewan Minimum Wage — verify current rate',
  },
  MB: {
    code: 'MB',
    name: 'Manitoba',
    nonUnionMin: 15.80,
    minCallHours: 8,
    minCallPay: 126.40,
    rateNote: 'Manitoba Minimum Wage — verify current rate',
  },
  NS: {
    code: 'NS',
    name: 'Nova Scotia',
    nonUnionMin: 15.70,
    minCallHours: 8,
    minCallPay: 125.60,
    rateNote: 'Nova Scotia Minimum Wage — verify current rate',
  },
  NB: {
    code: 'NB',
    name: 'New Brunswick',
    nonUnionMin: 15.30,
    minCallHours: 8,
    minCallPay: 122.40,
    rateNote: 'New Brunswick Minimum Wage — verify current rate',
  },
  PE: {
    code: 'PE',
    name: 'Prince Edward Island',
    nonUnionMin: 16.00,
    minCallHours: 8,
    minCallPay: 128.00,
    rateNote: 'PEI Minimum Wage — verify current rate',
  },
  NL: {
    code: 'NL',
    name: 'Newfoundland & Labrador',
    nonUnionMin: 15.60,
    minCallHours: 8,
    minCallPay: 124.80,
    rateNote: 'NL Minimum Wage — verify current rate',
  },
  YT: {
    code: 'YT',
    name: 'Yukon',
    nonUnionMin: 17.59,
    minCallHours: 8,
    minCallPay: 140.72,
    rateNote: 'Yukon Minimum Wage — verify current rate',
  },
  NT: {
    code: 'NT',
    name: 'Northwest Territories',
    nonUnionMin: 16.05,
    minCallHours: 8,
    minCallPay: 128.40,
    rateNote: 'NWT Minimum Wage — verify current rate',
  },
  NU: {
    code: 'NU',
    name: 'Nunavut',
    nonUnionMin: 16.00,
    minCallHours: 8,
    minCallPay: 128.00,
    rateNote: 'Nunavut Minimum Wage — verify current rate',
  },
};

export const PROVINCE_LIST = Object.values(PROVINCES);
