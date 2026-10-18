// English strings, one file per area in ./en. The Ukrainian files in ./uk have the same shape (typed against this).
import { common } from '@/shared/i18n/en/common'
import { nav } from '@/shared/i18n/en/nav'
import { today } from '@/shared/i18n/en/today'
import { topics } from '@/shared/i18n/en/topics'
import { lists } from '@/shared/i18n/en/lists'
import { notebook } from '@/shared/i18n/en/notebook'
import { wellbeing } from '@/shared/i18n/en/wellbeing'
import { settings } from '@/shared/i18n/en/settings'
import { timer } from '@/shared/i18n/en/timer'
import { search } from '@/shared/i18n/en/search'
import { onboarding } from '@/shared/i18n/en/onboarding'

export const en = { common, nav, today, topics, lists, notebook, wellbeing, settings, timer, search, onboarding }
export type Dict = typeof en
