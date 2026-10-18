import { useState } from 'react'
import { getTheme, setTheme, type Theme } from '@/shared/fx/theme'
import { SettingRow, SettingSelect } from '@/shared/ui'
import { t, getLangPref, setLangPref, type LangPref } from '@/shared/i18n'

// Theme and language.
export function AppearanceRows() {
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [langPref, setLang] = useState<LangPref>(getLangPref)
  return (
    <>
      <SettingRow title={t.settings.appearance.theme}>
        <SettingSelect label={t.settings.appearance.theme} value={theme} onChange={(v) => { setThemeState(v); setTheme(v) }}
          options={[{ value: 'system', label: t.settings.appearance.system }, { value: 'light', label: t.settings.appearance.light }, { value: 'dark', label: t.settings.appearance.dark }]} />
      </SettingRow>
      <SettingRow title={t.settings.appearance.language} sub={t.settings.appearance.languageSub}>
        <SettingSelect<LangPref> label={t.settings.appearance.language} value={langPref} onChange={(v) => { setLang(v); setLangPref(v) }}
          options={[{ value: 'auto', label: t.settings.appearance.auto }, { value: 'en', label: t.settings.appearance.english }, { value: 'uk', label: t.settings.appearance.ukrainian }]} />
      </SettingRow>
    </>
  )
}
