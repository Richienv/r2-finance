export const MACRO_TYPES = ['INCOME', 'EXPENSE'] as const;
export type MacroType = (typeof MACRO_TYPES)[number];

export const MACRO_INCOME_CATEGORIES = [
  'SALARY',
  'BONUS',
  'SIDE',
  'SALE',
  'GIFT',
  'REFUND',
  'OTHER',
] as const;
export type MacroIncomeCategory = (typeof MACRO_INCOME_CATEGORIES)[number];

export const MACRO_EXPENSE_CATEGORIES = [
  'GEAR',
  'TECH',
  'TRAVEL',
  'HOME',
  'GIFT',
  'HEALTH',
  'OTHER',
] as const;
export type MacroExpenseCategory = (typeof MACRO_EXPENSE_CATEGORIES)[number];

export function isValidMacroCategory(type: MacroType, category: string): boolean {
  const list = type === 'INCOME' ? MACRO_INCOME_CATEGORIES : MACRO_EXPENSE_CATEGORIES;
  return (list as readonly string[]).includes(category);
}
