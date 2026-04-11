import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { AddExpenseForm } from '@/components/AddExpenseForm';

export default function AddPage() {
  return (
    <AppShell>
      <Suspense>
        <AddExpenseForm />
      </Suspense>
      <BottomNav />
    </AppShell>
  );
}
