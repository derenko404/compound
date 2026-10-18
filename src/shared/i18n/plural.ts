// Picks the plural form of n for the current language: English one/other, Ukrainian one/few/many
// (1 день, 2 дні, 5 днів). "#" in a form becomes n. A missing form falls back to other.
import { currentLocale } from '@/shared/i18n/lang'

let rules: Intl.PluralRules | null = null
export function plural(n: number, forms: { one: string; few?: string; many?: string; other: string }) {
  rules ??= new Intl.PluralRules(currentLocale())
  const k = rules.select(n) as keyof typeof forms
  return (forms[k] ?? forms.other).replace('#', String(n))
}
