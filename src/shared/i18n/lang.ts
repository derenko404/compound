// Which language is on: the choice in Settings → Language (per device), or under Auto the device's language,
// Ukrainian when the device is set to it and English otherwise.
export type Lang = 'en' | 'uk'
export type LangPref = Lang | 'auto'

export const LANG_KEY = 'roadmap-lang'
const LOCALE: Record<Lang, string> = { en: 'en-GB', uk: 'uk-UA' }

export function getLangPref(): LangPref {
  try {
    const v = localStorage.getItem(LANG_KEY)
    return v === 'en' || v === 'uk' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

const resolve = (p: LangPref): Lang =>
  p !== 'auto' ? p : typeof navigator !== 'undefined' && /^uk\b/i.test(navigator.language) ? 'uk' : 'en'

export const lang: Lang = resolve(getLangPref())
// The locale for dates, numbers and plurals.
export const currentLocale = () => LOCALE[lang]
