import type { Project, ProjectStatus } from '@core/domain/types'
import { projectStatus } from '@core/domain/content'
import { useStore } from '@/shared/store/StoreProvider'
import { celebrate } from '@/shared/lib/celebrate'
import { playTick, playUntick } from '@/shared/lib/sound'
import { t } from '@/shared/i18n'

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = t.topics.project.status
// A project's status colour: grey, amber while in progress, green when done.
export const PROJECT_STATUS_TONE: Record<ProjectStatus, string> = { todo: '--muted-foreground', doing: '--warn', done: '--good' }
// The button on a project's page: the next step by hand (Start, and for a project without steps, Done and back).
export const PROJECT_NEXT: Record<ProjectStatus, ProjectStatus> = { todo: 'doing', doing: 'done', done: 'doing' }
export const PROJECT_NEXT_LABEL: Record<ProjectStatus, string> = t.topics.project.next

// A project's status (its steps decide, see projectStatus) and a setter for what you set by hand, with the app's feedback.
export function useProjectStatus(p: Project) {
  const { state, dispatch } = useStore()
  const status = projectStatus(state, p)
  const set = (next: ProjectStatus) => {
    if (next === status) return
    dispatch({ type: 'project', projectId: p.id, status: next })
    if (next === 'done') celebrate()
    else if (next === 'doing') playTick(0.5)
    else playUntick()
  }
  return { status, set }
}
