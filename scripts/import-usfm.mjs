import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sourceDir = path.join(root, 'engwebp_usfm')
const outputDir = path.join(root, 'frontend', 'data', 'library', 'bible')
const existingIndexPath = path.join(outputDir, 'index.json')
const sourceFiles = fs.readdirSync(sourceDir).filter((file) => /^\d+-.+engwebp\.usfm$/i.test(file))
const ignoredFiles = new Set(['00-FRTengwebp.usfm', '106-GLOengwebp.usfm'])

const codeToId = {
  GEN: 'genesis', EXO: 'exodus', LEV: 'leviticus', NUM: 'numbers', DEU: 'deuteronomy',
  JOS: 'joshua', JDG: 'judges', RUT: 'ruth', '1SA': '1_samuel', '2SA': '2_samuel',
  '1KI': '1_kings', '2KI': '2_kings', '1CH': '1_chronicles', '2CH': '2_chronicles',
  EZR: 'ezra', NEH: 'nehemiah', EST: 'esther', JOB: 'job', PSA: 'psalms', PRO: 'proverbs',
  ECC: 'ecclesiastes', SNG: 'song_of_solomon', ISA: 'isaiah', JER: 'jeremiah', LAM: 'lamentations',
  EZK: 'ezekiel', DAN: 'daniel', HOS: 'hosea', JOL: 'joel', AMO: 'amos', OBA: 'obadiah',
  JON: 'jonah', MIC: 'micah', NAM: 'nahum', HAB: 'habakkuk', ZEP: 'zephaniah', HAG: 'haggai',
  ZEC: 'zechariah', MAL: 'malachi', MAT: 'matthew', MRK: 'mark', LUK: 'luke', JHN: 'john',
  ACT: 'acts', ROM: 'romans', '1CO': '1_corinthians', '2CO': '2_corinthians', GAL: 'galatians',
  EPH: 'ephesians', PHP: 'philippians', COL: 'colossians', '1TH': '1_thessalonians',
  '2TH': '2_thessalonians', '1TI': '1_timothy', '2TI': '2_timothy', TIT: 'titus', PHM: 'philemon',
  HEB: 'hebrews', JAS: 'james', '1PE': '1_peter', '2PE': '2_peter', '1JN': '1_john',
  '2JN': '2_john', '3JN': '3_john', JUD: 'jude', REV: 'revelation',
}

function cleanUsfm(text) {
  return text
    .replace(/\\f\s[\s\S]*?\\f\*/g, ' ')
    .replace(/\\x\s[\s\S]*?\\x\*/g, ' ')
    .replace(/\\w\s+([^|\\]+)\|[^\\]*\\w\*/g, '$1')
    .replace(/\\([a-z]+\d*)\*/gi, ' ')
    .replace(/\\[a-z]+\d*\s*/gi, ' ')
    .replace(/\|[^\\\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function logicalLines(raw) {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/)
  const result = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (/^\\(?:id|ide|h|toc\d*|mt\d*|cl|c|p|q\d*|s\d*|ms\d*|r|d|sp|li\d*|v)\b/.test(trimmed)) result.push(trimmed)
    else if (result.length) result[result.length - 1] += ` ${trimmed}`
  }
  return result
}

function parseBook(file) {
  const raw = fs.readFileSync(path.join(sourceDir, file), 'utf8')
  const lines = logicalLines(raw)
  const idLine = lines.find((line) => line.startsWith('\\id ')) ?? ''
  const code = idLine.split(/\s+/)[1]
  const id = codeToId[code]
  if (!id) return null
  const heading = lines.find((line) => line.startsWith('\\h '))?.replace(/^\\h\s+/, '').trim() ?? id
  const toc3 = lines.find((line) => line.startsWith('\\toc3 '))?.replace(/^\\toc3\s+/, '').trim() ?? code
  let chapter = 0
  let paragraph = 0
  let poetry = false
  const verses = []
  for (const line of lines) {
    if (line.startsWith('\\c ')) {
      chapter = Number(line.match(/^\\c\s+(\d+)/)?.[1] ?? 0)
      paragraph = 0
      poetry = false
      continue
    }
    if (/^\\p\b/.test(line)) {
      paragraph += 1
      poetry = false
      continue
    }
    const poetryMatch = line.match(/^\\q\d*\s*(.*)$/)
    if (poetryMatch) {
      const continuation = cleanUsfm(poetryMatch[1])
      if (continuation && verses.length) {
        verses[verses.length - 1].text = `${verses[verses.length - 1].text} ${continuation}`.replace(/\s+/g, ' ').trim()
      } else {
        paragraph += 1
      }
      poetry = true
      continue
    }
    const verseMatch = line.match(/^\\v\s+(\d+(?:[-,]\d+)?)\s+([\s\S]*)$/)
    if (!verseMatch || !chapter) continue
    const verseNumber = Number(verseMatch[1].split(/[-,]/)[0])
    const text = cleanUsfm(verseMatch[2])
    if (!text) continue
    if (!paragraph) paragraph = 1
    verses.push({ chapter, verse: verseNumber, paragraph, poetry, text })
  }
  return {
    id,
    name: heading,
    abbreviation: toc3.toUpperCase(),
    translation: 'World English Bible (Updated)',
    source: 'engwebp_usfm',
    verses,
  }
}

const imported = sourceFiles.filter((file) => !ignoredFiles.has(file)).map(parseBook).filter(Boolean)
for (const book of imported) fs.writeFileSync(path.join(outputDir, `${book.id}.json`), `${JSON.stringify(book, null, 2)}\n`)

const existingIndex = JSON.parse(fs.readFileSync(existingIndexPath, 'utf8'))
const importedById = new Map(imported.map((book) => [book.id, book]))
const books = existingIndex.books
  .filter((book) => importedById.has(book.id) || fs.existsSync(path.join(outputDir, `${book.id}.json`)))
  .map((book) => {
    const importedBook = importedById.get(book.id)
    return importedBook
      ? { id: importedBook.id, name: importedBook.name, abbreviation: importedBook.abbreviation, verseCount: importedBook.verses.length }
      : book
  })
fs.writeFileSync(existingIndexPath, `${JSON.stringify({ ...existingIndex, source: 'engwebp_usfm', books }, null, 2)}\n`)
console.log(`Imported ${imported.length} USFM books and ${imported.reduce((total, book) => total + book.verses.length, 0)} verses.`)
