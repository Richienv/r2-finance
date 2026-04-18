type Props = {
  value: string;
  unit?: string;
  pct: number; // 0..1
  gradientId: string;
  gradientFrom: string;
  gradientTo: string;
  numberColor: string;
  label: string;
  over?: boolean;
};

export function StatRing({
  value,
  unit,
  pct,
  gradientId,
  gradientFrom,
  gradientTo,
  numberColor,
  label,
  over = false,
}: Props) {
  const size = 120;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // When over-budget, ring is fully drawn to signal "all used up".
  const clamped = over ? 1 : Math.max(0, Math.min(1, pct));
  const offset = c * (1 - clamped);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={gradientFrom} />
              <stop offset="100%" stopColor={gradientTo} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#1a1a1a"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 400ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="font-display text-[30px] leading-none tabular-nums"
            style={{ color: numberColor }}
          >
            {value}
          </div>
          {unit && (
            <div className="mt-1.5 font-mono text-[8px] tracking-[1.5px] text-[#555] uppercase">
              {unit}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 font-mono text-[9px] tracking-[1.5px] text-[#555] uppercase">
        {label}
      </div>
    </div>
  );
}
