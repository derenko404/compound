import type { ReactNode } from 'react'

// One setting in a Panel: title and explanation on the left, its control on the right. Rows are divided by lines.
export const SettingRow = ({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) => (
  <div className="setting-row">
    <div className="setting-text"><div className="font-bold">{title}</div>{sub && <div className="text-small text-muted-foreground">{sub}</div>}</div>
    {children}
  </div>
)
