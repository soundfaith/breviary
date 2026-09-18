import schedule from '../data/mass-readings.json'

type BibleVerse = { chapter: number; verse: number; text: string }
type BibleBook = { name: string; verses: BibleVerse[] }
type Reading = { reference: string; text: string }
type ScheduleEntry = { date: string; season: string; readings: { firstReading?: string | Reading; psalm?: string | Reading; secondReading?: string | Reading; gospel?: string | Reading }; usccbLink: string }

const bibleModules = import.meta.glob('../data/library/bible/*.json', { eager: true, import: 'default' }) as Record<string, BibleBook | { books: unknown[] }>
const bibleBooks = Object.values(bibleModules).filter((book): book is BibleBook => 'verses' in book)
const booksByName = new Map(bibleBooks.map((book) => [book.name.toLowerCase(), book]))

const normalizeBookName = (name: string) => {
  const normalized = name.toLowerCase().replace(/^the\s+/, '').replace(/\s+/g, ' ').trim()
  const aliases: Record<string, string> = {
    'song of songs': 'song of solomon',
    'song of solomon': 'song of solomon',
    'phiippians': 'philippians',
    'sirarch': 'sirach',
  }
  return aliases[normalized] ?? normalized
}
const findBook = (name: string) => booksByName.get(normalizeBookName(name))
const cleanVerse = (value: string) => value.replace(/[a-z]$/i, '')

function resolveReference(reference: string): Reading {
  const normalized = reference.replace(/\u00a0/g, ' ').replace(/\.$/, '').replace(/^Psalm\s+/i, 'Psalms ')
  const barePsalmMatch = normalized.match(/^(?:Psalms\s+)?(\d+):(.*)$/i)
  let bookName: string
  let chapter: number
  let verseText: string
  if (barePsalmMatch) {
    bookName = 'Psalms'
    chapter = Number(barePsalmMatch[1])
    verseText = barePsalmMatch[2]
  } else {
    const bookMatch = normalized.match(/^(.+?)\s+(\d+):(.*)$/)
    if (!bookMatch) throw new Error(`Unsupported Mass reading reference: ${reference}`)
    bookName = bookMatch[1]
    chapter = Number(bookMatch[2])
    verseText = bookMatch[3]
  }
  const book = findBook(bookName)
  if (!book) throw new Error(`Bible book not found for Mass reading: ${bookName}`)
  const verseParts = verseText.split(',').map((part) => part.trim()).filter(Boolean)
  const verses: BibleVerse[] = []
  for (const part of verseParts) {
    const normalizedPart = part.replace(/\s+/g, '')
    const compactRange = normalizedPart.match(/^(\d+)[a-z]+(\d+)$/i)
    const range = normalizedPart.match(/^(\d+)[a-z]?-(\d+)[a-z]?$/i)
    const single = normalizedPart.match(/^(\d+)[a-z]?$/i)
    const rangeWithSuffix = normalizedPart.match(/^(\d+)[a-z]*[-–—](\d+)[a-z]*$/i)
    const chapterCrossRange = normalizedPart.match(/^(\d+):?(\d+)?[-–—](\d+):?(\d+)$/i)
    const ampersandRange = normalizedPart.match(/^(\d+)[a-z]*&(\d+)[a-z]*$/i)
    const repeatedHyphenRange = /^\d+[a-z]*(?:-\d+[a-z]*)+$/i.test(normalizedPart)
    const numericMatches = [...normalizedPart.matchAll(/\d+/g)].map((match) => Number(match[0]))
    let first: number
    let last: number
    if (chapterCrossRange) {
      const startVerse = Number(chapterCrossRange[2] || 1)
      const endChapter = Number(chapterCrossRange[3])
      const endVerse = Number(chapterCrossRange[4])
      for (let verse = startVerse; verse <= Math.max(...book.verses.filter((candidate) => candidate.chapter === chapter).map((candidate) => candidate.verse)); verse += 1) {
        const found = book.verses.find((candidate) => candidate.chapter === chapter && candidate.verse === verse)
        if (!found) throw new Error(`Bible verse not found: ${book.name} ${chapter}:${verse}`)
        if (!verses.some((candidate) => candidate.chapter === found.chapter && candidate.verse === found.verse)) verses.push(found)
      }
      for (let verse = 1; verse <= endVerse; verse += 1) {
        const found = book.verses.find((candidate) => candidate.chapter === endChapter && candidate.verse === verse)
        if (!found) throw new Error(`Bible verse not found: ${book.name} ${endChapter}:${verse}`)
        if (!verses.some((candidate) => candidate.chapter === found.chapter && candidate.verse === found.verse)) verses.push(found)
      }
      continue
    }
    if (!compactRange && !range && !single && !rangeWithSuffix && !ampersandRange && !repeatedHyphenRange && numericMatches.length < 2) throw new Error(`Unsupported verse range: ${part} in ${reference}`)
    first = Number(compactRange?.[1] ?? range?.[1] ?? rangeWithSuffix?.[1] ?? ampersandRange?.[1] ?? (repeatedHyphenRange ? numericMatches[0] : single?.[1] ?? numericMatches[0]))
    last = Number(compactRange?.[2] ?? range?.[2] ?? rangeWithSuffix?.[2] ?? ampersandRange?.[2] ?? (repeatedHyphenRange ? numericMatches[numericMatches.length - 1] : first))
    if (numericMatches.length >= 2 && !compactRange && !range && !single && !rangeWithSuffix && !ampersandRange && !repeatedHyphenRange) {
      first = numericMatches[0]
      last = numericMatches[numericMatches.length - 1]
    }
    for (let verse = first; verse <= last; verse += 1) {
      const found = book.verses.find((candidate) => candidate.chapter === chapter && candidate.verse === verse)
      if (!found) throw new Error(`Bible verse not found: ${book.name} ${chapter}:${verse}`)
      if (!verses.some((candidate) => candidate.chapter === found.chapter && candidate.verse === found.verse)) verses.push(found)
    }
  }
  return { reference, text: verses.map((verse) => verse.text).join(' ') }
}

export function massReadingsForDate(date: Date): { date: string; season: string; readings: { firstReading?: Reading; psalm?: Reading; secondReading?: Reading; gospel?: Reading }; usccbLink: string } | null {
  const dateKey = date.toISOString().slice(0, 10)
  const entry = (schedule.entries as Record<string, ScheduleEntry>)[dateKey]
  if (!entry) return null
  const readings = Object.fromEntries(Object.entries(entry.readings)
    .filter(([, reading]) => reading)
    .map(([kind, reading]) => {
      if (typeof reading === 'string') return [kind, resolveReference(reading)]
      return [kind, reading as Reading]
    })) as { firstReading?: Reading; psalm?: Reading; secondReading?: Reading; gospel?: Reading }
  return { date: entry.date, season: entry.season, readings, usccbLink: entry.usccbLink }
}

export function massReadingCoverage() {
  return Object.keys(schedule.entries as Record<string, ScheduleEntry>).length
}