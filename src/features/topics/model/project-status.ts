import type { Project, ProjectStatus } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { celebrate } from '@/shared/lib/celebrate'
import { playTick, playUntick } from '@/shared/lib/sound'
import { t } from '@/shared/i18n'

export const PROJECT_STATUSES: ProjectStatus[] = ['todo', 'doing', 'done']
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = t.topics.project.status
// A project's status colour: grey, amber while in progress, green when done.
export const PROJECT_STATUS_TONE: Record<ProjectStatus, string> = { todo: '--muted-foreground', doing: '--warn', done: '--good' }

// A project's status and a setter with the app's feedback: a tick to start, confetti to finish.
export function useProjectStatus(p: Project) {
  const { state, dispatch } = useStore()
  const status: ProjectStatus = state.projects[p.id] ?? 'todo'
  const set = (next: ProjectStatus) => {
    if (next === status) return
    dispatch({ type: 'project', projectId: p.id, status: next })
    if (next === 'done') celebrate()
    else if (next === 'doing') playTick(0.5)
    else playUntick()
  }
  return { status, set }
}
