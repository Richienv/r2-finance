import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { TopPurchasesList } from '@/components/TopPurchasesList';
import { getTopPurchases } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function TopPage() {
  const items = await getTopPurchases(100);

  return (
    <AppShell>
      <header className="h-[60px] shrink-0 flex items-center justify-between px-4 border-b hairline">
        <Link
          href="/"
          aria-label="Back"
          className="w-10 h-10 -ml-2 flex items-center justify-center font-mono text-[14px] text-[#888] active:text-white"
        >
          ←
        </Link>
        <span className="font-display text-xl tracking-wider">TOP PURCHASES</span>
        <span className="font-mono text-[10px] text-muted tabular-nums">
          {items.length}
        </span>
      </header>
      <TopPurchasesList items={items} />
      <BottomNav />
    </AppShell>
  );
}
