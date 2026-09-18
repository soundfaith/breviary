export type BibleVerse = { chapter: number; verse: number; paragraph?: number; poetry?: boolean; text: string }
export type BibleBook = { id: string; name: string; abbreviation: string; verses: BibleVerse[] }

const bibleModules = import.meta.glob('../data/library/bible/*.json', { eager: true, import: 'default' }) as Record<string, BibleBook | { books: unknown[] }>
const bibleIndex = bibleModules['../data/library/bible/index.json'] as { books: Array<{ id: string }> }
const canonicalOrder = new Map(bibleIndex.books.map((book, index) => [book.id, index]))
export const bibleBooks = [
  ...Object.values(bibleModules).filter((book): book is BibleBook => 'verses' in book && Array.isArray(book.verses)),
]
  .sort((left, right) => (canonicalOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (canonicalOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER))

export const bibleBookById = new Map(bibleBooks.map((book) => [book.id, book]))
export const bibleOldTestamentBooks = bibleBooks.filter((book) => (canonicalOrder.get(book.id) ?? Number.MAX_SAFE_INTEGER) < (canonicalOrder.get('matthew') ?? Number.MAX_SAFE_INTEGER))
export const bibleNewTestamentBooks = bibleBooks.filter((book) => (canonicalOrder.get(book.id) ?? 0) >= (canonicalOrder.get('matthew') ?? Number.MAX_SAFE_INTEGER))

export function bibleChapters(book: BibleBook) {
  return [...new Set(book.verses.map((verse) => verse.chapter))].sort((left, right) => left - right)
}

export function bibleChapter(book: BibleBook, chapter: number) {
  return book.verses.filter((verse) => verse.chapter === chapter)
}
