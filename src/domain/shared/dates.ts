const DUE_SOON_WINDOW_DAYS = 7;

export function isDueSoon(dueDate: string | null, referenceDate = new Date()): boolean {
  if (!dueDate) {
    return false;
  }

  const today = referenceDate.toISOString().slice(0, 10);
  const soon = new Date(referenceDate);
  soon.setDate(soon.getDate() + DUE_SOON_WINDOW_DAYS);
  const soonDate = soon.toISOString().slice(0, 10);

  return dueDate >= today && dueDate <= soonDate;
}
