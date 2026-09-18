import psalmsFull from '../data/library/psalms_full.json'

export type BibleVerse = { chapter: number; verse: number; text: string }
export type BibleBook = { id: string; name: string; abbreviation: string; verses: BibleVerse[] }

const bibleModules = import.meta.glob('../data/library/bible/*.json', { eager: true, import: 'default' }) as Record<string, BibleBook | { books: unknown[] }>
const bibleIndex = bibleModules['../data/library/bible/index.json'] as { books: Array<{ id: string }> }
const canonicalOrder = new Map(bibleIndex.books.map((book, index) => [book.id, index]))
const fullPsalmVerses = Object.values(psalmsFull as Record<string, { number: number; text: string }>).flatMap((psalm) =>
  psalm.text.split('\n').map((line) => {
    const match = line.match(/^(\d+):(\d+)\.\s*(.*)$/)
    return match ? { chapter: Number(match[1]), verse: Number(match[2]), text: match[3] } : null
  }).filter((verse): verse is BibleVerse => verse !== null),
)

export const bibleBooks = [
  ...Object.values(bibleModules).filter((book): book is BibleBook => 'verses' in book && Array.isArray(book.verses) && book.id !== 'psalms'),
  { id: 'psalms', name: 'Psalms', abbreviation: 'PSA', verses: fullPsalmVerses },
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
