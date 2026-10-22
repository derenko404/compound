# My day: lighter rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** My day becomes a light list. Rows are one line (two with a description), a tap marks a row done, each habit's
check doubles as its progress ring, and a value badge opens a log sheet.

**Architecture:** The lighter look is a `dense` variant of the shared `List` (CSS only), so other pages keep today's rows.
`habitRows` (features/habits) returns a name-only title, a short sub, a badge text and a progress fraction. A new
`HabitBadge` and `HabitLogSheet` in `src/features/habits/ui` hold every logging control, reusing `skinOf` and the
existing log components. `TodayPage` wires them together.

**Tech Stack:** React 19, TypeScript 6, Tailwind v4 tokens in `src/app/styles/index.css`, Radix dialog (`@/shared/ui/primitives/dialog`).

**Spec:** `docs/superpowers/specs/2026-10-22-wellbeing-cards-design.md` (phase 1 of its "Order" section: My day only).

## Global Constraints

- Tokens only: no raw `px`, hex, `text-[..]`, half steps or Tailwind default sizes. Add a token at the top of `index.css` when none fits.
- Every user-facing string comes from `t` (en in `src/shared/i18n/en/wellbeing.ts`, uk mirrored in `uk/wellbeing.ts`). Sentence case, no semicolons, ʼ for the apostrophe in Ukrainian.
- `:hover` only inside the `@media (hover: hover)` block at the end of `index.css`.
- Respect reduce motion: `:root[data-reduce-motion]` in CSS, `motion.reduced()` in scripts.
- Comments: one line `//`, multi-line `/** */` (`scripts/lint/comments.mjs`).
- Imports flow down (`scripts/lint/layers.mjs`): TodayPage imports only `@/features/habits` and `@/shared/ui` barrels.
- Topics, Lists and Settings rows must look exactly as before (only `List dense` changes).
- Don't update CLAUDE.md until the user says the feature is ready.
- No test suite. Each task is verified with `npm run build` (runs `tsc -b`) and `npm run lint`. The user tests the UI themselves: no headless Chrome.

## Review Focus

- A tap on the badge must not also tick the row. `Row`'s tap skips `button, a, input`, so the badge must be a `<button>`.
- Reading at 3/10: the ring shows a partial arc, and a row tap fills to 10 (not 0). Tapping a done row clears it.
- A smoking or break slip: the row is unticked and the sub says "Slip logged". A tap turns it into a clean day.
- Long titles and descriptions (task details of 200 characters, a long Ukrainian habit name) stay on one line each with "…" and never push the badge off the row.
- Gym on a catch-up day: the title is the habit's name, the sub says which day to catch up, and the badge shows the week (`1/3`).

---

### Task 1: Habit rows carry badge and progress

**Files:**
- Modify: `src/features/habits/model/habits.ts:104-145` (`HabitRow`, `habitRows`)
- Modify: `src/features/today/model/derive.ts:134-180` (`DayItem`, push in `todayItems`)
- Modify: `src/shared/i18n/en/wellbeing.ts`, `src/shared/i18n/uk/wellbeing.ts`

**Interfaces:**
- Produces: `interface HabitRow { habit: Habit; title: string; sub: string; done: boolean; badge: string; progress: number }`. `progress` is 0..1.
- Produces: `DayItem` gains `badge?: string` and `progress?: number`, copied from the habit row.

- [ ] **Step 1: Change `habitRows` to the spec's row content**

Per type:

| type | title | sub | badge | progress |
|---|---|---|---|---|
| gym | `h.name` | catch-up: `W.gym.rowMissedShort(day)`, else `''` | `W.badge.week(week, perWeek)` | `done ? 1 : 0` |
| water, sleep, meditation, reading | `h.name` | `''` | `W.badge.amount(amountText(n), amountText(target), unit)` | `min(1, n / target)` |
| smoking | `h.name` | slip: `W.slip.logged`, else `''` | `W.badge.clean(clean)` from `smokingStats(...).clean` | `done ? 1 : 0` |
| break | `h.name` | slip: `W.slip.logged`, else `''` | `W.badge.clean(clean)` from `cleanStats(...).clean` | `done ? 1 : 0` |
| build | `h.name` | `''` | complete: `W.badge.built`, else `W.badge.chain(min(day, target), target)` | `done ? 1 : 0` |

Craving tips and `h.why` leave the rows (they go to the sheet in Task 3).

- [ ] **Step 2: Strings**

