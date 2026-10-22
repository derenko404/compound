// Lists: the index, one list's page and its sheets.
export const lists = {
  title: 'Lists',
  empty: 'No lists yet. Tap Add to start one.',
  newList: 'New list',
  deleteList: 'Delete list',
  deleteListText: "Its items and ticks go with it. This can't be undone.",
  // The list's own sheet: name, title and the detail label.
  sheet: {
    createList: 'Create list',
    nameFirst: 'Give the list a name first.',
    shortName: 'Short name',
    shortNamePlaceholder: '📚 Books',
    detail: 'Detail under each item',
    detailPlaceholder: 'Author',
    detailHint: 'Like the author for books, the year for films, the artist for songs',
    title: 'Title',
    titlePlaceholder: '100 books everyone should read',
  },
  item: {
    addTo: (name: string) => `Add to ${name}`,
    edit: 'Edit item',
    titleFirst: 'Give it a title first.',
    title: 'Title',
    details: 'Details',
    deleteText: "Its tick goes with it. This can't be undone.",
  },
  page: {
    gone: 'This list no longer exists.',
    editDetails: (name: string) => `Edit ${name}'s name and title`,
    search: (name: string) => `Search ${name.toLowerCase()}`,
    show: 'Show',
    filters: { all: 'All', todo: 'Still to do', done: 'Done' },
    emptyList: 'This list is empty. Tap Add to add items.',
    emptyFilter: 'Nothing here with this filter.',
  },
}
