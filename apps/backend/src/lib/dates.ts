const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getWeekRange(year: number, week: number) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4.getTime() - (day - 1) * MS_PER_DAY + (week - 1) * 7 * MS_PER_DAY);
  const sunday = new Date(monday.getTime() + 6 * MS_PER_DAY);
  return { startAt: monday, endAt: sunday };
}

export function getIsoWeek(date: Date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
}
