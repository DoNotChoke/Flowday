export function percentDone(status: string, done: number, total: number) {
  if (total > 0) return Math.round((done / total) * 100);
  return status === "completed" ? 100 : 0;
}
