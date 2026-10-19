import { Quote as QuoteIcon } from 'lucide-react'

// A short quote in a quiet box: the words in italics, the author right after them. label: for screen readers.
export const Quote = ({ text, author, label }: { text: string; author: string; label?: string }) => (
  <figure className="quote" aria-label={label}>
    <QuoteIcon className="quote-icon" aria-hidden="true" />
    <blockquote>{text} <span className="quote-author">— {author}</span></blockquote>
  </figure>
)
