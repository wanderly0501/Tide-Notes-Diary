export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const nowISO = () => new Date().toISOString();
export const todayISO = () => new Date().toISOString().split('T')[0];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function formatDateLabel(dateStr: string): { label: string; year: string; isToday: boolean } {
  const date = new Date(dateStr + 'T12:00:00');
  const today = todayISO();
  const isToday = dateStr === today;
  const wd = WEEKDAYS[date.getDay()];
  const mon = MONTHS[date.getMonth()];
  const day = date.getDate();
  const year = String(date.getFullYear());
  return {
    label: isToday ? `Today · ${wd}, ${mon} ${day}` : `${wd}, ${mon} ${day}`,
    year,
    isToday,
  };
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  let h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

export function groupByDate<T extends { date: string }>(items: T[]): { date: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.date.split('T')[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.keys())
    .sort()
    .reverse()
    .map(date => ({ date, items: map.get(date)! }));
}
