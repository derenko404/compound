import { useState, type CSSProperties } from 'react'
import { Link, Navigate } from '@tanstack/react-router'
import { BellRing, Check as CheckIcon, Crosshair, Heart, Layers, Pencil, Sparkles, Sun, TrendingUp, type LucideIcon } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { Banner, Check, IconBadge, List, Row, Section } from '@/shared/ui'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'

const tx = t.landing

// Each feature's icon and colour token.
const FEATURES: [keyof typeof tx.features, LucideIcon, string][] = [
  ['today', Sun, '--slot-focus'],
  ['topics', Layers, '--slot-light'],
  ['notebook', Pencil, '--slot-resource'],
  ['wellbeing', Heart, '--slot-review'],
  ['reminders', BellRing, '--slot-project'],
  ['ai', Sparkles, '--slot-catchup'],
]
const HOW: LucideIcon[] = [Crosshair, CheckIcon, TrendingUp]
const PREVIEW_COLORS = ['--p-teal', '--p-pink', '--habit-water', '--p-amber']

// A Today list to play with: the ticks work, nothing is saved.
function Preview() {
  const [done, setDone] = useState<boolean[]>([true, false, false, false])
  return (
    <div className="landing-preview">
      <List>
        {tx.preview.map((title, i) => (
          <Row key={title} done={done[i]} title={title} style={{ '--c': `var(${PREVIEW_COLORS[i]})` } as CSSProperties}
            check={<Check on={done[i]} label={title} onToggle={(on) => setDone((d) => d.map((x, j) => (j === i ? on : x)))} />} />
        ))}
      </List>
      <p className="landing-note">{tx.previewHint}</p>
    </div>
  )
}

const Start = () => <Button asChild><Link to="/today">{tx.start}</Link></Button>

// The public home page. Signed in (or using the app on this device), / goes straight to Today.
export function Landing() {
  const { mode } = useStore()
  if (mode === 'loading') return null
  if (mode !== 'signin') return <Navigate to="/today" />
  return (
    <div className="landing">
      <header className="landing-top">
        <span className="brand"><span className="brand-mark" aria-hidden="true" />Compound</span>
        <Button variant="outline" asChild><Link to="/today">{tx.signIn}</Link></Button>
      </header>

      <section className="landing-hero">
        <div>
          <h1 className="landing-title">{tx.title}</h1>
          <p className="landing-sub">{tx.sub}</p>
          <Start />
          <p className="landing-note">{tx.free}</p>
        </div>
        <Preview />
      </section>

      <Section title={tx.featuresTitle}>
        <div className="feature-grid">
          {FEATURES.map(([key, icon, color]) => (
            <div key={key} className="feature">
              <IconBadge icon={icon} label={tx.features[key].title} color={color} />
              <h3>{tx.features[key].title}</h3>
              <p>{tx.features[key].text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={tx.howTitle}>
        <ol className="howto">
          {tx.how.map((step, i) => {
            const Icon = HOW[i]
            return <li key={step.title}><span className="howto-icon"><Icon aria-hidden="true" /></span><p><b>{step.title}</b>{` ${step.text}`}</p></li>
          })}
        </ol>
      </Section>

      <Banner title={tx.ctaTitle} actions={<Start />}>{tx.free}</Banner>

      <footer className="landing-foot">
        <Link to="/privacy">{tx.privacy}</Link>
        <Link to="/terms">{tx.terms}</Link>
        <span>{`© ${new Date().getFullYear()} Compound`}</span>
      </footer>
    </div>
  )
}
