import { parseDateOnly, startOfDay } from "@/src/lib/dates";

const DEFAULT_DUE_SOON_DAYS = 7;

export function isDueSoon(
  dueDate: string | null,
  today: Date = new Date(),
  withinDays: number = DEFAULT_DUE_SOON_DAYS,
): boolean {
  if (!dueDate) {
    return false;
  }

  const due = parseDateOnly(dueDate);

  if (!due) {
    return false;
  }

  const start = startOfDay(today);
  const end = new Date(start);

  end.setDate(end.getDate() + withinDays);

  return due >= start && due <= end;
}
