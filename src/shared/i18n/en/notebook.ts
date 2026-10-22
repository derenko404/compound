// Notebook: the page, the entry sheet and the entry cards.
export const notebook = {
  title: 'Notebook',
  add: 'Add a note, idea or link',
  searchLabel: 'Search your notebook',
  searchPlaceholder: 'Search by text, link or #tag',
  filter: 'Filter',
  all: 'All',
  empty: 'Nothing here yet. Tap + to add a note, an idea or a link.',
  today: 'Today',
  yesterday: 'Yesterday',
  sheet: {
    writeFirst: 'Write something first.',
    note: 'Note',
    notePlaceholder: 'A thought worth keeping, an idea, or a link and why it matters',
    aiContext: 'AI context',
    aiContextHint: "Written by the AI when the bot saved this. You can't edit it.",
    tags: 'Tags',
    tagPlaceholder: 'A tag',
  },
  card: {
    entry: 'entry',
    deleteEntry: 'Delete entry',
    deleteAsk: 'Delete this entry?',
    deleteText: "It's removed from your notebook for good.",
    opensNewTab: 'opens in a new tab',
    viaTelegram: 'via Telegram',
  },
  // A link's kind, as finds.ts names it (video, post, site).
  kinds: { video: 'Video', post: 'Post', site: 'Site' },
}
