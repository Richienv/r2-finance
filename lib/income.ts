export const INCOME_SOURCES = ['SALARY', 'BONUS', 'SIDE', 'OTHER'] as const;
export type IncomeSource = (typeof INCOME_SOURCES)[number];
