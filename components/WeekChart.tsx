import { DAILY_BUDGET } from '@/lib/constants';

const LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function WeekChart({
  days,
  totalsByDay,
  today,
}: {
  days: string[];
  totalsByDay: Record<string, number>;
  today: string;
}) {
  const values = days.map(d => totalsByDay[d] ?? 0);
  const max = Math.max(DAILY_BUDGET * 1.5, ...values) || 1;

  const W = 320;
  const H = 120;
  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 4;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const points = values.map((v, i) => {
    const x = PAD_L + (plotW * i) / Math.max(1, values.length - 1);
    const y = PAD_T + plotH - (v / max) * plotH;
    return { x, y, v, date: days[i] };
  });

  const budgetY = PAD_T + plotH - (DAILY_BUDGET / max) * plotH;
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1].x.toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`;

  return (
    <div className="shrink-0 px-4 pt-3 pb-1">
      <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wc-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8ff47" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#e8ff47" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* budget baseline */}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={budgetY}
          y2={budgetY}
          stroke="#333"
          strokeDasharray="2 3"
          strokeWidth="0.75"
        />
        <text x={W - PAD_R} y={budgetY - 3} textAnchor="end" fontSize="7" fill="#555" fontFamily="monospace">
          ¥{DAILY_BUDGET}
        </text>

        {/* area + line */}
        <path d={areaD} fill="url(#wc-area)" />
        <path d={pathD} fill="none" stroke="#e8ff47" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />

        {/* dots + day labels */}
        {points.map((p, i) => {
          const over = p.v > DAILY_BUDGET;
          const isToday = p.date === today;
          const color = p.v === 0 ? '#333' : over ? '#ff4747' : '#e8ff47';
          return (
            <g key={p.date}>
              <circle cx={p.x} cy={p.y} r={isToday ? 2.8 : 2} fill={color} stroke="#080808" strokeWidth="0.75" />
              <text
                x={p.x}
                y={H + 10}
                textAnchor="middle"
                fontSize="7"
                fill={isToday ? '#e8ff47' : '#555'}
                fontFamily="monospace"
                letterSpacing="1"
              >
                {LABELS[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
