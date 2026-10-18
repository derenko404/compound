// English strings, one file per area in ./en. The Ukrainian files in ./uk have the same shape (typed against this).
import { common } from './en/common'
import { nav } from './en/nav'
import { today } from './en/today'
import { topics } from './en/topics'
import { lists } from './en/lists'
import { notebook } from './en/notebook'
import { wellbeing } from './en/wellbeing'
import { settings } from './en/settings'
import { timer } from './en/timer'

export const en = { common, nav, today, topics, lists, notebook, wellbeing, settings, timer }
export type Dict = typeof en
