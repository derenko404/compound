# Lighter rows: My day and Wellbeing

Status: agreed in a design conversation on 2026-10-22, with a clickable prototype. Built, with Wellbeing revised (see Wellbeing).

## Why

On a phone, My day and Wellbeing feel cramped and hard to use. Each habit carries its whole control inline: a
ring, chips, −/+, the sleep slider, plus one or two lines of advice. On My day, seven items take about two screens,
the sleep slider ends up under the tab bar, and rows have different heights and shapes, so the page doesn't scan
as a to-do list. Wellbeing's cards each speak their own control language and show the same number twice (reading
0/10 in the header and 0 in the ring).

The user wants it to fit more on a screen and feel more casual, like a to-do app. Their only reference is
Microsoft To Do. For habits, they chose Habitify's model: a tap completes the habit, and a numeric habit shows its
value on the right, which opens a small sheet to log an amount.

## Goals

- My day reads as a list. One short row per item, the same height and shape, more items per screen.
- **A tap on a row marks it done.** This already works for tasks (`Row` with `check`) and now holds for every
  habit too.
- Habits show their value as a pill on the right (`0/10 стор.`). Tapping the pill opens a log sheet with the
  controls, history and advice that today sit inline.
- Wellbeing uses the same rows and the same sheet, so both pages read as one family.
- One number per habit, in one place.

## Non-goals

- No new data: the habit model, `habit_logs`, ops and migrations stay as they are.
- Topics, Library lists and Settings rows (see Order).
- A grid / dashboard of tiles on Wellbeing (Apple Health style) was shown and not chosen. It gives the best
  overview, but every log costs a tap plus a sheet.

## Anti-goals

- A row that has to be read before it can be ticked, or a control too small for a thumb (the sleep slider).
- Two numbers on one habit that can disagree.
- Losing the feedback: ticks keep their sound, burst and `pop`, and finishing the day keeps its confetti.
- Losing a habit's identity: its colour (`HABIT_UI` / `tone`) still marks the row.

## How it behaves

### The row

- Rows take their natural height: a row with a description is taller than one without (the user changed their
  mind on fixed heights). Both lines stay capped: the title is one line, ellipsised, and the optional muted meta
  line under it is one line, ellipsised. So a row is one of two heights, never more. No multi-line text in rows.
- A small check on the left.
- **Tap anywhere on the row** (outside the pill) toggles done, with the existing `Check` sound and burst.
- Amount habits (water, sleep, meditation, reading): a tap logs the full target, and a second tap clears today.
  This matches what `toggleHabit` in `TodayPage` already does for water.
- Gym: a tap logs today's workout. Build: a tap ticks today. Quit smoking and break: a tap marks a clean day.
- Progress is a ring, not a bar (the user: "we can keep the ring"). *My reading:* the row's check circle doubles
  as a small progress ring in the habit's colour. It fills partly as today's amount grows (gym: this week's
  workouts out of days a week) and becomes the filled tick when done, as Habitify does. The big rings inside
  today's cards (`AmountControl`'s `Dial`) go. My day's header ring (done/total) stays.
- Gym's check means **today**: a tap fills it to the tick (done today, `pop`, counts toward My day's done/total).
  The week's progress is in the pill (`1/3`), not in the ring. Only amount habits show a partly filled ring.
  *(My call.)*
- From a partial amount (reading 3/10), a tap fills it to the target, as `toggleHabit` does now. Only a done row
  clears on a tap. From a slip (smoking, break), a tap turns today into a clean day. *(My call.)*
