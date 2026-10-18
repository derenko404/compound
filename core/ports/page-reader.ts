import type { LinkKind } from '../domain/types'

/** What a link's page says about itself: title, description, a guess at its kind, and readable text (for summaries). */
export interface PageMeta { title: string; description: string; kind: LinkKind | null; text: string }

export interface PageReaderPort {
  // Never throws: a page it can't read comes back blank.
  read(url: string): Promise<PageMeta>
}
