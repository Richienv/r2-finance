import { FinanceApp } from '@/components/FinanceApp';
import { loadFinanceData } from '@/app/finance-data';

export const dynamic = 'force-dynamic';

export default async function MonthPage() {
  const data = await loadFinanceData();
  return <FinanceApp data={data} initialScreen="month" />;
}
