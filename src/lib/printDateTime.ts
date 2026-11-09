export function formatPrintDateTime(value: string): { date: string; time: string } {
  const date = new Date(value)
  const options = { timeZone: 'Asia/Manila' } as const
  return {
    date: new Intl.DateTimeFormat('en-PH', { ...options, day: '2-digit', month: 'short', year: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat('en-PH', { ...options, hour: '2-digit', minute: '2-digit', hour12: true }).format(date),
  }
}