Add to `en/wellbeing.ts` (and the same keys in uk):
```ts
badge: {
  amount: (n: string, target: string, unit: string) => `${n}/${target} ${unit}`,
  week: (n: number, of: number) => `${n}/${of} this week`,   // uk: `${n}/${of} цього тижня`
  clean: (n: number) => `${n} d`,                            // uk: `${n} дн.`
  chain: (n: number, of: number) => `${n}/${of}`,
  built: 'Built',                                            // uk: 'Готово'
},
gym: { …, rowMissedShort: (day: string) => `Catch up on ${day}` },  // uk: `Надолужте ${day}`
```
Delete keys no longer used anywhere: `amountRow`, `amountToGo`, `water.reached`, `gym.rowCatchUp`, `gym.rowMissed`, `gym.rowWeek`, `clean.rowTitle`, `build.rowDay`, `build.rowBuilt`. Check each with `grep -rn` first, and keep any that still has a use.

- [ ] **Step 3: Copy `badge` and `progress` into `DayItem`** in `todayItems`'s habit loop.

- [ ] **Step 4: Check the rows in Node**

Bundle a scratch script with esbuild (CLAUDE.md "Commands": fake `localStorage`, state from `emptyState()`). Give it a reading habit at 3/10, gym due today with nothing logged, and smoking with today = `SLIP`. Assert:
- reading: `title === 'Reading'`, `badge === '3/10 pages'`, `progress === 0.3`, `done === false`
- gym: `title === h.name`, `badge` matches `/^0\/\d this week$/`
- smoking: `sub === 'Slip logged. Keep going tomorrow.'`, `done === false`

Run: `node <scratchpad>/rows.mjs`. Expected: no assertion errors.

- [ ] **Step 5: Build and lint**

Run: `npm run build && npm run lint`. Expected: both pass.

- [ ] **Step 6: Commit** `feat(today): habit rows with badge and progress`

---

### Task 2: Dense list and the ring check

**Files:**
- Modify: `src/shared/ui/list.tsx` (`dense` prop)
- Modify: `src/shared/ui/check.tsx` (`progress` prop)
- Modify: `src/app/styles/index.css` (tokens, `.list.dense …`, `.check-ring`)

**Interfaces:**
- Produces: `List({ …, dense?: boolean })` renders `className="list dense"` when set.
- Produces: `Check({ on, label, onToggle, progress?: number })`. When `0 < progress < 1` and `!on`, it draws an arc of that fraction in `--c` over its border.

- [ ] **Step 1: `List dense`**: adds the class only. No other markup changes.

