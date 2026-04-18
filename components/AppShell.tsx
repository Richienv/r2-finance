import { cn } from '@/lib/cn';

export function AppShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="fixed inset-0 flex justify-center bg-black overflow-hidden">
      <main
        className={cn(
          'relative w-full max-w-[440px] h-full flex flex-col bg-bg text-white overflow-hidden',
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          'shadow-[0_0_60px_rgba(0,0,0,0.6)]',
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}
