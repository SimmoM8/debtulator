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

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}
