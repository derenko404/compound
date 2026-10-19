import { cn } from '@/shared/lib/utils'

// The app's logo and name. The name is the brand, never translated.
export const Brand = ({ className }: { className?: string }) => (
  <span className={cn('brand', className)}><span className="brand-mark" aria-hidden="true" />Compound</span>
)
