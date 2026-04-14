export const MONTHLY_ALLOWANCE_IDR = 10_000_000;
export const MONTHLY_ALLOWANCE_RMB = 4_600;

export const FIXED_COSTS = {
  apartment: 2600,
  gym: 180,
  total: 2780,
} as const;

export const VARIABLE_BUDGET = {
  monthly: 1820,
  campusLunch: 320,
  groceries: 180,
  personal: 200,
  freeSpending: 1120,
} as const;

export const DAILY_BUDGET = 37;
export const DAILY_FREE_BUDGET = 37;
export const WEEKLY_BUDGET = 259;
export const MONTHLY_FREE = 1820;

export const IDR_PER_RMB = 2174;
export const PAYDAY_DAY = 1;

export const CATEGORIES = ['FOOD', 'SNACKS', 'PERSONAL', 'OTHER'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  FOOD:     { label: 'Food',     color: '#e8ff47' },
  SNACKS:   { label: 'Snacks',   color: '#47d4ff' },
  PERSONAL: { label: 'Personal', color: '#8b47ff' },
  OTHER:    { label: 'Other',    color: '#888888' },
};

export const GYM_BILLING_MONTHS = [1, 4, 7, 10]; // quarterly
