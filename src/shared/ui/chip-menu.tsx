import type { ComponentType } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { TopicId } from '@core/domain/types'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './primitives/dropdown-menu'
import { cvar } from './lib/cvar'
import { Dot } from './dot'

export interface ChipMenuOption<T extends string> { value: T; label: string; ch?: TopicId }
export interface ChipMenuGroup<T extends string> { label?: string; options: ChipMenuOption<T>[] }

/**
 * A chip showing the current choice; a tap opens a menu of the others, as iOS pop-up buttons do.
 * For quick pickers in forms (when, topic), where a full select field would be too heavy. label names the choice
 * for screen readers. A choice with ch shows its topic dot, on the chip and in the menu.
 */
export function ChipMenu<T extends string>({ label, value, onChange, groups, icon: Icon }: {
  label: string; value: T; onChange: (v: T) => void; groups: ChipMenuGroup<T>[]
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}) {
  const picked = groups.flatMap((g) => g.options).find((o) => o.value === value)
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="chbtn chip-menu-trigger" aria-label={`${label}: ${picked?.label ?? ''}`} style={picked?.ch ? cvar(picked.ch) : undefined}>
        {picked?.ch ? <Dot /> : Icon && <Icon className="chip-icon" aria-hidden />}
        {picked?.label}
        <ChevronDown className="chip-icon chip-menu-chevron" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="chip-menu">
        {groups.map((g, i) => (
          <div key={g.label ?? i} role="group">
            {i > 0 && <DropdownMenuSeparator />}
            {g.label && <DropdownMenuLabel>{g.label}</DropdownMenuLabel>}
            {g.options.map((o) => (
              <DropdownMenuItem key={o.value} onSelect={() => onChange(o.value)}>
                {o.ch && <Dot ch={o.ch} />}
                <span className="flex-1">{o.label}</span>
                {o.value === value && <Check className="chip-menu-check" aria-hidden />}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
