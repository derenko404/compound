// The look of each habit type (its skin): icon, name, one-line pitch and colour token.
// Shared by Today's habit rows and the Wellbeing widgets.
import { Ban, CigaretteOff, Dumbbell, GlassWater, Sprout, type LucideIcon } from 'lucide-react'
import type { HabitType } from '@/lib/types'

export const HABIT_UI: Record<HabitType, { icon: LucideIcon; label: string; pitch: string; color: string }> = {
  gym: { icon: Dumbbell, label: 'Gym', pitch: 'Workouts on your days, counted each week.', color: '--habit-gym' },
  water: { icon: GlassWater, label: 'Water', pitch: 'Glasses a day against a target.', color: '--habit-water' },
  smoking: { icon: CigaretteOff, label: 'Quit smoking', pitch: 'Clean days, money saved and health milestones.', color: '--habit-smoking' },
  build: { icon: Sprout, label: 'New habit', pitch: '21 days in a row. A missed day starts again.', color: '--habit-build' },
  break: { icon: Ban, label: 'Break a habit', pitch: 'Clean days since you stopped. Log a slip and keep going.', color: '--habit-break' },
}

export const HABIT_ORDER: HabitType[] = ['gym', 'water', 'smoking', 'build', 'break']
