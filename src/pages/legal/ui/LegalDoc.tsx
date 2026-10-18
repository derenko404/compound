import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { Section } from '@/shared/ui'
import { t } from '@/shared/i18n'

// Where privacy questions and account deletion requests go.
export const CONTACT_EMAIL = 'hello@derenko.online'

type Part = { title: string; paras?: string[]; items?: string[] }

// A public legal page: title, date, a lead and its sections, then the contact.
export function LegalDoc({ title, lead, parts }: { title: string; lead: string; parts: readonly Part[] }) {
  return (
    <article className="legal">
      <Link to="/" className="bar-back"><ChevronLeft aria-hidden="true" />{t.legal.back}</Link>
      <h1 className="day-date">{title}</h1>
      <p className="landing-note">{t.legal.updated}</p>
      <p className="landing-sub">{lead}</p>
      {parts.map((p) => (
        <Section key={p.title} title={p.title}>
          {p.paras?.map((x) => <p key={x}>{x}</p>)}
          {p.items && <ul>{p.items.map((x) => <li key={x}>{x}</li>)}</ul>}
        </Section>
      ))}
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{t.legal.contact(CONTACT_EMAIL)}</a></p>
    </article>
  )
}
