export function rmbToIdr(rmb: number, rate: number): number {
  return Math.round(rmb * rate);
}

export function formatRMB(rmb: number): string {
  return Math.round(rmb).toLocaleString('en-US');
}

export function formatIDR(idr: number): string {
  return `Rp ${Math.round(idr).toLocaleString('en-US')}`;
}

export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  const p = (part / whole) * 100;
  if (p < 0) return 0;
  if (p > 100) return 100;
  return p;
}
