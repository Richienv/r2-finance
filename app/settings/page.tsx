import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { prisma } from '@/lib/prisma';
import { currentMonthKey } from '@/lib/date';
import { MONTHLY_ALLOWANCE_IDR, MONTHLY_ALLOWANCE_RMB, IDR_PER_RMB, PAYDAY_DAY } from '@/lib/constants';
import { upsertSettings, resetMonth, addFixedCost, deleteFixedCost } from '@/app/actions/settings';
import { formatRMB } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const month = currentMonthKey();
  const [settings, fixed] = await Promise.all([
    prisma.monthlySettings.findUnique({ where: { month } }),
    prisma.fixedCost.findMany({ where: { active: true } }),
  ]);
  const s = settings ?? {
    allowanceIDR: MONTHLY_ALLOWANCE_IDR,
    allowanceRMB: MONTHLY_ALLOWANCE_RMB,
    idrPerRmb: IDR_PER_RMB,
    paydayDay: PAYDAY_DAY,
  };

  return (
    <AppShell>
      <header className="h-[60px] shrink-0 flex items-center px-4 border-b hairline">
        <span className="font-display text-xl tracking-wider">SETTINGS</span>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <form
          action={async (fd: FormData) => {
            'use server';
            await upsertSettings({
              allowanceIDR: Number(fd.get('allowanceIDR')),
              allowanceRMB: Number(fd.get('allowanceRMB')),
              idrPerRmb:    Number(fd.get('idrPerRmb')),
              paydayDay:    Number(fd.get('paydayDay')),
            });
          }}
          className="space-y-3"
        >
          <Field name="allowanceIDR" label="MONTHLY ALLOWANCE (IDR)" defaultValue={s.allowanceIDR} />
          <Field name="allowanceRMB" label="MONTHLY ALLOWANCE (RMB)" defaultValue={s.allowanceRMB} />
          <Field name="idrPerRmb"    label="IDR PER RMB RATE"        defaultValue={s.idrPerRmb} />
          <Field name="paydayDay"    label="PAYDAY DAY"              defaultValue={s.paydayDay} />
          <button className="mt-2 h-11 w-full rounded-md bg-accent text-black font-mono text-xs tracking-widest">SAVE</button>
        </form>

        <section>
          <div className="font-mono text-[10px] text-muted tracking-widest mb-2">FIXED COSTS</div>
          <ul className="space-y-2">
            {fixed.map(f => (
              <li key={f.id} className="flex items-center justify-between border hairline rounded-md px-3 h-11">
                <span className="text-sm">{f.name}</span>
                <span className="font-mono text-xs text-muted tabular-nums">{formatRMB(f.amountRMB)} RMB</span>
                <form action={async () => { 'use server'; await deleteFixedCost(f.id); }}>
                  <button className="ml-3 text-danger font-mono text-[10px]">REMOVE</button>
                </form>
              </li>
            ))}
          </ul>

          <form
            action={async (fd: FormData) => {
              'use server';
              await addFixedCost({
                name: String(fd.get('name') ?? '').trim(),
                amountRMB: Number(fd.get('amountRMB')),
                billingDay: fd.get('billingDay') ? Number(fd.get('billingDay')) : undefined,
              });
            }}
            className="mt-3 grid grid-cols-3 gap-2"
          >
            <input name="name" placeholder="Name" className="col-span-1 h-10 px-3 rounded-md bg-surface border hairline outline-none text-xs" />
            <input name="amountRMB" placeholder="RMB" inputMode="decimal" className="col-span-1 h-10 px-3 rounded-md bg-surface border hairline outline-none text-xs" />
            <button className="col-span-1 h-10 rounded-md border hairline font-mono text-[10px] tracking-widest">+ ADD</button>
          </form>
        </section>

        <form action={async () => { 'use server'; await resetMonth(); }}>
          <button className="h-11 w-full rounded-md border hairline text-danger font-mono text-xs tracking-widest">
            RESET THIS MONTH
          </button>
        </form>

        <a
          href="/api/export"
          className="block h-11 leading-[44px] text-center rounded-md border hairline font-mono text-xs tracking-widest text-muted"
        >
          EXPORT CSV
        </a>
      </div>

      <BottomNav />
    </AppShell>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: number | string }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] text-muted tracking-widest">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        inputMode="decimal"
        className="mt-1 h-11 w-full px-3 rounded-md bg-surface border hairline outline-none text-sm"
      />
    </label>
  );
}
