// A row of tabs that sticks under the app header while the page scrolls; scrolls sideways on phones.
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; count?: string | number }[] }) {
  return (
    <div className="seg-tabs" role="tablist">
      {items.map((it) => (
        <button key={it.id} type="button" role="tab" aria-selected={value === it.id} className="seg-tab" onClick={() => onChange(it.id)}>
          {it.label}{it.count != null && <span className="count">{it.count}</span>}
        </button>
      ))}
    </div>
  )
}
