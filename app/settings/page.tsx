import { FinanceApp } from '@/components/FinanceApp';
import { loadFinanceData } from '@/app/finance-data';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const data = await loadFinanceData();
  return <FinanceApp data={data} initialScreen="settings" />;
}
