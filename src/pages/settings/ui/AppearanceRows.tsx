import { useState } from 'react'
import { getTheme, setTheme, type Theme } from '@/shared/lib/theme'
import { motion, type MotionPref } from '@/shared/lib/motion'
import { SettingRow, SettingSelect } from '@/shared/ui'
import { t, getLangPref, setLangPref, type LangPref } from '@/shared/i18n'

// Theme, language and motion (all per device).
export function AppearanceRows() {
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [langPref, setLang] = useState<LangPref>(getLangPref)
  const [motionPref, setMotion] = useState<MotionPref>(motion.get)
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
      <SettingRow title={t.settings.appearance.motion} sub={t.settings.appearance.motionSub}>
        <SettingSelect<MotionPref> label={t.settings.appearance.motion} value={motionPref} onChange={(v) => { setMotion(v); motion.set(v) }}
          options={[{ value: 'auto', label: t.settings.appearance.auto }, { value: 'on', label: t.settings.appearance.on }, { value: 'off', label: t.settings.appearance.off }]} />
      </SettingRow>
    </>
  )
}
