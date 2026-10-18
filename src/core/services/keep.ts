/**
 * Updates from outside the app never delete: a list sent in an update adds and changes items (matched by id, or
 * by text for plain strings), and the items it leaves out stay, after the ones sent. Sending items in a new
 * order reorders them.
 */
export const keep = {
  byId<T extends { id: string }>(sent: T[], old: T[]): T[] {
    return [...sent, ...old.filter((o) => !sent.some((s) => s.id === o.id))]
  },
  byText(sent: string[], old: string[]): string[] {
    return [...sent, ...old.filter((o) => !sent.includes(o))]
  },
}
