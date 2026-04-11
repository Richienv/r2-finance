import { cn } from '@/lib/cn';

export function AppShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main
      className={cn(
        'fixed inset-0 flex flex-col bg-bg text-white overflow-hidden',
        'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      {children}
    </main>
  );
}
