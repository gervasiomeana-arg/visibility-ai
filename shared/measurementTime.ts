export function measurementTime(value: string, timeZone = 'America/Argentina/Buenos_Aires'): string {
  if (!Number.isFinite(Date.parse(value))) return 'Sin fecha registrada';
  try {
    return new Intl.DateTimeFormat('es-AR', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)) + ` (${timeZone})`;
  } catch {
    return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)) + ' (UTC)';
  }
}
