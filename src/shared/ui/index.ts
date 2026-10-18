/**
 * The app's shared building blocks. Pages compose these instead of repeating markup;
 * their look comes from the tokens and patterns in src/index.css.
 * Files inside src/shared/ui import each other directly, never through this file.
 */

/* ---------- Helpers ---------- */
export { cvar } from './lib/cvar'
export { empty } from './lib/empty'
export { fail } from './lib/fail'
export { cleanLines, linesToItems } from './lib/lines'
export { moveTo } from './lib/move-to'
export { useDebounced, useDebouncedValue } from './lib/use-debounced'
export { useDoneLastOnOpen } from './lib/use-done-last-on-open'
export { useSheet } from './lib/use-sheet'

/* ---------- Page ---------- */
export { TopicColors } from './topic-colors'
export { Header } from './header'
export { Section } from './section'
export { Tabs } from './tabs'
export { MoreText } from './more-text'
export { LinkButton } from './link-button'
export { BarBack, BarMenu, BarProvider, useBar, usePageBar, type BarAction, type PageBar } from './page-bar'

/* ---------- Surfaces ---------- */
export { List } from './list'
export { Row, SortList } from './row'
export { Panel } from './panel'
export { Fold } from './fold'
export { Entry } from './entry'
export { Banner } from './banner'
export { Stats } from './stats'
export { Facts } from './facts'
export { InnerLink } from './inner-link'
export { LinkCard } from './link-card'
export { SettingRow } from './setting-row'

/* ---------- Chips and badges ---------- */
export { Dot } from './dot'
export { Chip, ChipLink, Chips, ChipsList } from './chip'
export { Badge, IconBadge } from './badge'

/* ---------- Progress and ticks ---------- */
export { Check } from './check'
export { DoneButton } from './done-button'
export { Dial } from './dial'
export { Meter } from './meter'
export { Progress } from './progress'
export { Stepper } from './stepper'
export { CountRow, type CountUnit } from './count-row'

/* ---------- Inputs and buttons ---------- */
export { SearchField } from './search-field'
export { SettingSelect } from './setting-select'
export { Segmented } from './segmented'
export { CopyButton } from './copy-button'
export { PlusButton } from './plus-button'
export { AddButton } from './add-button'

/* ---------- Forms ---------- */
export { FormSheet, type SheetRemove } from './form/form-sheet'
export { ConfirmSheet } from './form/confirm-sheet'
export { RemoveButton } from './form/remove-button'
export { AreaField, Field, SelectField, SwitchField, TextField } from './form/fields'
export { LinesField } from './form/lines-field'
export { TopicField, TopicSelect } from './form/topic-field'
export { ColorField } from './form/color-field'
export { WeekdaysField } from './form/weekdays-field'
