---
name: plan-creator
description: Add or change roadmap content in this app - a video, course, book or link as a resource, a daily routine item, a plan task, a project, a checklist line or a list item. Use when the user says "add this to <chapter/daily/plan>", pastes a URL to put somewhere in the roadmap, or asks to change what a daily item or task says.
---

# Plan creator

Content lives in `src/data/` as code. Edit the data, build, report. No DB migration is needed for content changes.

## 1. Work out what the user means

- "Add X to daily <chapter>" usually means **put X inside an existing daily item** (as the source to use, or as an "or" option), not a new item. If an item already covers that slot (for example `eng-shadow` = pronunciation practice), extend its `sub`. Ask only if no existing item fits.
- A URL with no target → add it as a resource in the best-matching group in `GUIDES[<chapter>].groups`.
- Match the user's wording to chapters in `CH` (`src/data/plan.ts`): `eng` = English, etc.

## 2. Get facts for links

- YouTube title and author: `curl -s "https://www.youtube.com/oembed?url=<url>&format=json"`.
- Use the real title (short author prefix is fine, e.g. `Hadar: 15 Minute Morning Pronunciation Practice`). Don't invent a duration or content; take it from the title or the page.

## 3. Where things go

| Thing | File | Notes |
|---|---|---|
| Resource (video, course, book, tool) | `src/data/guides.ts`, `GUIDES[ch].groups[].items` | `{ title, url, kind, note, free }`. Its `title` becomes an auto-link everywhere through `Linkify`. |
| Daily item text | `src/data/plan.ts`, `DAILY` | `sub` goes through `Linkify`: write a resource's exact title in it to make it a link. |
| Matching guide text | `src/data/guides.ts`, the chapter's "Daily … routine" checklist | Keep it in step with `DAILY`. |
| Plan task | `src/data/plan.ts`, `TASKS` (`T(id, ch, quarter, month, text)`) | |
| Project | `P(code, ch, title)` in `plan.ts` + `PROJECT_DETAILS` in `guides.ts` | Codes like `E3` auto-link. |
| 100-item list | `src/data/lists.ts` | Append only. |

## 4. Rules that protect stored data

- Never rename or reuse ids (`DAILY` ids, task and project ids). They are keys in the DB.
- Checklist ticks are keyed by checklist title slug and item index (`chk:<ch>:<slug>:<i>`): don't rename checklist titles or reorder items. Editing an item's wording or appending is fine.
- List items are keyed by index: append, don't reorder.
- A new `DAILY` item joins `CORE_IDS`, which drives the streak; past days lack it, so every streak breaks. Prefer extending an existing item. If a new daily item is really wanted, keep it out of `CORE_IDS` unless the user wants it to count.
- Keep project codes and "Chapter N" verbatim so `Linkify` links them.

## 5. Verify and report

- `npm run build` and `npm run lint` (existing `Health.tsx` purity warnings are known).
- Don't commit unless asked. Don't touch README or other docs.
- Report: what changed, where, and anything that doesn't fit (for example a 15-minute video in a 7-minute slot).
