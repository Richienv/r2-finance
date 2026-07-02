'use client';

import { useEffect, useState, useTransition, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import type { FinanceData } from '@/app/finance-data';
import { addExpense, deleteExpense } from '@/app/actions/expenses';
import { addMacro, deleteMacro } from '@/app/actions/macro';
import { upsertSettings, resetMonth, addFixedCost, deleteFixedCost } from '@/app/actions/settings';
import type { Category } from '@/lib/constants';

// ── fonts ────────────────────────────────────────────────────────────────────
const FT = 'var(--font-inter-tight), sans-serif';
const FI = 'var(--font-inter), sans-serif';
const FM = 'var(--font-jetbrains), monospace';

const MS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const WD = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const C = 289.03; // ring circumference (r=46)

const DAILY = 37, WEEKLY = 259, MONTHLY_FREE = 1820;

type Screen = 'home' | 'week' | 'month' | 'macro' | 'settings';

const DAILY_CATS: Category[] = ['FOOD', 'SNACKS', 'PERSONAL', 'OTHER'];
const MACRO_INCOME_CATS = ['SALARY', 'BONUS', 'GIFT', 'OTHER'];
const MACRO_EXPENSE_CATS = ['HOME', 'TECH', 'TRAVEL', 'OTHER'];

// quick-add gradients (home)
const QCOL: Record<string, { g1: string; g2: string; b: string; t: string }> = {
  FOOD:     { g1: '#EAF0FF', g2: '#D6E3FF', b: '#BED2FF', t: '#0047FF' },
  SNACKS:   { g1: '#FBF3E1', g2: '#F5E7C4', b: '#E9D7A4', t: '#9A6B12' },
  PERSONAL: { g1: '#F1ECFF', g2: '#E4D8FF', b: '#D2C2FF', t: '#5B3FD0' },
  OTHER:    { g1: '#F4F2EC', g2: '#EAE7DE', b: '#DBD7CD', t: '#57544E' },
};

// category styling (timeline, chips)
const CATSTYLE: Record<string, { a: string; g1: string; g2: string; b: string }> = {
  FOOD:      { a: '#0047FF', g1: '#EEF3FF', g2: '#E1EAFF', b: '#CFDDFF' },
  SNACKS:    { a: '#B5791A', g1: '#FBF4E4', g2: '#F5E9CD', b: '#EBDCB0' },
  PERSONAL:  { a: '#6A4AE0', g1: '#F2EEFF', g2: '#E8DEFF', b: '#DACCFF' },
  OTHER:     { a: '#6B6B66', g1: '#F4F2EC', g2: '#EBE8DF', b: '#DEDACF' },
  HOME:      { a: '#B23A4A', g1: '#FBEEF0', g2: '#F6E0E4', b: '#EFCBD2' },
  TECH:      { a: '#6A4AE0', g1: '#F2EEFF', g2: '#E8DEFF', b: '#DACCFF' },
  TRAVEL:    { a: '#217A6A', g1: '#E9F5F2', g2: '#DBEEE9', b: '#C4E3DB' },
  TRANSPORT: { a: '#217A6A', g1: '#E9F5F2', g2: '#DBEEE9', b: '#C4E3DB' },
  HEALTH:    { a: '#3E6B32', g1: '#EEF4EA', g2: '#E1EDDA', b: '#CFE0C4' },
  GEAR:      { a: '#B5791A', g1: '#FBF4E4', g2: '#F5E9CD', b: '#EBDCB0' },
  RENT:      { a: '#B23A4A', g1: '#FBEEF0', g2: '#F6E0E4', b: '#EFCBD2' },
  GYM:       { a: '#B5791A', g1: '#FBF4E4', g2: '#F5E9CD', b: '#EBDCB0' },
  SALARY:    { a: '#3E6B32', g1: '#EEF4EA', g2: '#E1EDDA', b: '#CFE0C4' },
  BONUS:     { a: '#3E6B32', g1: '#EEF4EA', g2: '#E1EDDA', b: '#CFE0C4' },
  GIFT:      { a: '#3E6B32', g1: '#EEF4EA', g2: '#E1EDDA', b: '#CFE0C4' },
  SIDE:      { a: '#3E6B32', g1: '#EEF4EA', g2: '#E1EDDA', b: '#CFE0C4' },
  SALE:      { a: '#3E6B32', g1: '#EEF4EA', g2: '#E1EDDA', b: '#CFE0C4' },
  REFUND:    { a: '#3E6B32', g1: '#EEF4EA', g2: '#E1EDDA', b: '#CFE0C4' },
};
const catStyle = (c: string) => CATSTYLE[c] || CATSTYLE.OTHER;

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const idrFmt = (n: number) => 'Rp ' + Math.round(n).toLocaleString('de-DE');
const wd = (d: string) => WD[new Date(d + 'T00:00:00Z').getUTCDay()];
const short = (d: string) => { const p = d.split('-'); return MS[+p[1] - 1] + ' ' + +p[2]; };
const ringOffset = (spent: number, budget: number) => {
  const over = spent > budget;
  const pct = over ? 1 : Math.max(0, Math.min(1, budget > 0 ? spent / budget : 0));
  return (C * (1 - pct)).toFixed(1);
};
const uid = () => 'tmp_' + Math.random().toString(36).slice(2, 9);
const timeFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const mins = 8 * 60 + (h % (13 * 60));
  return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
};

type Expense = FinanceData['expenses'][number];
type Macro = FinanceData['macros'][number];

