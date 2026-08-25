export const money = (satang: number) => new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format(satang / 100);

export const thaiDate = (value: string | Date, withTime = false) => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  ...(withTime ? { timeStyle: 'short' as const } : {}),
  timeZone: 'Asia/Bangkok',
}).format(new Date(value));

