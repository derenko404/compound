/**
 * A habit's value today as a pill on its My day row ("0/10 pages", "1/3"): a button that opens the log sheet, so
 * changing the amount starts from the number itself. A tap on it never ticks the row.
 */
export function HabitValue({ value, label, onOpen }: { value: string; label: string; onOpen: () => void }) {
  return <button type="button" className="value-pill" aria-label={label} onClick={onOpen}>{value}</button>
}
