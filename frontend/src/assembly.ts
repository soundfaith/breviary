import { reflections } from './reflections'
import { readingCycle } from './readingCycle'

type JsonRecord = Record<string, any>

const modules = import.meta.glob('../data/**/*.json', { eager: true, import: 'default' }) as Record<string, any>

function load(relativePath: string): any {
  const key = `../data/${relativePath}`
  const value = modules[key]
  if (value === undefined) throw new Error(`Missing data file: ${relativePath}`)
  return value
}

const seasons = load('seasons.json').seasons as Record<string, JsonRecord>
const saints = load('saints.json').saints as JsonRecord[]
const office = load('office.json') as JsonRecord
const psalms = {
  ...load('library/psalms_full.json'),
  psalm_91_compline: load('library/psalm_91_compline.json'),
  psalm_134_compline: load('library/psalm_134_compline.json'),
} as Record<string, JsonRecord>

const canticles = {
  song_of_zechariah: load('library/canticles/song_of_zechariah.json'),
  song_of_mary: load('library/canticles/song_of_mary.json'),
  song_of_simeon: load('library/canticles/song_of_simeon.json'),
  ephesians_1: load('library/canticles/ephesians_1.json'),
  philippians_2: load('library/canticles/philippians_2.json'),
  colossians_1: load('library/canticles/colossians_1.json'),
  first_peter_2: load('library/canticles/first_peter_2.json'),
  revelation_4_5: load('library/canticles/revelation_4_5.json'),
  revelation_11_12: load('library/canticles/revelation_11_12.json'),
  revelation_15: load('library/canticles/revelation_15.json'),
}
const blessings = {
  blessing_lauds: load('library/blessings/blessing_lauds.json'),
  blessing_vespers: load('library/blessings/blessing_vespers.json'),
  blessing_compline: load('library/blessings/blessing_compline.json'),
}

const repeatedPsalmNumbers = [1, 8, 16, 19, 22, 23, 27, 32, 34, 40, 42, 46, 51, 63, 67, 84, 90, 91, 95, 100, 103, 104, 119, 121, 126, 127, 130, 136, 138, 143, 146, 147]
const psalmCycle = [
  ...Array.from({ length: 150 }, (_, index) => `psalm_${index + 1}`),
  ...repeatedPsalmNumbers.map((number) => `psalm_${number}`),
]

const toDate = (value: Date | string): Date => {
  if (value instanceof Date) return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('date must be a YYYY-MM-DD string.')
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`Invalid calendar date: ${value}.`)
  return date
}

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86400000)
const dateKey = (date: Date) => date.toISOString().slice(5, 10)
const dateOnly = (date: Date) => date.toISOString().slice(0, 10)

export function easterSunday(year: number) {
  const century = Math.floor(year / 100)
  const remainder = year % 19
  const solarCorrection = Math.floor((century - Math.floor(century / 4) - Math.floor((8 * century + 13) / 25) + 19 * remainder + 15) % 30)
  const weekCorrection = Math.floor((year + Math.floor(year / 4) + solarCorrection + 2 - century + Math.floor(century / 4)) % 7)
  const month = Math.floor((solarCorrection - weekCorrection + 40) / 44) + 3
  const day = solarCorrection - weekCorrection + 28 - 31 * Math.floor(month / 4)
  return new Date(Date.UTC(year, month - 1, day))
}

export function resolveSeason(value: Date | string) {
  const date = toDate(value)
  const year = date.getUTCFullYear()
  const christmasStart = new Date(Date.UTC(year, 11, 25))
  const christmasEnd = new Date(Date.UTC(year, 0, 12))
  const easter = easterSunday(year)
  const lentStart = addDays(easter, -46)
  const easterEnd = addDays(easter, 49)
  const adventReference = new Date(Date.UTC(year, 11, 3))
  const adventStart = addDays(adventReference, -adventReference.getUTCDay())
  if (date <= christmasEnd || date >= christmasStart) return 'christmas'
  if (date >= adventStart) return 'advent'
  if (date >= lentStart && date < easter) return 'lent'
  if (date >= easter && date <= easterEnd) return 'easter'
  return 'ordinary_time'
}

const resolve = (collection: Record<string, JsonRecord>, id: string, label: string) => {
  const record = collection[id]
  if (!record) throw new Error(`Missing ${label}: ${id}.`)
  return record
}