- [ ] **Step 2: CSS for `.list.dense`** (scoped there, so other lists don't change):
  - `.row`: `align-items: center`, vertical padding `--space-2` (horizontal stays `--space-4`), `gap: var(--space-3)`.
  - `.row-title` and `.row-sub`: one line each, `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. `.row-sub` loses its `margin-top`.
  - `.row-tag`: `padding-top: 0`. Keep the tag on the title line on phones too (as `.tag-inline` does).
  - Height follows content: no fixed height.
  - Also `.list-group .list-label` inside dense: no change.

- [ ] **Step 3: Check's progress ring**

Inside the button, add before the tick path: `<svg className="check-ring" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" pathLength={1} style={{ strokeDasharray: `${p} 1` }} /></svg>`, rendered only for a partial `progress`. CSS: absolutely placed over the 2px border, `stroke: var(--c)`, the border's width, round caps, rotated −90° so it starts at 12 o'clock, `fill: none`, `transition: stroke-dasharray var(--dur-base)` (none under `:root[data-reduce-motion]`). `.check` gets `position: relative`. The 28px size is a raw value already in `.check`: move it into a `--check-size` token and use it for both.

- [ ] **Step 4: Build and lint**: `npm run build && npm run lint`. Expected: both pass.

- [ ] **Step 5: Commit** `feat(ui): dense list and progress ring on Check`

---

### Task 3: Habit badge and log sheet

**Files:**
- Create: `src/features/habits/ui/habit-badge.tsx`
- Create: `src/features/habits/ui/habit-log-sheet.tsx`
- Modify: `src/features/habits/ui/amount-controls.tsx` (sleep chips instead of the slider, no `Dial` inside)
- Modify: `src/features/habits/index.ts` (export both)
- Modify: `src/app/styles/index.css` (`.habit-badge`, `.log-sheet`)
- Modify: `src/shared/i18n/{en,uk}/wellbeing.ts`

**Interfaces:**
- Consumes: `skinOf(state, h, today): Skin` (`habit-skin.tsx`), `WaterCount`, `GymWeek`, `SlipButton` (`habit-log.tsx`), `AmountControl`, `CRAVING_TIPS`, `HABIT_UI`, `IconBadge`, `tone`.
- Produces: `HabitBadge({ text: string; label: string; onOpen: () => void })`, a `<button type="button" className="habit-badge">` with `aria-label={label}`.
- Produces: `HabitLogSheet({ habit: Habit; open: boolean; onOpenChange: (o: boolean) => void })`.

- [ ] **Step 1: `HabitBadge`**: a pill, min height `--control-sm`, `--radius` fully round, `1px solid var(--border)`, text `--text-caption` in `--muted-foreground`, with the number part in `var(--c)` bold. Split on the first `/` or space: the leading number gets `<b>`. `flex: none`, `white-space: nowrap`. The hover tint goes in the `@media (hover: hover)` block.

- [ ] **Step 2: Amount controls**
  - Sleep: remove `SleepBar`'s range input and night bar. Its control becomes chips 6 · 7 · 8 · 9 h (as now) plus `MoreLess` (− / + by `AMOUNTS.sleep.step`). Remove the `sleepSlider` string and the now-unused `.night*` CSS.
  - Meditation and reading: drop the `Dial` from `MeditationRing` and `ReadingAdds` (the sheet header shows the number). Rename them to `MeditationAdds` / `ReadingAdds` and update the top comment. Reading gets `more` back (+ as well as −).
  - Wellbeing's cards use `AmountControl` too, so they change the same way. The spec accepts this.

- [ ] **Step 3: `HabitLogSheet`**

Built on `Dialog` / `DialogContent` with `className="log-sheet"`. It's the same `.sheet` shell as other dialogs: bottom sheet on phones, centred on wider screens. No form, no Save. `DialogTitle` shows the habit's name, with `IconBadge` (from `HABIT_UI[h.type]`) before it. The header's right side shows `skin.value`. The wrapper sets `style={tone(HABIT_UI[h.type].color)}` so `--c` is the habit's colour. Body, top to bottom:
  1. Today's control: water `WaterCount`; sleep, meditation and reading `AmountControl`; gym `GymWeek`; smoking and break `SlipButton`; build: nothing.
  2. `skin.line` when present (smoking's savings line, build's chain).
  3. A tip: smoking `CRAVING_TIPS[dayDiff(start_date, today) % length]`, the same pick `habitRows` used before.
  4. `skin.details` (week bars, stats, milestones).
  5. `h.why` as `widget-sub` when set.

Changes apply at once through the existing components' `habitLog` dispatches. It closes on outside tap, Escape or the close button, as other sheets do. Add `t.wellbeing.logSheet.close` only if `DialogTitle` needs a label it doesn't already have.

- [ ] **Step 4: Build and lint**: `npm run build && npm run lint`. Expected: both pass.

- [ ] **Step 5: Commit** `feat(habits): value badge and log sheet`

---

### Task 4: Wire My day

**Files:**
- Modify: `src/pages/today/ui/TodayPage.tsx`

**Interfaces:**
- Consumes: `List dense`, `Check progress` (Task 2), `HabitBadge`, `HabitLogSheet` (Task 3), `DayItem.badge` / `progress` (Task 1).

- [ ] **Step 1: The day's list** (not edit mode): `<List dense>`. Edit mode's lists stay as they are.

- [ ] **Step 2: `row()`**
  - Habit rows: `title={<span className="font-normal">{it.title}</span>}`, `sub` from `it.sub`, `check={<Check … progress={it.progress} />}`, `tag={<HabitBadge text={it.badge!} label={…} onOpen={() => logSheet.open(h)} />}`. Remove `WaterCount` and `AmountControl` from the row's children, and drop their imports.
  - The badge's `label` is a new string: `t.wellbeing.logAmount(name)`, en `Log ${name}`, uk `Записати: ${name}`.
  - `toggleHabit` stays: unticked to target or `DONE`, done to `null`. From a partial amount or a slip, `isDone` is false, so a tap fills it, as the spec wants.

- [ ] **Step 3: Group labels, mark first**: the focus group label becomes `<span className="title-row"><FocusMark />{focus.name}</span>`. The light topic's becomes `<FocusMark secondary />{c.name}`.

- [ ] **Step 4: The sheet**: `const logSheet = useSheet<Habit>()`, and at the end `{logSheet.value && <HabitLogSheet key={logSheet.value.id} {...logSheet.props} habit={logSheet.value} />}`.

- [ ] **Step 5: Build and lint**: `npm run build && npm run lint`. Expected: both pass.

- [ ] **Step 6: Commit** `feat(today): light rows on My day`
