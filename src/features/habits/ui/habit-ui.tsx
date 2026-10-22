/**
 * The look of each habit type (its skin): icon, name, one-line pitch and colour token.
 * Shared by the habit rows on My day and Wellbeing, and the log sheet.
 */
import { Ban, BookOpen, CigaretteOff, Dumbbell, Flower2, GlassWater, Moon, Sprout, type LucideIcon } from 'lucide-react'
import type { HabitType } from '@core/domain/types'
import { t } from '@/shared/i18n'

const T = t.wellbeing.types

export const HABIT_UI: Record<HabitType, { icon: LucideIcon; label: string; pitch: string; color: string }> = {
  gym: { icon: Dumbbell, ...T.gym, color: '--habit-gym' },
  water: { icon: GlassWater, ...T.water, color: '--habit-water' },
  sleep: { icon: Moon, ...T.sleep, color: '--habit-sleep' },
  meditation: { icon: Flower2, ...T.meditation, color: '--habit-meditation' },
  reading: { icon: BookOpen, ...T.reading, color: '--habit-reading' },
  smoking: { icon: CigaretteOff, ...T.smoking, color: '--habit-smoking' },
  build: { icon: Sprout, ...T.build, color: '--habit-build' },
  break: { icon: Ban, ...T.break, color: '--habit-break' },
}

export const HABIT_ORDER: HabitType[] = ['gym', 'water', 'sleep', 'meditation', 'reading', 'smoking', 'build', 'break']