export function FinanceApp({ data, initialScreen = 'home' }: { data: FinanceData; initialScreen?: Screen }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const { today, monthKey, weekDays, daysInMonth, daysUntilPayday } = data;
  const monthEnd = `${monthKey}-${String(daysInMonth).padStart(2, '0')}`;

  // ── state ──
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [currency, setCurrency] = useState<'RMB' | 'IDR'>('RMB');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [bankRevealed, setBankRevealed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(today);
  const [macroSel, setMacroSel] = useState(today);
  const [macroRevealed, setMacroRevealed] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  // data (seeded from props, re-synced on router.refresh)
  const [expenses, setExpenses] = useState<Expense[]>(data.expenses);
  const [macros, setMacros] = useState<Macro[]>(data.macros);
  const [fixed, setFixed] = useState(data.fixed);
  useEffect(() => { setExpenses(data.expenses); }, [data.expenses]);
  useEffect(() => { setMacros(data.macros); }, [data.macros]);
  useEffect(() => { setFixed(data.fixed); }, [data.fixed]);

  const [sdraft, setSdraft] = useState({
    allowanceIDR: String(data.settings.allowanceIDR),
    allowanceRMB: String(data.settings.allowanceRMB),
    idrPerRmb: String(data.settings.idrPerRmb),
    paydayDay: String(data.settings.paydayDay),
  });
  const [fdraft, setFdraft] = useState({ name: '', amountRMB: '' });

  const [sheet, setSheet] = useState<{
    open: boolean; closing?: boolean; kind: 'daily' | 'macro'; type: 'INCOME' | 'EXPENSE';
    category: string; amount: string; note: string;
  }>({ open: false, kind: 'daily', type: 'EXPENSE', category: 'FOOD', amount: '', note: '' });

  const persist = (fn: () => Promise<unknown>) => {
    startTransition(async () => {
      try { await fn(); } catch { /* optimistic already applied; refresh reconciles */ }
      router.refresh();
    });
  };

  // ── mutations ──
  const delExpense = (id: string) => {
    setExpenses((xs) => xs.filter((e) => e.id !== id));
    if (!id.startsWith('tmp_')) persist(() => deleteExpense(id));
  };
  const delMacro = (id: string) => {
    setMacros((ms) => ms.filter((m) => m.id !== id));
    if (!id.startsWith('tmp_')) persist(() => deleteMacro(id));
  };

  const closeSheet = () => {
    setSheet((s) => (s.closing ? s : { ...s, closing: true }));
    setTimeout(() => setSheet((s) => ({ ...s, open: false, closing: false })), 250);
  };
  const openSheet = (kind: 'daily' | 'macro', type: 'INCOME' | 'EXPENSE', category: string) =>
    setSheet({ open: true, kind, type, category, amount: '', note: '' });
  const press = (k: string) =>
    setSheet((s) => {
      const a = s.amount || '';
      if (k === '⌫') return { ...s, amount: a.slice(0, -1) };
      if (k === '.') return a.includes('.') ? s : { ...s, amount: a + '.' };
      if (a.replace('.', '').length < 7) return { ...s, amount: a + k };
      return s;
    });

  const confirmSheet = () => {
    const amt = parseFloat(sheet.amount);
    if (!(amt > 0)) return;
    const note = sheet.note.trim() || null;
    if (sheet.kind === 'daily') {
      const cat = sheet.category as Category;
      setExpenses((xs) => [...xs, { id: uid(), date: today, category: cat, note, amountRMB: amt }]);
      persist(() => addExpense({ amountRMB: amt, category: cat, note: note ?? undefined, date: today }));
    } else {
      setMacros((ms) => [...ms, { id: uid(), date: macroSel, type: sheet.type, category: sheet.category, note, amountRMB: amt }]);
      persist(() => addMacro({ type: sheet.type, amountRMB: amt, category: sheet.category, note: note ?? undefined, date: macroSel }));
    }
    closeSheet();
  };

  const saveSettings = () => {
    const payload = {
      allowanceIDR: +sdraft.allowanceIDR || 0,
      allowanceRMB: +sdraft.allowanceRMB || 0,
      idrPerRmb: +sdraft.idrPerRmb || 1,
      paydayDay: +sdraft.paydayDay || 1,
    };
    setSaved(true);
    persist(() => upsertSettings(payload));
    setTimeout(() => setSaved(false), 1600);
  };
  const removeFixed = (id: string) => { setFixed((fs) => fs.filter((f) => f.id !== id)); persist(() => deleteFixedCost(id)); };
  const addFixed = () => {
    const amt = parseFloat(fdraft.amountRMB);
    if (!fdraft.name.trim() || !(amt > 0)) return;
    setFixed((fs) => [...fs, { id: uid(), name: fdraft.name.trim(), amountRMB: amt }]);
    persist(() => addFixedCost({ name: fdraft.name.trim(), amountRMB: amt }));
    setFdraft({ name: '', amountRMB: '' });
  };
  const shiftDay = (delta: number) => {
    const d = new Date(macroSel + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + delta);
    const iso = d.toISOString().slice(0, 10);
    if (iso < `${monthKey}-01` || iso > monthEnd) return;
    setMacroSel(iso);
  };

  // ── derived values ──
  const sumOf = (arr: { amountRMB: number }[]) => arr.reduce((a, b) => a + b.amountRMB, 0);
  const monthExp = expenses.filter((e) => e.date.startsWith(monthKey));
  const daySpent = sumOf(expenses.filter((e) => e.date === today));
  const weekSpent = sumOf(expenses.filter((e) => weekDays.includes(e.date)));
  const monthSpent = sumOf(monthExp);
  const income = sumOf(macros.filter((m) => m.type === 'INCOME'));
  const macroExp = sumOf(macros.filter((m) => m.type === 'EXPENSE'));
  const bank = income - macroExp - monthSpent;
  const freeRem = Math.max(0, MONTHLY_FREE - monthSpent);

  const isIDR = currency === 'IDR';
  const rate = data.settings.idrPerRmb;
  const money = (rmb: number) => (isIDR ? idrFmt(rmb * rate) : '¥' + fmt(rmb));
  const moneyK = (rmb: number) => {
    if (!isIDR) return fmt(rmb);
    const v = rmb * rate;
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'm';
    if (v >= 1e3) return Math.round(v / 1e3) + 'k';
    return fmt(v);
  };

  // rings
  const rings = ([['DAY', daySpent, DAILY], ['WEEK', weekSpent, WEEKLY], ['MONTH', monthSpent, MONTHLY_FREE]] as const)
    .map(([label, spent, budget], i) => {
      const pct = budget > 0 ? spent / budget : 0;
      let s0, s1, s2, glow, danger = false;
      if (pct >= 0.85) { danger = true; s0 = '#FF8A72'; s1 = '#E23B2B'; s2 = '#8E1E12'; glow = 'rgba(226,59,43,0.55)'; }
      else if (pct >= 0.6) { s0 = '#FFD27A'; s1 = '#E8952B'; s2 = '#A85F16'; glow = 'rgba(232,149,43,0.48)'; }
      else { s0 = '#7AACFF'; s1 = '#0047FF'; s2 = '#00297A'; glow = 'rgba(0,71,255,0.42)'; }
      return {
        label, num: moneyK(spent),
        unit: isIDR ? '/ ' + moneyK(budget) + ' Rp' : '/ ' + fmt(budget) + ' RMB',
        offset: ringOffset(spent, budget), numColor: danger ? '#E23B2B' : '#141413',
        gid: 'rg' + i, glid: 'rgl' + i, s0, s1, s2, glow,
        anim: danger ? 'ringPulse 1.15s ease-in-out infinite' : 'none',
      };
    });

  const purchases = [...expenses].sort((a, b) => b.amountRMB - a.amountRMB).slice(0, 3).map((p, i) => ({
    id: p.id, label: p.note || p.category, amt: money(p.amountRMB), sep: i !== 0,
    shownName: !!revealed[p.id],
  }));

  // week
  const weekVals = weekDays.map((d) => sumOf(expenses.filter((e) => e.date === d)));
  const wbMax = Math.max(55.5, ...weekVals);
  const budgetBottom = Math.round((DAILY / wbMax) * 84);
  const weekBars = weekVals.map((v, i) => {
    const day = weekDays[i]; const over = v > DAILY; const isToday = day === today;
    return {
      h: v === 0 ? 4 : Math.max(10, Math.round((v / wbMax) * 84)),
      grad: over ? 'linear-gradient(180deg,#FF9E86,#E0492F 60%,#B0281A)' : 'linear-gradient(180deg,#7FB0FF,#0047FF 60%,#0033B8)',
      shadow: over ? 'rgba(194,51,37,0.32)' : 'rgba(0,71,255,0.32)',
      val: '¥' + fmt(v), label: wd(day),
      valColor: isToday ? '#141413' : over ? '#A8362B' : '#6B6B66',
      labelColor: isToday ? '#0047FF' : '#A6A29A',
    };
  });
  const weekList = weekDays.map((d) => {
    const items = expenses.filter((e) => e.date === d);
    const total = sumOf(items); const open = expanded === d; const isToday = d === today; const over = total > DAILY;
    return {
      date: d, amt: '¥' + fmt(total), open, empty: items.length === 0,
      label: wd(d) + ', ' + short(d) + (isToday ? ' · TODAY' : ''),
      labelColor: isToday ? '#0047FF' : '#6B6B66',
      amtColor: over ? '#A8362B' : '#4A7A3C', statusTag: over ? 'OVER' : 'UNDER',
      fill: over ? 'linear-gradient(180deg,#FBEFEC,#F7E2DD)' : 'linear-gradient(180deg,#EEF4EA,#E2ECDB)',
      border: isToday ? '#BED2FF' : over ? '#EFCBD2' : '#CFE0C4',
      chevron: open ? '▲' : '▼',
      items: items.map((e) => ({ id: e.id, category: e.category, note: e.note || '—', amt: '¥' + fmt(e.amountRMB) })),
    };
  });
  const wkDelta = WEEKLY - weekSpent;

  // month
  const catSum = (c: string) => sumOf(monthExp.filter((e) => e.category === c));
  const totForPct = Math.max(1, monthSpent);
  const monthCats = ([['Food', 'FOOD', '#141413'], ['Snacks', 'SNACKS', '#6B6B66'], ['Personal', 'PERSONAL', '#8A8781'], ['Other', 'OTHER', '#B4B1A9']] as const)
    .map(([label, c, bar]) => {
      const v = catSum(c); const pct = (v / totForPct) * 100;
      return { label, amt: '¥' + fmt(v), pctLabel: Math.round(pct) + '%', width: Math.min(100, pct) + '%', bar };
    });
  const monthCards = [
    { label: 'ALLOWANCE', value: '¥' + fmt(data.settings.allowanceRMB), sub: idrFmt(data.settings.allowanceIDR), color: '#141413' },
    { label: 'SPENT', value: '¥' + fmt(monthSpent), sub: '', color: '#141413' },
    { label: 'FIXED OUT', value: '¥' + fmt(macroExp), sub: '(auto)', color: '#141413' },
    { label: 'FREE', value: '¥' + fmt(freeRem), sub: 'remaining', color: '#0047FF' },
  ];

  // macro day
  const dayMacros = macros.filter((m) => m.date === macroSel);
  const dayDaily = expenses.filter((e) => e.date === macroSel);
  const macroEntriesRaw = [
    ...dayMacros.map((m) => ({ src: 'M' as const, type: m.type, category: m.category, note: m.note, amt: m.amountRMB, id: m.id })),
    ...dayDaily.map((e) => ({ src: 'D' as const, type: 'EXPENSE', category: e.category, note: e.note, amt: e.amountRMB, id: e.id })),
  ];
  const timeline = macroEntriesRaw.map((e) => {
    const cs = catStyle(e.category);
    return {
      id: e.id, time: timeFor(e.id), note: e.note || '—',
      catLabel: e.src === 'M' ? e.type + ' · ' + e.category : e.category,
      catShown: !!macroRevealed[e.id],
      accent: cs.a, fill: `linear-gradient(180deg, ${cs.g1}, ${cs.g2})`, border: cs.b, dotHalo: cs.g2,
      amt: (e.type === 'INCOME' ? '+' : '−') + '¥' + fmt(e.amt),
      amtColor: e.type === 'INCOME' ? '#3E6B32' : '#141413',
      src: e.src,
    };
  }).sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  const catTotals: Record<string, number> = {};
  macroEntriesRaw.forEach((e) => { if (e.type === 'EXPENSE') catTotals[e.category] = (catTotals[e.category] || 0) + e.amt; });
  const dayCategories = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat, amt]) => {
    const cs = catStyle(cat);
    return { name: cat, amt: '¥' + fmt(amt), accent: cs.a, fill: `linear-gradient(180deg, ${cs.g1}, ${cs.g2})`, border: cs.b };
  });
  const dayNet = sumOf(dayMacros.filter((m) => m.type === 'INCOME')) - (sumOf(dayMacros.filter((m) => m.type === 'EXPENSE')) + sumOf(dayDaily));
  const macroDaySub = (macroSel === today ? 'TODAY' : wd(macroSel)) + ' · ' +
    (timeline.length === 0 ? 'no activity' : (dayNet >= 0 ? '+' : '−') + '¥' + fmt(Math.abs(dayNet)));

  // sheet derived
  const isInc = sheet.type === 'INCOME';
  const sheetCatList = sheet.kind === 'daily' ? DAILY_CATS : isInc ? MACRO_INCOME_CATS : MACRO_EXPENSE_CATS;
  const validAmt = parseFloat(sheet.amount) > 0;

  const bankColor = bank < 0 ? '#A8362B' : '#141413';
  const homeSub = money(DAILY) + ' BUDGET · ' + money(Math.max(0, DAILY - daySpent)) + ' LEFT';

  // ── style shorthands ──
  const monoLbl = (size: number, ls: string, color: string): CSSProperties => ({ fontFamily: FM, fontSize: size, letterSpacing: ls, color });

  const navItem: CSSProperties = {
    flex: 1, background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, position: 'relative',
  };
  const navColor = (s: Screen) => (screen === s ? '#0047FF' : '#6B6B66');

  return (
    <div style={{ minHeight: '100dvh', background: '#EFEDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(0px,2vw,32px)', fontFamily: FI }}>
      <div style={{ width: 'min(100%,390px)', height: 'min(100dvh,844px)', borderRadius: 'clamp(0px,4vw,44px)', border: '1px solid #E5E3DC', background: '#FAF9F5', boxShadow: '0 40px 80px rgba(20,20,19,.16)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', color: '#141413' }}>

        {/* STATUS BAR */}
        <div style={{ height: 44, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px 0 30px' }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>R2</span>
          <span style={monoLbl(10, '.1em', '#6B6B66')}>{short(today)} · {monthKey}</span>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* ===== HOME ===== */}
          {screen === 'home' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 'none', padding: '6px 22px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <span style={{ fontFamily: FT, fontWeight: 600, fontSize: 21, letterSpacing: '-.02em' }}>R2</span>
                    <span style={monoLbl(10, '.22em', '#6B6B66')}>&nbsp;· FINANCE</span>
                  </div>
                  <div style={{ marginTop: 9, ...monoLbl(9.5, '.12em', '#6B6B66') }}>{wd(today)}, {short(today)}</div>
                  <div style={{ marginTop: 4, ...monoLbl(9.5, '.1em', '#A6A29A') }}>{homeSub}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 9 }}>
                  <div style={{ display: 'flex', border: '1px solid #E5E3DC', borderRadius: 3, overflow: 'hidden' }}>
                    <button onClick={() => setCurrency('RMB')} style={{ width: 30, height: 26, background: isIDR ? '#FAF9F5' : '#0047FF', color: isIDR ? '#6B6B66' : '#FAF9F5', border: 'none', cursor: 'pointer', fontFamily: FM, fontSize: 12, transition: 'background .2s,color .2s' }}>¥</button>
                    <button onClick={() => setCurrency('IDR')} style={{ width: 30, height: 26, background: isIDR ? '#0047FF' : '#FAF9F5', color: isIDR ? '#FAF9F5' : '#6B6B66', border: 'none', borderLeft: '1px solid #E5E3DC', cursor: 'pointer', fontFamily: FM, fontSize: 11, letterSpacing: '.03em', transition: 'background .2s,color .2s' }}>Rp</button>
                  </div>
                  <button onClick={() => setScreen('month')} style={{ background: 'none', border: 'none', cursor: 'pointer', ...monoLbl(10, '.2em', '#6B6B66'), padding: 0 }}>{MS[+monthKey.split('-')[1] - 1]} {monthKey.split('-')[0]} →</button>
                </div>
              </div>

              {/* top purchases */}
              <div style={{ flex: 'none', height: 46, display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px', borderBottom: '1px solid #E5E3DC' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, overflowX: 'auto', whiteSpace: 'nowrap' }}>
                  {purchases.map((p) => (
                    <button key={p.id} onClick={() => setRevealed((r) => ({ ...r, [p.id]: !r[p.id] }))} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 7, flex: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                      {p.sep && <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#D8D5CC', alignSelf: 'center' }} />}
                      {p.shownName && <span style={{ fontFamily: FI, fontSize: 11.5, color: '#6B6B66' }}>{p.label}</span>}
                      <span style={{ fontFamily: FT, fontWeight: 500, fontSize: 15, letterSpacing: '-.01em', color: '#141413' }}>{p.amt}</span>
                    </button>
                  ))}
                  {purchases.length === 0 && <span style={monoLbl(11, '.06em', '#B4B1A9')}>no spending yet</span>}
                </div>
                <button onClick={() => setScreen('macro')} style={{ background: 'none', border: 'none', cursor: 'pointer', ...monoLbl(8.5, '.18em', '#0047FF'), flex: 'none', whiteSpace: 'nowrap' }}>MORE →</button>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 36, padding: '0 20px' }}>
                {/* rings */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 14 }}>
                  {rings.map((r) => (
                    <div key={r.gid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ position: 'relative', width: 100, height: 100 }}>
                        <svg width="100" height="100" viewBox="0 0 100 100">
                          <defs>
                            <linearGradient id={r.gid} x1="0" y1="0" x2="0.35" y2="1">
                              <stop offset="0%" stopColor={r.s0} />
                              <stop offset="52%" stopColor={r.s1} />
                              <stop offset="100%" stopColor={r.s2} />
                            </linearGradient>
                            <filter id={r.glid} x="-60%" y="-60%" width="220%" height="220%">
                              <feDropShadow dx="0" dy="1.5" stdDeviation="2.6" floodColor={r.glow} />
                            </filter>
                          </defs>
                          <circle cx="50" cy="50" r="49.4" stroke="#F3F1EB" strokeWidth="1" fill="none" />
                          <circle cx="50" cy="50" r="46" stroke="#ECE9E2" strokeWidth="7.5" fill="none" />
                          <circle cx="50" cy="50" r="42.4" stroke="#DBD8CF" strokeWidth="1" fill="none" />
                          <circle cx="50" cy="50" r="46" stroke={`url(#${r.gid})`} strokeWidth="6.5" fill="none" strokeDasharray="289" strokeDashoffset={r.offset} strokeLinecap="round" transform="rotate(-90 50 50)" filter={`url(#${r.glid})`} style={{ transition: 'stroke-dashoffset .5s cubic-bezier(.16,1,.3,1)', animation: r.anim }} />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ fontFamily: FT, fontWeight: 500, fontSize: 26, color: r.numColor }}>{r.num}</div>
                          <div style={{ marginTop: 3, ...monoLbl(8, '.1em', '#A6A29A') }}>{r.unit}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 12, ...monoLbl(9, '.16em', '#6B6B66') }}>{r.label}</div>
                    </div>
                  ))}
                </div>

                {/* bank */}
                <button onClick={() => setBankRevealed((v) => !v)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <span style={monoLbl(9, '.2em', '#6B6B66')}>BANK</span>
                  <span style={{ fontFamily: FT, fontWeight: 500, fontSize: 30, color: bankColor }}>{(bank < 0 ? '−' : '') + money(Math.abs(bank))}</span>
                  {!bankRevealed && <span style={monoLbl(8, '.14em', '#CFCCC3')}>TAP TO REVEAL</span>}
                  {bankRevealed && <span style={monoLbl(10, '0', '#A6A29A')}>≈ {(bank < 0 ? '−' : '') + (isIDR ? '¥' + fmt(Math.abs(bank)) : idrFmt(Math.abs(bank) * rate))}</span>}
                  {bankRevealed && <span style={{ marginTop: 2, fontFamily: FM, fontSize: 9, letterSpacing: '.06em' }}><span style={{ color: '#4A7A3C' }}>{'+' + money(income) + ' IN'}</span><span style={{ color: '#CFCCC3', margin: '0 8px' }}>·</span><span style={{ color: '#A8362B' }}>{'−' + money(macroExp) + ' OUT'}</span></span>}
                  {bankRevealed && <span style={{ marginTop: 10, ...monoLbl(9, '.14em', '#A6A29A') }}>{money(freeRem)} · FREE POOL</span>}
                </button>
              </div>

              {/* quick add */}
              <div style={{ flex: 'none', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '12px 16px 16px' }}>
                {DAILY_CATS.map((c) => {
                  const q = QCOL[c];
                  return (
                    <button key={c} onClick={() => openSheet('daily', 'EXPENSE', c)} style={{ height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: `linear-gradient(180deg, ${q.g1}, ${q.g2})`, border: `1px solid ${q.b}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 4px rgba(20,20,19,0.07)', fontFamily: FM, fontSize: 10, letterSpacing: '.1em', color: q.t, cursor: 'pointer' }}>{c}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== WEEK ===== */}
          {screen === 'week' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 58, flex: 'none', display: 'flex', alignItems: 'center', padding: '0 8px', borderBottom: '1px solid #E5E3DC' }}>
                <div style={{ width: 44, textAlign: 'center', ...monoLbl(15, '0', '#D8D5CC') }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontFamily: FT, fontWeight: 500, fontSize: 16, letterSpacing: '-.01em' }}>THIS WEEK</span>
                  <span style={monoLbl(10, '0', '#6B6B66')}>{weekDays[0].slice(5).replace('-', '/')} – {weekDays[6].slice(5).replace('-', '/')}</span>
                </div>
                <div style={{ width: 44 }} />
              </div>
              <div style={{ flex: 'none', padding: '18px 18px 8px' }}>
                <div style={{ position: 'relative', height: 96, display: 'flex', alignItems: 'flex-end', gap: 9 }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: budgetBottom, borderTop: '1px dashed #CFCCC3', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', right: 0, bottom: budgetBottom + 3, ...monoLbl(7, '0', '#A6A29A') }}>¥37</div>
                  {weekBars.map((b, i) => (
                    <div key={i} style={{ flex: 1, height: b.h, background: b.grad, borderRadius: '5px 5px 2px 2px', boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.5), 0 4px 8px ${b.shadow}` }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 9, marginTop: 7 }}>
                  {weekBars.map((b, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={monoLbl(8, '0', b.valColor)}>{b.val}</span>
                      <span style={monoLbl(7, '.04em', b.labelColor)}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', paddingTop: 10 }}>
                {weekList.map((d) => (
                  <div key={d.date} style={{ margin: '0 16px 7px', borderRadius: 11, background: d.fill, border: `1px solid ${d.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 4px rgba(20,20,19,0.05)', overflow: 'hidden' }}>
                    <button onClick={() => setExpanded((x) => (x === d.date ? null : d.date))} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 15px', textAlign: 'left' }}>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}>
                        <span style={{ fontFamily: FT, fontWeight: 500, fontSize: 18, letterSpacing: '-.01em', color: d.amtColor }}>{d.amt}</span>
                        <span style={monoLbl(8, '.14em', d.amtColor)}>{d.statusTag}</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={monoLbl(10, '.06em', d.labelColor)}>{d.label}</span>
                        <span style={monoLbl(9, '0', '#B4B1A9')}>{d.chevron}</span>
                      </span>
                    </button>
                    {d.open && (
                      <div style={{ padding: '4px 0 8px', background: 'rgba(255,255,255,0.45)', borderTop: '1px solid rgba(255,255,255,0.6)' }}>
                        {d.items.map((e) => (
                          <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                              <span style={monoLbl(8, '.1em', '#A6A29A')}>{e.category}</span>
                              <span style={{ fontFamily: FI, fontSize: 13, color: '#141413', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.note}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={monoLbl(12, '0', '#141413')}>{e.amt}</span>
                              <button onClick={() => delExpense(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B1A9', fontFamily: FM, fontSize: 11 }}>✕</button>
                            </div>
                          </div>
                        ))}
                        {d.empty && <div style={{ padding: '6px 15px', ...monoLbl(11, '0', '#B4B1A9') }}>— no expenses —</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ flex: 'none', borderTop: '1px solid #E5E3DC', padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 7, ...monoLbl(10, '.1em', '#6B6B66') }}>
                <span>WEEK SPENT</span><span style={{ textAlign: 'right', color: '#141413' }}>{fmt(weekSpent)} RMB</span>
                <span>EXPECTED (7d × 37)</span><span style={{ textAlign: 'right', color: '#A6A29A' }}>259 RMB</span>
                <span>{wkDelta >= 0 ? 'SAVED' : 'OVER'}</span><span style={{ textAlign: 'right', color: wkDelta >= 0 ? '#4A7A3C' : '#A8362B' }}>{(wkDelta >= 0 ? '+' : '−') + fmt(Math.abs(wkDelta))} RMB</span>
                <span>AVG / DAY</span><span style={{ textAlign: 'right', color: '#A6A29A' }}>{fmt(weekSpent / 7)} RMB</span>
              </div>
            </div>
          )}

          {/* ===== MONTH ===== */}
          {screen === 'month' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 58, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', borderBottom: '1px solid #E5E3DC' }}>
                <span style={{ fontFamily: FT, fontWeight: 500, fontSize: 22, letterSpacing: '-.01em' }}>{['January','February','March','April','May','June','July','August','September','October','November','December'][+monthKey.split('-')[1] - 1]} {monthKey.split('-')[0]}</span>
                <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', ...monoLbl(11, '.16em', '#6B6B66') }}>← HOME</button>
              </div>
              <div style={{ flex: 'none', padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {monthCards.map((c) => (
                  <div key={c.label} style={{ border: '1px solid #E5E3DC', borderRadius: 2, background: '#FAF9F5', padding: 14 }}>
                    <div style={monoLbl(10, '.14em', '#6B6B66')}>{c.label}</div>
                    <div style={{ marginTop: 7, fontFamily: FT, fontWeight: 500, fontSize: 22, color: c.color }}>{c.value}</div>
                    <div style={{ marginTop: 3, ...monoLbl(10, '0', '#A6A29A'), minHeight: 13 }}>{c.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, padding: '6px 22px 0', overflowY: 'auto' }}>
                <div style={monoLbl(10, '.16em', '#6B6B66')}>CATEGORY BREAKDOWN</div>
                <div style={{ marginTop: 10 }}>
                  {monthCats.map((c) => (
                    <div key={c.label} style={{ padding: '8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: FM, fontSize: 11 }}>
                        <span style={{ color: '#6B6B66' }}>{c.label}</span>
                        <span style={{ color: '#141413' }}>{c.amt} · {c.pctLabel}</span>
                      </div>
                      <div style={{ marginTop: 6, height: 6, background: '#E5E3DC', borderRadius: 1, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: c.width, background: c.bar, transition: 'width .4s cubic-bezier(.16,1,.3,1)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 'none', height: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, borderTop: '1px solid #E5E3DC' }}>
                <div style={monoLbl(10, '.14em', '#6B6B66')}>NEXT ALLOWANCE IN {daysUntilPayday} DAYS</div>
                <div style={monoLbl(10, '0', '#A6A29A')}>{idrFmt(data.settings.allowanceIDR)}</div>
              </div>
            </div>
          )}

          {/* ===== MACRO ===== */}
          {screen === 'macro' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 'none', padding: '12px 22px', borderBottom: '1px solid #E5E3DC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={monoLbl(9, '.2em', '#6B6B66')}>BALANCE</div>
                  <div style={{ marginTop: 2, fontFamily: FT, fontWeight: 500, fontSize: 26, color: bankColor }}>{(bank < 0 ? '−' : '') + money(Math.abs(bank))}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, fontFamily: FM, fontSize: 10 }}>
                  <span style={{ color: '#4A7A3C' }}>+¥{fmt(income)}</span>
                  <span style={{ color: '#A8362B' }}>−¥{fmt(macroExp)}</span>
                </div>
              </div>
              <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #E5E3DC' }}>
                <button onClick={() => shiftDay(-1)} style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 9, border: '1px solid #E5E3DC', background: '#FAF9F5', cursor: 'pointer', ...monoLbl(15, '0', '#6B6B66'), boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(20,20,19,0.05)' }}>‹</button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: FT, fontWeight: 500, fontSize: 18, letterSpacing: '-.01em', color: '#141413' }}>{short(macroSel)}</div>
                  <div style={{ ...monoLbl(9.5, '.1em', '#6B6B66'), marginTop: 2 }}>{macroDaySub}</div>
                </div>
                <button onClick={() => shiftDay(1)} style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 9, border: '1px solid #E5E3DC', background: '#FAF9F5', cursor: 'pointer', ...monoLbl(15, '0', '#6B6B66'), boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(20,20,19,0.05)' }}>›</button>
              </div>
              <div style={{ flex: 'none', padding: '13px 16px 4px' }}>
                <div style={{ ...monoLbl(9, '.16em', '#6B6B66'), marginBottom: 9 }}>BY CATEGORY</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {dayCategories.map((c) => (
                    <div key={c.name} style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 11, background: c.fill, border: `1px solid ${c.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75), 0 2px 4px rgba(20,20,19,0.05)' }}>
                      <div style={{ ...monoLbl(8, '.12em', c.accent), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ marginTop: 5, fontFamily: FT, fontWeight: 500, fontSize: 18, color: '#141413' }}>{c.amt}</div>
                    </div>
                  ))}
                  {dayCategories.length === 0 && <div style={{ flex: 1, padding: 14, textAlign: 'center', ...monoLbl(10, '0', '#B4B1A9') }}>— no spending —</div>}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #E5E3DC', padding: '12px 16px 6px' }}>
                <div style={{ ...monoLbl(9, '.16em', '#6B6B66'), marginBottom: 12 }}>TIMELINE</div>
                {timeline.map((e) => (
                  <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                    <div style={{ flex: 'none', width: 38, textAlign: 'right', ...monoLbl(10, '0', '#6B6B66'), paddingTop: 12 }}>{e.time}</div>
                    <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 11 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: e.accent, boxShadow: `0 0 0 3px ${e.dotHalo}`, marginTop: 12, flex: 'none' }} />
                      <span style={{ flex: 1, width: 1.5, background: '#E5E3DC', margin: '2px 0' }} />
                    </div>
                    <button onClick={() => setMacroRevealed((r) => ({ ...r, [e.id]: !r[e.id] }))} style={{ flex: 1, minWidth: 0, textAlign: 'left', marginBottom: 8, padding: '9px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderRadius: 10, background: e.fill, border: `1px solid ${e.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75), 0 2px 5px rgba(20,20,19,0.06)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontFamily: FI, fontSize: 13.5, color: '#141413', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.note}</span>
                        {e.catShown && <span style={monoLbl(8, '.14em', e.accent)}>{e.catLabel}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 'none' }}>
                        <span style={monoLbl(14, '0', e.amtColor)}>{e.amt}</span>
                        <span onClick={(ev) => { ev.stopPropagation(); if (e.src === 'M') { delMacro(e.id); } else { delExpense(e.id); } }} style={{ color: '#B4B1A9', fontFamily: FM, fontSize: 12, cursor: 'pointer' }}>✕</span>
                      </div>
                    </button>
                  </div>
                ))}
                {timeline.length === 0 && <div style={{ padding: 24, textAlign: 'center', ...monoLbl(11, '0', '#B4B1A9') }}>— nothing logged on this day —</div>}
              </div>
              <div style={{ flex: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 16px' }}>
                <button onClick={() => openSheet('macro', 'INCOME', 'SALARY')} style={{ height: 48, borderRadius: 11, background: 'linear-gradient(180deg,#3D74FF,#0047FF 55%,#0033C4)', border: '1px solid #2A5FE0', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 5px 14px rgba(0,71,255,0.32)', color: '#FFFFFF', fontFamily: FT, fontWeight: 500, fontSize: 15, letterSpacing: '.02em', textShadow: '0 1px 1px rgba(0,20,90,0.4)', cursor: 'pointer' }}>+ Income</button>
                <button onClick={() => openSheet('macro', 'EXPENSE', 'OTHER')} style={{ height: 48, borderRadius: 11, background: 'linear-gradient(180deg,#E85B4A,#C23325 55%,#9A2015)', border: '1px solid #A82C20', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 5px 14px rgba(194,51,37,0.32)', color: '#FFFFFF', fontFamily: FT, fontWeight: 500, fontSize: 15, letterSpacing: '.02em', textShadow: '0 1px 1px rgba(90,15,5,0.4)', cursor: 'pointer' }}>− Expense</button>
              </div>
            </div>
          )}

          {/* ===== SETTINGS ===== */}
          {screen === 'settings' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 58, flex: 'none', display: 'flex', alignItems: 'center', padding: '0 22px', borderBottom: '1px solid #E5E3DC' }}>
                <span style={{ fontFamily: FT, fontWeight: 500, fontSize: 22, letterSpacing: '-.01em' }}>Settings</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {([['MONTHLY ALLOWANCE (IDR)', 'allowanceIDR'], ['MONTHLY ALLOWANCE (RMB)', 'allowanceRMB'], ['IDR PER RMB RATE', 'idrPerRmb'], ['PAYDAY DAY', 'paydayDay']] as const).map(([label, key]) => (
                    <label key={key} style={{ display: 'block' }}>
                      <span style={monoLbl(10, '.14em', '#6B6B66')}>{label}</span>
                      <input value={sdraft[key]} onChange={(e) => { setSdraft((s) => ({ ...s, [key]: e.target.value })); setSaved(false); }} inputMode="numeric" style={{ marginTop: 7, height: 44, width: '100%', padding: '0 13px', border: '1px solid #CFCCC3', borderRadius: 2, background: '#FAF9F5', fontFamily: FI, fontSize: 14, color: '#141413' }} />
                    </label>
                  ))}
                  <button onClick={saveSettings} style={{ marginTop: 4, height: 44, width: '100%', borderRadius: 2, background: saved ? '#4A7A3C' : '#141413', border: `1px solid ${saved ? '#4A7A3C' : '#141413'}`, color: '#FAF9F5', fontFamily: FM, fontSize: 11, letterSpacing: '.18em', cursor: 'pointer', transition: 'background .2s' }}>{saved ? 'SAVED ✓' : 'SAVE'}</button>
                </div>
                <div>
                  <div style={{ ...monoLbl(10, '.14em', '#6B6B66'), marginBottom: 10 }}>FIXED COSTS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {fixed.map((x) => (
                      <div key={x.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, padding: '0 13px', border: '1px solid #E5E3DC', borderRadius: 2 }}>
                        <span style={{ fontFamily: FI, fontSize: 14, color: '#141413' }}>{x.name}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <span style={monoLbl(11, '0', '#6B6B66')}>{fmt(x.amountRMB)} RMB</span>
                          <button onClick={() => removeFixed(x.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...monoLbl(9, '.1em', '#A8362B') }}>REMOVE</button>
                        </span>
                      </div>
                    ))}
                    {fixed.length === 0 && <div style={monoLbl(11, '0', '#B4B1A9')}>— none —</div>}
                  </div>
                  <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                    <input value={fdraft.name} onChange={(e) => setFdraft((f) => ({ ...f, name: e.target.value }))} placeholder="Name" style={{ height: 40, padding: '0 12px', border: '1px solid #E5E3DC', borderRadius: 2, fontFamily: FI, fontSize: 12, color: '#141413' }} />
                    <input value={fdraft.amountRMB} onChange={(e) => setFdraft((f) => ({ ...f, amountRMB: e.target.value }))} placeholder="RMB" inputMode="numeric" style={{ height: 40, padding: '0 12px', border: '1px solid #E5E3DC', borderRadius: 2, fontFamily: FI, fontSize: 12, color: '#141413' }} />
                    <button onClick={addFixed} style={{ height: 40, padding: '0 16px', border: '1px solid #E5E3DC', borderRadius: 2, background: '#FAF9F5', ...monoLbl(10, '.12em', '#6B6B66'), cursor: 'pointer' }}>+ ADD</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={() => { if (confirm('Delete all this month’s daily expenses?')) persist(() => resetMonth()); }} style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E3DC', borderRadius: 2, background: '#FAF9F5', ...monoLbl(11, '.16em', '#A8362B'), cursor: 'pointer' }}>RESET THIS MONTH</button>
                  <a href="/api/export" style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E3DC', borderRadius: 2, ...monoLbl(11, '.16em', '#6B6B66'), textDecoration: 'none' }}>EXPORT CSV</a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM NAV */}
        <div style={{ height: 76, flex: 'none', borderTop: '1px solid #E5E3DC', background: '#FAF9F5', display: 'flex', alignItems: 'center', padding: '0 4px', position: 'relative', zIndex: 2 }}>
          <button onClick={() => setScreen('home')} style={navItem}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={navColor('home')} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11.5 12 4l8 7.5" /><path d="M6.2 10.2V20h11.6V10.2" /></svg>
            <span style={monoLbl(8.5, '.14em', navColor('home'))}>HOME</span>
            {screen === 'home' && <span style={{ position: 'absolute', bottom: -1, width: 16, height: 1, background: '#0047FF' }} />}
          </button>
          <button onClick={() => setScreen('macro')} style={navItem}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={navColor('macro')} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 16.5 9.5 10.5l3.5 3.5 7.5-7.5" /><path d="M18 6h3.5v3.5" /></svg>
            <span style={monoLbl(8.5, '.14em', navColor('macro'))}>MACRO</span>
            {screen === 'macro' && <span style={{ position: 'absolute', bottom: -1, width: 16, height: 1, background: '#0047FF' }} />}
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => openSheet('daily', 'EXPENSE', 'FOOD')} style={{ width: 50, height: 50, borderRadius: 3, background: '#141413', border: 'none', transform: 'translateY(-14px)', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 8px 20px rgba(20,20,19,.18)' }}><span style={{ color: '#FAF9F5', fontFamily: FT, fontWeight: 400, fontSize: 26, lineHeight: 1 }}>+</span></button>
          </div>
          <button onClick={() => setScreen('week')} style={navItem}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={navColor('week')} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 20.5h17" /><path d="M7 20.5V12" /><path d="M12 20.5V6.5" /><path d="M17 20.5V14.5" /></svg>
            <span style={monoLbl(8.5, '.14em', navColor('week'))}>WEEK</span>
            {screen === 'week' && <span style={{ position: 'absolute', bottom: -1, width: 16, height: 1, background: '#0047FF' }} />}
          </button>
          <button onClick={() => setScreen('settings')} style={navItem}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={navColor('settings')} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h9" /><path d="M17 8h3" /><path d="M4 16h3" /><path d="M11 16h9" /><circle cx="15" cy="8" r="2" /><circle cx="7" cy="16" r="2" /></svg>
            <span style={monoLbl(8.5, '.14em', navColor('settings'))}>SETTINGS</span>
            {screen === 'settings' && <span style={{ position: 'absolute', bottom: -1, width: 16, height: 1, background: '#0047FF' }} />}
          </button>
        </div>

        {/* ADD SHEET */}
        {sheet.open && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div onClick={closeSheet} style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,19,.32)', animation: sheet.closing ? 'fadeOut .25s ease-out forwards' : 'fadeIn .2s ease-out' }} />
            <div style={{ position: 'relative', background: '#FAF9F5', borderTop: '1px solid #E5E3DC', borderRadius: '16px 16px 0 0', padding: '14px 20px 22px', animation: sheet.closing ? 'sheetDown .25s cubic-bezier(.4,0,1,1) forwards' : 'sheetUp .3s cubic-bezier(.16,1,.3,1)' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E5E3DC', margin: '0 auto 14px' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontFamily: FT, fontWeight: 500, fontSize: 17, letterSpacing: '-.01em' }}>{sheet.kind === 'daily' ? 'Log expense' : isInc ? 'Add income' : 'Add expense'}</span>
                <button onClick={closeSheet} style={{ background: 'none', border: 'none', cursor: 'pointer', ...monoLbl(14, '0', '#6B6B66') }}>✕</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, padding: '6px 0 16px' }}>
                <span style={{ fontFamily: FT, fontWeight: 500, fontSize: 19, color: '#A6A29A' }}>¥</span>
                <span style={{ fontFamily: FT, fontWeight: 500, fontSize: 46, letterSpacing: '-.02em', color: isInc ? '#4A7A3C' : '#141413' }}>{sheet.amount || '0'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {sheetCatList.map((c) => {
                  const on = sheet.category === c;
                  return (
                    <button key={c} onClick={() => setSheet((s) => ({ ...s, category: c }))} style={{ flex: 1, height: 34, borderRadius: 2, border: `1px solid ${on ? '#0047FF' : '#E5E3DC'}`, background: on ? 'rgba(0,71,255,0.06)' : '#FAF9F5', ...monoLbl(9, '.08em', on ? '#0047FF' : '#6B6B66'), cursor: 'pointer' }}>{c}</button>
                  );
                })}
              </div>
              <input value={sheet.note} onChange={(e) => setSheet((s) => ({ ...s, note: e.target.value }))} placeholder="Add a note…" style={{ width: '100%', height: 40, padding: '0 13px', border: '1px solid #E5E3DC', borderRadius: 2, background: '#FAF9F5', fontFamily: FI, fontSize: 14, color: '#141413', marginBottom: 14 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => (
                  <button key={k} onClick={() => press(k)} style={{ height: 46, borderRadius: 2, border: '1px solid #E5E3DC', background: '#FAF9F5', fontFamily: FT, fontWeight: 500, fontSize: 20, color: '#141413', cursor: 'pointer' }}>{k}</button>
                ))}
              </div>
              <button onClick={confirmSheet} style={{ width: '100%', height: 48, borderRadius: 2, background: validAmt ? (isInc ? '#4A7A3C' : '#141413') : '#CFCCC3', border: `1px solid ${validAmt ? (isInc ? '#4A7A3C' : '#141413') : '#CFCCC3'}`, color: '#FAF9F5', fontFamily: FT, fontWeight: 500, fontSize: 16, letterSpacing: '.01em', cursor: validAmt ? 'pointer' : 'not-allowed' }}>{sheet.kind === 'daily' ? 'Add expense' : isInc ? 'Add income' : 'Add expense'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
