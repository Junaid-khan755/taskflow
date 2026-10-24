// <input type="date"> works with "YYYY-MM-DD" in the user's local time,
// while the API stores full ISO timestamps. These convert between the two.

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Noon local time, so the date doesn't shift a day in any time zone
export const fromDateInput = (value: string) =>
  value ? new Date(`${value}T12:00:00`).toISOString() : null;

export function formatDue(iso: string) {
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { label, overdue: due < today };
}
