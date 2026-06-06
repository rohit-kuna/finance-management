const expenseDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function toExpenseDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseExpenseDate(value: string, timeSource = new Date()) {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(timeSource);

  parsed.setFullYear(year, month - 1, day);
  parsed.setHours(timeSource.getHours(), timeSource.getMinutes(), timeSource.getSeconds(), timeSource.getMilliseconds());

  return parsed;
}

export function formatExpenseDate(value: string) {
  return expenseDateFormatter.format(new Date(value));
}
