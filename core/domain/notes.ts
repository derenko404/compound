// The Notebook's search box: #tags are matched exactly, other words anywhere in the text, AI context and link.
function parseNoteQuery(q = '') {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return { tags: words.filter((w) => w.startsWith('#') && w.length > 1).map((w) => w.slice(1)), text: words.filter((w) => !w.startsWith('#')) }
}

export const noteSearch = { parse: parseNoteQuery }
