import type { CSSProperties } from 'react'
import type { Topic } from '@core/domain/types'
import { List, MoreText, Section } from '@/shared/ui'
import { Bullets, Linkify, ProjectCard, ResourceGroups, SkillFolds, TaskRows } from '@/features/topics'
import { t } from '@/shared/i18n'

// The shared topic's own colour, since it isn't one of the visitor's topics.
export function TopicPreview({ c }: { c: Topic }) {
  return (
    <div style={{ '--c': `var(--p-${c.color})` } as CSSProperties}>
      {c.description && <div className="mb-6"><div className="lead"><MoreText lines={6}><Linkify text={c.description} /></MoreText></div></div>}
      {c.outcomes.length > 0 && <Section title={t.topics.goals}><Bullets items={c.outcomes} /></Section>}
      {c.skills.length > 0 && <Section title={t.topics.tabs.skills}><SkillFolds skills={c.skills} readOnly /></Section>}
      {c.tasks.length > 0 && <Section title={t.topics.tabs.tasks}><TaskRows tasks={c.tasks} readOnly /></Section>}
      {c.resources.length > 0 && <Section title={t.topics.tabs.resources}><ResourceGroups resources={c.resources} readOnly /></Section>}
      {c.projects.length > 0 && (
        <Section title={t.topics.tabs.projects}>
          <List>{c.projects.map((p) => <ProjectCard key={p.id} p={p} readOnly />)}</List>
        </Section>
      )}
    </div>
  )
}
