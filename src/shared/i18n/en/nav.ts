// The app shell (tabs, top bar, sync state) and the shared components in src/shared/ui.
import { plural } from '@/shared/i18n/plural'

export const nav = {
  tabs: {
    today: 'My day',
    topics: 'Topics',
    notebook: 'Notebook',
    // Lists and Notebook together.
    library: 'Library',
    lists: 'Lists',
    wellbeing: 'Wellbeing',
    timer: 'Timer',
    settings: 'Settings',
  },
  views: 'Views',
  // A tab's sections (Library: Lists and Notebook).
  sectionsOf: (tab: string) => `${tab} sections`,
  // The lines under a grouped tab's title.
  leads: {
    library: 'Lists to work through, and notes, ideas and links. Send notes to your Telegram bot too.',
  },
  // The sync icon's tooltip. StoreProvider's `sync` text uses these too.
  sync: {
    loading: 'Loading…',
    loadError: "Couldn't load your data",
    saving: 'Saving…',
    saveError: "Couldn't save",
    offline: 'Offline. Changes are kept on this device',
    // Offline (or the server can't be reached) with changes waiting.
    waiting: (n: number) => plural(n, { one: 'Offline. # change will sync later', other: 'Offline. # changes will sync later' }),
    synced: 'Synced',
    local: 'Saved on this device only',
  },
  timerLeft: (time: string) => `Timer: ${time} left`,
  loadingProgress: 'Loading your progress…',
  notFound: 'Page not found.',
  appUpdated: 'App updated.',
  updating: 'Updating the app…',
  // Top bar
  bar: {
    // A back button to an inner page it can't name.
    back: 'Back',
    edit: 'Edit',
    done: 'Done',
  },
  // Shared components (src/shared/ui)
  kit: {
    showMore: 'Show more',
    showLess: 'Show less',
    doneToday: 'Done today',
    of: (n: number, total: number, unit: string) => `${n} of ${total} ${unit}`,
    removeUnit: (unit: string) => `Remove a ${unit}`,
    addUnit: (unit: string) => `Add a ${unit}`,
    unitN: (n: number, unit: string) => `${n} ${unit}`,
    search: 'Search',
    clearSearch: 'Clear search',
  },
  // Forms (src/shared/ui/form)
  edit: {
    addTo: (label: string) => `Add to ${label}`,
    remove: (item: string) => `Remove ${item}`,
    topic: 'Topic',
    topics: 'Topics',
    colour: 'Colour',
    // A topic's colour, by the palette keys in content.ts PALETTE.
    colours: {
      blue: 'Blue', orange: 'Orange', purple: 'Purple', green: 'Green', pink: 'Pink', amber: 'Amber',
      slate: 'Slate', teal: 'Teal', gray: 'Grey', red: 'Red', indigo: 'Indigo', lime: 'Lime',
    },
    days: 'Days',
  },
  // Sunday first, as Date.getDay() counts.
  weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
}