export function assembleDailyPrayer({ day, date, season }: { day: number; date: Date | string; season?: string }) {
  if (!Number.isInteger(day) || day < 1 || day > 182) throw new Error('day must be an integer from 1 to 182.')
  const calendarDate = toDate(date)
  const seasonId = resolveSeason(calendarDate)
  if (season && season.toLowerCase().replace(/\s+/g, '_') !== seasonId) throw new Error(`Season ${season} does not match ${dateOnly(calendarDate)}; expected ${seasonId}.`)
  const seasonData = resolve(seasons, seasonId, 'season')
  const saint = saints.find((candidate) => candidate.date === dateKey(calendarDate)) || null
    const psalm = (id: string) => resolve(psalms, id, 'psalm')
    const reading = readingCycle[day - 1]
    const psalmOfTheDay = psalm(psalmCycle[day - 1])
  const opening = office.commonTexts.opening
  return {
    date: dateOnly(calendarDate), cycleDay: day, season: { id: seasonData.id, name: seasonData.name }, saint,
    invitatory: { opening, psalm: psalm(office.hours.invitatory.psalmId), antiphon: seasonData.antiphon },
    lauds: {
      opening, antiphon: saint ? { text: saint.antiphon, type: 'saint' } : { ...seasonData.antiphon, type: 'season' },
      psalm: psalmOfTheDay, reading, reflection: reflections[day - 1], canticle: canticles[office.hours.lauds.canticleId as keyof typeof canticles],
      intercessions: { text: saint ? saint.intercession : seasonData.intercessions.text, type: saint ? 'saint' : 'season' },
      concludingPrayer: { text: saint ? saint.concludingPrayer : seasonData.concludingPrayer.text, type: saint ? 'saint' : 'season' }, blessing: blessings.blessing_lauds,
    },
    vespers: { opening, ntCanticle: canticles[office.hours.vespers.ntCanticleIds[(day - 1) % office.hours.vespers.ntCanticleIds.length] as keyof typeof canticles], canticle: canticles[office.hours.vespers.canticleId as keyof typeof canticles], shortPrayer: seasonData.shortPrayer, blessing: blessings.blessing_vespers },
    compline: { opening, psalm: psalm(office.hours.compline.fixedPsalmIds[(day - 1) % office.hours.compline.fixedPsalmIds.length]), canticle: canticles[office.hours.compline.canticleId as keyof typeof canticles], nightPrayer: office.commonTexts.nightPrayer, blessing: blessings.blessing_compline },
  }
}

export type DailyPrayer = ReturnType<typeof assembleDailyPrayer>
export type PrayerBlock = { heading: string; text: string; kind?: 'reflection' }

const text = (value: any) => typeof value === 'string' ? value : value?.text ?? ''
const withoutVerseNumbers = (value: string) => value.replace(/^\s*\d+:\d+\.\s*/gm, '').replace(/^\s*\d+\.\s*/gm, '').replace(/\n{3,}/g, '\n\n').trim()
export function prayerToBlocks(prayer: DailyPrayer, hour: 'lauds' | 'vespers' | 'compline'): PrayerBlock[] {
  const blocks: PrayerBlock[] = [{ heading: 'Opening', text: prayer[hour].opening }]
  if (hour === 'lauds') {
    blocks.push({ heading: 'Antiphon', text: text(prayer.lauds.antiphon) })
    blocks.push({ heading: `Psalm ${prayer.lauds.psalm.number}`, text: withoutVerseNumbers(prayer.lauds.psalm.text) }, { heading: `Reading · ${prayer.lauds.reading.reference}`, text: prayer.lauds.reading.text }, { heading: 'Benedictus · Canticle · Luke 1:68-79', text: withoutVerseNumbers(prayer.lauds.canticle.text) }, { heading: 'Intercessions', text: prayer.lauds.intercessions.text }, { heading: 'Conclusion', text: prayer.lauds.concludingPrayer.text }, { heading: 'Blessing', text: prayer.lauds.blessing.text }, { heading: 'Reflection', text: prayer.lauds.reflection.text, kind: 'reflection' })
  } else if (hour === 'vespers') {
    blocks.push({ heading: `Canticle · ${prayer.vespers.ntCanticle.reference}`, text: withoutVerseNumbers(prayer.vespers.ntCanticle.text) }, { heading: 'Magnificat · Canticle · Luke 1:46-55', text: withoutVerseNumbers(prayer.vespers.canticle.text) }, { heading: 'Short Prayer', text: prayer.vespers.shortPrayer.text }, { heading: 'Blessing', text: prayer.vespers.blessing.text })
  } else {
    blocks.push({ heading: `Psalm ${prayer.compline.psalm.number}`, text: withoutVerseNumbers(prayer.compline.psalm.text) })
    blocks.push({ heading: 'Nunc Dimittis · Canticle · Luke 2:29-32', text: withoutVerseNumbers(prayer.compline.canticle.text) }, { heading: 'Night Prayer', text: prayer.compline.nightPrayer }, { heading: 'Blessing', text: prayer.compline.blessing.text })
  }
  return blocks
}

export const libraryCollections = { psalms, readings: readingCycle, reflections, canticles, blessings, saints, seasons }

export function cycleDayForDate(date: Date) {
  const start = Date.UTC(1970, 0, 1)
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return (Math.floor((current - start) / 86400000) % 182) + 1
}