- Habit rows: the title is just the habit's name, and the number lives only in the pill. The meta line appears
  only when it says something the pill doesn't: gym's catch-up ("Надолужте пн") or next day, "starts on…".
  Tips and `why` move to the sheet. The en/uk strings that repeat the number (`amountRow`, "2 to go", "day 5 of
  21") go. *(My call.)*
- No habit icon (`IconBadge`) on rows. The ring's colour marks the habit, and the icon shows in the sheet's header.
  *(My call.)*
- Tasks: the title, plus the details as a one-line meta (cut with an ellipsis). The full details stay in the
  task's edit form. *(My call.)*
- Generated topic rows (next step, review, catch-up…) are unchanged, apart from the lighter row style.

### The value pill and the log sheet

- **Every habit row** has the pill on the right, not only the numeric ones: amounts `0/10 стор.`, gym `0/3`,
  clean-day habits `12 дн.`, build `5/21`. *(My call: one rule is easier than "only numbers have a pill", and
  gym, smoking and build need somewhere for their extras.)*
- The pill is a button at least `--control-sm` tall, so a thumb can hit it without ticking the row.
- The sheet is a bottom sheet on phones and a centred dialog on wider screens (as `FormSheet`). Contents per type:
  - Water: the glasses (`WaterCount`).
  - Reading and meditation: quick adds plus − / + (`AmountControl`); meditation also has ▶ Start (opens the timer,
    as now).
  - Sleep: chips 6 · 7 · 8 · 9 h plus − / + in half hours. **The slider goes.**
  - Gym: the week's seven days (`GymWeek`), so missed days can be caught up there.
  - Quit smoking and break: the slip button, savings, milestones and the advice line ("Тягне закурити?…").
  - Build: the chain.
  - All: the week's bars and the summary (on-target days, average), i.e. today's `skin.details`, and `h.why`.
- Changes in the sheet apply immediately (same `habitLog` ops). There's no Save button. Tap outside or swipe down
  to close it.

### My day

- Same groups as now (Tasks, Habits, focus topic, other topics). Rows only get lighter.
- The focus topic's group label reads **"Фокус · English"**: the focus mark first, then the topic's name (now
  it's the name first, then the mark). The same goes for the light topic ("Другорядна · …").
- **One list** (the user's choice): rows inside `List` / `ListGroup` with hairlines between them, as on every
  other page. Not separate tiles.

### Wellbeing

*Revised on 2026-10-22 after living with it: the same rows on both pages read as two copies of one list.*

- Mood and quote stay on top as they are.
- **My day logs today, Wellbeing looks back.** Each habit is a row with no tick: its type's icon in its colour where the
  tick would be, its name, one sentence on where
  it stands or what to do next, and a small `Dial` on the right with its one ratio, as the Lists page's cards
  (`habitGlance`). Gym: this week's workouts ("Надолужте понеділок", "Тиждень виконано"). Amounts: days on target
  this week ("Цього тижня ще не читали", then the average against the target). Quit smoking: the way to the next
  health milestone, clean days inside ("Без цигарок з 22 жовтня. Далі: 2 тижні"). Break: the current run against
  the best. Build: the chain ("Позначте сьогодні, щоб почати ланцюжок").
- A tap on the row opens the log sheet. Since the row has no tick, the sheet has today's control for every type:
  build, break and quit smoking get a done button there, beside the slip.
- Tried and dropped: labelled facts (a grid of zeros that said nothing), the week as dots or rings under each row
  (busy, and the sentence says more).
- Habit rows use the app's blue on both pages, not their type's colour: on rows only topics have colours. The log
  sheet and the habit form's type picker keep the type's colour.
- Edit mode is unchanged (⊖, ≡ and tap to open `HabitSheet`, the habit's form).

## Constraints

- Design system rules (CLAUDE.md): tokens only, change the shared piece instead of overriding per page, `:hover`
  only inside `@media (hover: hover)`, i18n for every string (en + uk), and reduce-motion respected.
- One shared row look for My day and Wellbeing, and one shared log sheet, living in `src/features/habits` (used
  by both pages).
- Prototype for reference: `.superpowers/brainstorm/24779-1792634515/content/my-day-v2.html` (throwaway, rough
  colours, not tokens).

## Order

1. **My day first** (the user's call). The lighter rows, the ring check, the badge and the log sheet on My day
   only. Topics, Lists and Settings keep today's `Row` look: the lighter look is a variant of the shared row
   (e.g. a `List` / `Row` prop or class), not a change to every row. The log sheet is still built in
   `src/features/habits`, so Wellbeing can reuse it.
2. **Wellbeing next**, as described above, once the user has lived with My day.
3. Other pages only if the user asks after that.

## Left to the builder

- Component names, where the sheet lives, and new token names (pill height, ring stroke).
- Exact chip values per type (the ones above are a starting point).
- How the sheet is built (reuse `FormSheet` / the primitives' sheet or a new `LogSheet`).
- Updating CLAUDE.md's Today and habits sections once the user says the feature is done.
