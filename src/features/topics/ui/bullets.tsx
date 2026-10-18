import { Linkify } from './linkify'

export function Bullets({ items }: { items: string[] }) {
  return <ul className="bullets">{items.map((t, i) => <li key={i}><Linkify text={t} /></li>)}</ul>
}
