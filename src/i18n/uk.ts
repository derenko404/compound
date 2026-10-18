// Ukrainian strings: the same shape as ./en.ts, one file per area in ./uk.
import type { Dict } from './en'
import { common } from './uk/common'
import { nav } from './uk/nav'
import { today } from './uk/today'
import { topics } from './uk/topics'
import { lists } from './uk/lists'
import { notebook } from './uk/notebook'
import { wellbeing } from './uk/wellbeing'
import { settings } from './uk/settings'
import { timer } from './uk/timer'

export const uk: Dict = { common, nav, today, topics, lists, notebook, wellbeing, settings, timer }
