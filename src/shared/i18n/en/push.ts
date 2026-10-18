// push: the reminder notifications. The service worker reads these directly (no imports here, it has no localStorage).
export const push = {
  morningTitle: 'Good morning ☀️',
  morning: (list: string) => `Today: ${list}. Start with the easiest one.`,
  eveningTitle: (done: number, total: number) => (done ? `${done} of ${total} done. Nice!` : 'Your day is still open'),
  evening: (list: string) => `Left: ${list}. Every tick counts.`,
  lastTitle: 'Last call for today 🌙',
  last: (list: string) => `${list}. A few minutes and the day is done.`,
  more: (n: number) => `+${n} more`,
}
