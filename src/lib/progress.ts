export function percentDone(status: string, done: number, total: number) {
  if (total > 0) return Math.round((done / total) * 100);
  return status === "completed" ? 100 : 0;
}

export function estimateLabel(minutes: number) {
  if (!minutes) return "not set";
  const hours = Math.floor(minutes / 60);
  return [hours && `${hours}h`, minutes % 60 && `${minutes % 60}m`].filter(Boolean).join(" ");
}
