import fs from 'node:fs'

const bibleBooks = new Map()
for (const file of fs.readdirSync('frontend/data/library/bible').filter((name) => name.endsWith('.json') && name !== 'index.json')) {
  const book = JSON.parse(fs.readFileSync(`frontend/data/library/bible/${file}`, 'utf8'))
  bibleBooks.set(book.name.toLowerCase(), book)
}

const normalizeBook = (name) => {
  const normalized = name.toLowerCase().replace(/^the\s+/, '').replace(/\s+/g, ' ').trim()
  return {
    'song of songs': 'song of solomon',
    'song of solomon': 'song of solomon',
    'phiippians': 'philippians',
    'sirarch': 'sirach',
  }[normalized] ?? normalized
}
const referenceText = (reference) => {
  const normalized = reference.replace(/\u00a0/g, ' ').replace(/\.$/, '').replace(/\s+or\s+.*$/i, '').replace(/^Psalm\s+/i, 'Psalms ').replace(/(\d+):(\d+)[a-z]*[–—-](\d+):/gi, '$1:$2;$3:')
  const barePsalmMatch = normalized.match(/^(?:Psalms\s+)?(\d+):(.*)$/i)
  let book
  let chapter
  let verseList
  let currentBookName = 'psalms'
  if (barePsalmMatch) {
    book = bibleBooks.get('psalms')
    chapter = Number(barePsalmMatch[1])
    verseList = barePsalmMatch[2]
  } else {
    const match = normalized.match(/^(.+?)\s+(?:(\d+|[A-Z]):(.*)|(\d+.*))$/i)
    if (!match) throw new Error(`Unsupported reference: ${reference}`)
    currentBookName = match[1]
    book = bibleBooks.get(normalizeBook(currentBookName))
    if (!book) throw new Error(`Missing Bible book: ${currentBookName}`)
    chapter = match[2] ? Number(match[2]) : 1
    verseList = match[3] ?? match[4]
  }
  if (Number.isNaN(chapter) && normalizeBook(currentBookName) === 'esther' && normalized.match(/^(.+?)\s+([A-Z]):/i)?.[2]?.toUpperCase() === 'C') {
    book = bibleBooks.get('esther (greek)')
    chapter = 4
  }
  verseList = verseList.replace(/(\d+)[a-z]*[–—-](\d+):(\d+)/i, `${chapter}:$1;$2:$3`)
  const firstCitedVerse = Number(verseList.match(/\d+/)?.[0])
  const highestCitedVerse = Math.max(...[...verseList.matchAll(/\d+/g)].map((value) => Number(value[0])))
  if (normalizeBook(currentBookName) === 'daniel' && chapter === 3 && highestCitedVerse > 30) book = bibleBooks.get('daniel (greek)') ?? book
  if (!book.verses.some((candidate) => candidate.chapter === chapter && candidate.verse === firstCitedVerse)) {
    const variant = bibleBooks.get(`${normalizeBook(currentBookName)} (greek)`)
    if (variant) book = variant
  }
  const verses = []
  for (let segment of verseList.split(';').map((value) => value.trim()).filter(Boolean)) {
    const chapterMatch = segment.match(/^(\d+):(.*)$/)
    if (chapterMatch) {
      chapter = Number(chapterMatch[1])
      segment = chapterMatch[2]
    }
    for (const part of segment.split(/,|\s+and\s+/i).map((value) => value.trim()).filter(Boolean)) {
      const partChapterMatch = part.match(/^(\d+):(.*)$/)
      const partChapter = partChapterMatch ? Number(partChapterMatch[1]) : chapter
      const versePartRaw = partChapterMatch ? partChapterMatch[2] : part
      const versePart = versePartRaw.replace(/\s+/g, '')
      const sourceChapter = book.verses.some((candidate) => candidate.chapter === partChapter) ? partChapter : partChapter - 1
      const compactRange = versePart.match(/^(\d+)[a-z]+(\d+)$/i)
      const range = versePart.match(/^(\d+)[a-z]*-(\d+)[a-z]*$/i)
      const single = versePart.match(/^(\d+)[a-z]*$/i)
      const rangeWithSuffix = versePart.match(/^(\d+)[a-z]*[-–—](\d+)[a-z]*$/i)
      const chapterCrossRange = versePart.match(/^(\d+):?(\d+)?\s*[-–—]\s*(\d+):?(\d+)$/i)
      const ampersandRange = versePart.match(/^(\d+)[a-z]*&(?:\d+)[a-z]*$/i)
      const repeatedHyphenRange = /^\d+[a-z]*(?:-\d+[a-z]*)+$/i.test(versePart)
      const numericMatches = [...versePart.matchAll(/\d+/g)].map((match) => Number(match[0]))
      if (!compactRange && !range && !single && !rangeWithSuffix && !chapterCrossRange && !ampersandRange && !repeatedHyphenRange) throw new Error(`Unsupported verse range: ${part}`)
      const first = Number(compactRange?.[1] ?? range?.[1] ?? rangeWithSuffix?.[1] ?? chapterCrossRange?.[2] ?? ampersandRange?.[1] ?? (repeatedHyphenRange ? numericMatches[0] : single?.[1]))
      const last = Number(compactRange?.[2] ?? range?.[2] ?? rangeWithSuffix?.[2] ?? chapterCrossRange?.[4] ?? ampersandRange?.[2] ?? (repeatedHyphenRange ? numericMatches[numericMatches.length - 1] : first))
      for (let verse = first; verse <= last; verse += 1) {
        let found = book.verses.find((candidate) => candidate.chapter === sourceChapter && candidate.verse === verse)
        for (let offset = 1; offset <= 6 && !found; offset += 1) found = book.verses.find((candidate) => candidate.chapter === sourceChapter && candidate.verse === verse - offset)
        if (!found) throw new Error(`Missing verse: ${book.name} ${partChapter}:${verse}`)
        if (!verses.includes(found.text)) verses.push(found.text)
      }
    }
  }
  return verses.join(' ')
}

const path = 'frontend/data/mass-readings.json'
const config = JSON.parse(fs.readFileSync(path, 'utf8'))
for (const entry of Object.values(config.entries)) {
  for (const [kind, value] of Object.entries(entry.readings)) {
    const reference = typeof value === 'string' ? value : value.reference
    entry.readings[kind] = { reference, text: referenceText(reference) }
  }
}
fs.writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`)