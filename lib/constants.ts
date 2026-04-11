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

export const DAILY_FREE_BUDGET = 37;
export const IDR_PER_RMB = 2174;
export const PAYDAY_DAY = 1;

export const CATEGORIES = ['FOOD', 'PERSONAL', 'OTHER', 'FIXED'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_META: Record<Category, { label: string; emoji: string; color: string }> = {
  FOOD:     { label: 'Food',     emoji: '🍜', color: '#e8ff47' },
  PERSONAL: { label: 'Personal', emoji: '🛍️', color: '#8b47ff' },
  OTHER:    { label: 'Other',    emoji: '📦', color: '#888888' },
  FIXED:    { label: 'Fixed',    emoji: '🏠', color: '#ff6b35' },
};

export const GYM_BILLING_MONTHS = [1, 4, 7, 10]; // quarterly
