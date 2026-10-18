import type { ReactNode } from 'react'

// A quiet text button for secondary actions: "Show more", "Edit routines".
export const LinkButton = ({ children, onClick, ...rest }: { children: ReactNode; onClick: () => void } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'className'>) => (
  <button type="button" className="link-btn" onClick={onClick} {...rest}>{children}</button>
)
