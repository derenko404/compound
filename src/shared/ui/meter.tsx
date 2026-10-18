// A slim progress bar. size lg: the taller one at the top of a page. Nothing done yet shows a striped track.
export const Meter = ({ value, label, size }: { value: number; label: string; size?: 'lg' }) => (
  <div className={`meter${size === 'lg' ? ' meter-lg' : ''}${value > 0 ? '' : ' is-empty'}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
    <i style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%` }} />
  </div>
)
