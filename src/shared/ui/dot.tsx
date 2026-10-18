import type { TopicId } from '@core/domain/types'
import { cvar } from './lib/cvar'

// A topic's colour dot. Without ch it uses the surrounding --c.
export const Dot = ({ ch }: { ch?: TopicId | null }) => <span className="dot" style={ch ? cvar(ch) : undefined} aria-hidden="true" />
