import { formatRMB } from '@/lib/money';

type Props = {
  dailyBudget: number;
  weeklyBudget: number;
  monthlyBudget: number;
  todaySpent: number;
  weekSpent: number;
  monthSpent: number;
};

export function BudgetStats({
  dailyBudget,
  weeklyBudget,
  monthlyBudget,
  todaySpent,
  weekSpent,
  monthSpent,
}: Props) {
  const cols: {
    label: string;
    value: number;
    sub: string;
    spent: number;
    spentSub: string;
  }[] = [
    {
      label: 'DAILY',
      value: dailyBudget,
      sub: 'budget/day',
      spent: todaySpent,
      spentSub: 'today',
    },
    {
      label: 'WEEKLY',
      value: weeklyBudget,
      sub: 'budget/wk',
      spent: weekSpent,
      spentSub: 'this week',
    },
    {
      label: 'MONTHLY',
      value: monthlyBudget,
      sub: 'free/month',
      spent: monthSpent,
      spentSub: 'this month',
    },
  ];

  return (
    <div className="shrink-0 mx-4 my-3 rounded-lg border-[0.5px] border-[#222] bg-[#0d0d0d] overflow-hidden">
      <div className="grid grid-cols-3">
        {cols.map((c, i) => (
          <div
            key={c.label}
            className={
              'px-3 py-2.5 flex flex-col items-center text-center ' +
              (i < 2 ? 'border-r-[0.5px] border-[#222]' : '')
            }
          >
            <div className="font-mono text-[9px] tracking-[1.5px] uppercase text-[#555]">
              {c.label}
            </div>
            <div className="mt-1 font-sans text-[16px] font-bold leading-none text-white tabular-nums">
              {formatRMB(c.value)} <span className="text-[10px] font-mono font-normal text-[#555]">RMB</span>
            </div>
            <div className="mt-0.5 font-mono text-[8px] text-[#444]">{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 border-t-[0.5px] border-[#222]">
        {cols.map((c, i) => {
          const over = c.spent > c.value;
          return (
            <div
              key={c.label + '-spent'}
              className={
                'px-3 py-2.5 flex flex-col items-center text-center ' +
                (i < 2 ? 'border-r-[0.5px] border-[#222]' : '')
              }
            >
              <div
                className="font-sans text-[16px] font-bold leading-none tabular-nums"
                style={{ color: over ? '#ff4747' : '#e8ff47' }}
              >
                {formatRMB(c.spent)}{' '}
                <span className="text-[9px] font-mono font-normal tracking-[1px] text-[#555]">
                  SPENT
                </span>
              </div>
              <div className="mt-0.5 font-mono text-[8px] text-[#444]">{c.spentSub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
