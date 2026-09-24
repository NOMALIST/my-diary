// 날짜 유틸 (로컬 시간 기준, 날짜 키 YYYY-MM-DD / 월 키 YYYY-MM)

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function addDays(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

// ---- 주 ----

// 해당 날짜가 속한 주의 월요일
export function weekStartOf(key: string): string {
  const d = fromDateKey(key);
  const diff = (d.getDay() + 6) % 7; // 월=0 … 일=6
  d.setDate(d.getDate() - diff);
  return toDateKey(d);
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

// ---- 월 ----

export function monthKeyOf(key: string): string {
  return key.slice(0, 7);
}

export function addMonths(monthKey: string, months: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  return toDateKey(new Date(y, m - 1 + months, 1)).slice(0, 7);
}

export function monthDays(monthKey: string): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, "0")}`);
}

// ---- 표시용 ----

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDateLabel(key: string): string {
  const d = fromDateKey(key);
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAY_LABELS[d.getDay()]})`;
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${y}년 ${m}월`;
}
