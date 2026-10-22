/**
 * A habit's value on its My day row ("3/10 pages", "12 d"): a pill that opens the habit's log sheet. A button, so a
 * tap on it never ticks the row. The leading number is in the habit's colour (--c).
 */
export function HabitBadge({ text, label, onOpen }: { text: string; label: string; onOpen: () => void }) {
  const [, num = '', rest = text] = /^([\d.,]+)(.*)$/.exec(text) ?? []
  return (
    <button type="button" className="habit-badge" aria-label={label} onClick={onOpen}>
      {num && <b>{num}</b>}{rest}
    </button>
  )
}
