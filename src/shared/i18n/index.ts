/**
 * The app's languages: English and Ukrainian. Every user-facing string comes from `t` (t.today.title,
 * t.common.days(3)). What users type is never translated. The choice is per device (Settings → Language:
 * Auto, English or Ukrainian, where Auto falls back to English), and changing it reloads the app, so strings
 * built when a module loads are in the new language too. Dictionaries: ./en (the shape) and ./uk (typed
 * against it), one file per area.
 */
import { en, type Dict } from '@/shared/i18n/en'
import { uk } from '@/shared/i18n/uk'
import { LANG_KEY, lang, type Lang, type LangPref } from '@/shared/i18n/lang'

export { lang, currentLocale, getLangPref, type Lang, type LangPref } from '@/shared/i18n/lang'
export { plural } from '@/shared/i18n/plural'

const DICTS: Record<Lang, Dict> = { en, uk }
export const t: Dict = DICTS[lang]
if (typeof document !== 'undefined') document.documentElement.lang = lang

export function setLangPref(p: LangPref) {
  try {
    if (p === 'auto') localStorage.removeItem(LANG_KEY)
    else localStorage.setItem(LANG_KEY, p)
  } catch {
    // Storage blocked: the choice lasts until the reload below.
  }
  location.reload()
}
