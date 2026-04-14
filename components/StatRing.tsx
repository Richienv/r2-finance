type Props = {
  value: string;
  unit?: string;
  pct: number; // 0..1
  color: string;
  over?: boolean;
  label: string;
};

export function StatRing({ value, unit, pct, color, over, label }: Props) {
  const size = 92;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  const offset = c * (1 - clamped);
  const fg = over ? '#ff4444' : color;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#2a2a2a"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={fg}
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
            className="font-display text-[22px] leading-none tabular-nums"
            style={{ color: fg }}
          >
            {value}
          </div>
          {unit && (
            <div className="mt-1 font-mono text-[7px] tracking-[1.5px] text-[#555] uppercase">
              {unit}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 font-mono text-[9px] tracking-[1.5px] text-[#555] uppercase">
        {label}
      </div>
    </div>
  );
}
