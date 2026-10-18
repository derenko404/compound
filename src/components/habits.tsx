// The look of each habit type (its skin): icon, name, one-line pitch and colour token.
// Shared by Today's habit rows and the Wellbeing widgets.
import { Ban, CigaretteOff, Dumbbell, GlassWater, Sprout, type LucideIcon } from 'lucide-react'
import type { HabitType } from '@/lib/types'
import { t } from '@/i18n'

const T = t.wellbeing.types

export const HABIT_UI: Record<HabitType, { icon: LucideIcon; label: string; pitch: string; color: string }> = {
  gym: { icon: Dumbbell, ...T.gym, color: '--habit-gym' },
  water: { icon: GlassWater, ...T.water, color: '--habit-water' },
  smoking: { icon: CigaretteOff, ...T.smoking, color: '--habit-smoking' },
  build: { icon: Sprout, ...T.build, color: '--habit-build' },
  break: { icon: Ban, ...T.break, color: '--habit-break' },
}

export const HABIT_ORDER: HabitType[] = ['gym', 'water', 'smoking', 'build', 'break']
