import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, Menu, Moon, MoonStar, Sparkles, Sun, SunMedium, Sunrise, Sunset, Volume2, X } from 'lucide-react'

type Hour = { id: string; label: string; time: string; caption: string; icon: any }
type PrayerBlock = { heading: string; text: string }
type Dataset = {
  psalms: Record<string, any>
  canticles: Record<string, any>
  hymns: Record<string, any>
  readings: Record<string, any>
  antiphons: Record<string, any>
  intercessions: Record<string, any>
  concludingPrayers: Record<string, any>
  responsories: Record<string, any>
  blessings: Record<string, any>
  gospelCanticleAntiphons: Record<string, any>
  hourTemplates: Record<string, any>
  hourTemplatesV2: Record<string, any>
  saints: Record<string, any>
  psalmodyBlocks: Record<string, any>
  psalmPrayers: Record<string, any>
  properOfSaints: Record<string, any>
  invitatory: Record<string, any>
  patristicReadings: Record<string, any>
}

const hours: Hour[] = [
  { id: 'matutinum', label: 'Office of Readings', time: 'Before dawn', caption: 'Night watch', icon: MoonStar },
  { id: 'laudes', label: 'Lauds', time: 'Morning', caption: 'Awakening prayer', icon: Sunrise },
  { id: 'prima', label: 'Prime', time: 'First hour', caption: 'First light', icon: SunMedium },
  { id: 'tertia', label: 'Terce', time: 'Mid-morning', caption: 'Morning rise', icon: SunMedium },
  { id: 'sexta', label: 'Sext', time: 'Midday', caption: 'Noon pause', icon: Sun },
  { id: 'nona', label: 'None', time: 'Mid-afternoon', caption: 'Afternoon stillness', icon: Sunset },
  { id: 'vespera', label: 'Vespers', time: 'Evening', caption: 'Evening thanksgiving', icon: Sunset },
  { id: 'completorium', label: 'Compline', time: 'Night', caption: 'Night rest', icon: MoonStar },
]

const datasetModules = import.meta.glob('../data/**/*.json', { eager: true }) as Record<string, any>

function buildDataset(): Dataset {
  const dataset: Dataset = {
    psalms: {},
    canticles: {},
    hymns: {},
    readings: {},
    antiphons: {},
    intercessions: {},
    concludingPrayers: {},
    responsories: {},
    blessings: {},
    gospelCanticleAntiphons: {},
    hourTemplates: {},
    hourTemplatesV2: {},
    saints: {},
    psalmodyBlocks: {},
    psalmPrayers: {},
    properOfSaints: {},
    invitatory: {},
    patristicReadings: {},
  }

  for (const [filePath, value] of Object.entries(datasetModules)) {
    const entry = (value as { default?: any }).default ?? value
    if (!entry || typeof entry !== 'object') continue

    const normalizedPath = filePath.replace(/\\/g, '/')
    const relative = normalizedPath.includes('/data/') ? normalizedPath.split('/data/')[1] : normalizedPath.replace(/^\.\//, '')
    const folder = relative.split('/')[0]
    const entryId = typeof entry.id === 'string' ? entry.id : relative.replace(/\.json$/i, '').replace(/\//g, '_')
    if (!entryId) continue

    if (folder === 'psalms') dataset.psalms[entryId] = entry
    if (folder === 'canticles') dataset.canticles[entryId] = entry
    if (folder === 'hymns') dataset.hymns[entryId] = entry
    if (folder === 'readings') dataset.readings[entryId] = entry
    if (folder === 'antiphons') dataset.antiphons[entryId] = entry
    if (folder === 'intercessions') dataset.intercessions[entryId] = entry
    if (folder === 'concluding_prayers') dataset.concludingPrayers[entryId] = entry
    if (folder === 'responsories') dataset.responsories[entryId] = entry
    if (folder === 'blessings') dataset.blessings[entryId] = entry
    if (folder === 'gospel_canticle_antiphons') dataset.gospelCanticleAntiphons[entryId] = entry
    if (folder === 'hour_templates') dataset.hourTemplates[entryId] = entry
    if (folder === 'hour_templates_v2') dataset.hourTemplatesV2[entryId] = entry
    if (folder === 'saints') dataset.saints[entryId] = entry
    if (folder === 'psalmody_blocks') dataset.psalmodyBlocks[entryId] = entry
    if (folder === 'psalm_prayers') dataset.psalmPrayers[entryId] = entry
    if (folder === 'proper_of_saints') dataset.properOfSaints[entryId] = entry
    if (folder === 'invitatory') dataset.invitatory[entryId] = entry
    if (folder === 'patristic_readings') dataset.patristicReadings[entryId] = entry
  }

  return dataset
}

const dataset = buildDataset()

function currentHour() {
  const hour = new Date().getHours()
  if (hour < 5) return hours[0]
  if (hour < 9) return hours[1]
  if (hour < 12) return hours[2]
  if (hour < 15) return hours[4]
  if (hour < 18) return hours[5]
  if (hour < 21) return hours[6]
  return hours[7]
}

function dateKey(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dateText(date: Date, options: Intl.DateTimeFormatOptions) {
  return date.toLocaleDateString('en-US', options)
}

function normalizeHourId(hourId: string) {
  if (hourId === 'laudes') return 'lauds'
  if (hourId === 'vespera') return 'vespers'
  if (hourId === 'completorium') return 'compline'
  if (hourId === 'matutinum') return 'office_of_readings'
  if (['prima', 'tertia', 'sexta', 'nona'].includes(hourId)) return 'daytime'
  return hourId
}

function pickByIndex<T>(items: T[], index: number) {
  if (!items.length) return undefined
  return items[index % items.length]
}

function sortById<T extends { id?: string }>(items: T[]) {
  return [...items].sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? '')))
}

function joinText(value: any) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.join('\n')
  if (Array.isArray(value.text_lines)) return value.text_lines.join('\n')
  if (typeof value.text === 'string') return value.text
  return ''
}

function stripVerseNumbers(text: string) {
  return text
    .replace(/\b\d+:\d+\.\s*/g, '')
    .replace(/\b\d+:\d+\s*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function computeSeason(date: Date) {
  const month = date.getMonth() + 1
  const day = date.getDate()
  if (month === 12 && day >= 1 && day <= 24) return 'Advent'
  if ((month === 12 && day >= 25) || (month === 1 && day <= 5)) return 'Christmas'
  if ((month === 2 && day >= 18) || month === 3 || (month === 4 && day <= 5)) return 'Lent'
  if ((month === 4 && day >= 6) && month <= 6) return 'Easter'
  if (month === 4 && day >= 6 && day <= 30) return 'Easter'
  if (month === 5) return 'Easter'
  if (month === 6 && day <= 21) return 'Easter'
  return 'Ordinary Time'
}

function computePsalterWeek(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1)
  const diff = Math.floor((date.getTime() - start.getTime()) / 86400000)
  return ((diff % 4) + 1)
}

function lookupSaint(date: Date) {
  const monthDay = dateKey(date)
  return Object.values(dataset.saints).find((saint: any) => saint.date === monthDay) as Record<string, any> | undefined
}

function seasonClass(date: Date) {
  switch (computeSeason(date)) {
    case 'Advent':
      return 'advent'
    case 'Christmas':
      return 'christmas'
    case 'Lent':
      return 'lent'
    case 'Easter':
      return 'easter'
    default:
      return 'pentecost'
  }
}

function selectBySeed<T>(items: T[], seed: number) {
  const sorted = sortById(items as any)
  if (!sorted.length) return undefined
  return sorted[Math.abs(seed) % sorted.length]
}

function resolvePsalmodyText(hourId: string, index: number) {
  const normalizedHour = normalizeHourId(hourId)
  const key = `psalmody_${normalizedHour}_${index}`
  const block = dataset.psalmodyBlocks[key] ?? Object.values(dataset.psalmodyBlocks).find((item: any) => item.hour === normalizedHour && Number(item.position) === index)
  if (!block) return undefined

  const psalmId = block.psalm_or_canticle_id
  const psalm = dataset.psalms[psalmId]
  const antiphon = dataset.antiphons[block.antiphon_id] ?? dataset.antiphons[`antiphon_${normalizedHour}`]
  const prayer = dataset.psalmPrayers[block.psalm_prayer_id] ?? dataset.psalmPrayers[`${block.psalm_prayer_id?.replace(/psalm_/, 'psalm_prayer_')}`]

  const pieces = [
    antiphon ? { heading: 'Antiphon', text: joinText(antiphon) } : undefined,
    psalm ? { heading: `Psalm ${psalm.number ?? ''}`.trim(), text: joinText(psalm) } : undefined,
    prayer ? { heading: 'Prayer', text: joinText(prayer) } : undefined,
  ].filter(Boolean) as PrayerBlock[]

  return pieces
}

function buildPrayer(date: Date, hourId: string): PrayerBlock[] {
  const normalizedHour = normalizeHourId(hourId)
  const template = dataset.hourTemplatesV2[normalizedHour] ?? dataset.hourTemplates[normalizedHour] ?? { elements: ['hymn', 'psalmody_block_1', 'intercessions', 'concluding_prayer'] }
  const blocks: PrayerBlock[] = []

  const invitatory = dataset.invitatory.invitatory ?? Object.values(dataset.invitatory)[0]
  if (['lauds', 'office_of_readings'].includes(normalizedHour) && invitatory) {
    const invitatoryAntiphon = dataset.antiphons[invitatory.antiphon_id] ?? Object.values(dataset.antiphons).find((item: any) => item.id?.includes('psalm_95') || item.id === 'antiphon_psalm_95')
    const invitatoryPsalm = dataset.psalms[invitatory.psalm_id] ?? Object.values(dataset.psalms).find((item: any) => item.id === 'psalm_95')

    if (invitatoryAntiphon) {
      blocks.push({ heading: 'Invitatory Antiphon', text: stripVerseNumbers(joinText(invitatoryAntiphon)) })
    }
    if (invitatoryPsalm) {
      blocks.push({ heading: 'Invitatory Psalm', text: stripVerseNumbers(joinText(invitatoryPsalm)) })
    }
  }

  const fallbackText = {
    hymn: 'Holy, holy, holy. Lord God Almighty.\nEarly in the morning our song rises to you.',
    psalm: 'I will give thanks to the Lord with my whole heart; I will tell of all your wonders.\nThe Lord hears the cry of the poor and delivers them from all their troubles.',
    reading: 'The Lord is near to all who call upon him; he hears the cry of the poor and shelters the weary in his mercy.',
    intercession: 'For the Church and the world, we pray: Lord, hear us.\nFor the poor, the sick, and the afflicted, we pray: Lord, hear us.',
    conclusion: 'Lord God, keep us faithful in prayer and ready for your call. Fill our hearts with your peace and lead us in charity. Through Christ our Lord. Amen.'
  }

  const seed = Math.floor(date.getTime() / 86400000)
  const hymnFromList = selectBySeed(Object.values(dataset.hymns), seed + hours.findIndex((hour) => hour.id === hourId)) as Record<string, any> | undefined
  const shortReading = selectBySeed(Object.values(dataset.readings).filter((item: any) => item.type === 'short'), seed + 1) as Record<string, any> | undefined
  const longReading = selectBySeed(Object.values(dataset.readings).filter((item: any) => item.type === 'long'), seed + 2) as Record<string, any> | undefined
  const patristicReading = selectBySeed(Object.values(dataset.patristicReadings), seed + 3) as Record<string, any> | undefined
  const responsory = dataset.responsories[`responsory_${normalizedHour}`] ?? dataset.responsories[`responsory_${hourId}`] ?? selectBySeed(Object.values(dataset.responsories), seed) as Record<string, any> | undefined
  const intercession = dataset.intercessions[`intercession_${normalizedHour}`] ?? dataset.intercessions[`intercession_${hourId}`] ?? selectBySeed(Object.values(dataset.intercessions), seed) as Record<string, any> | undefined
  const conclusion = dataset.concludingPrayers[`concluding_prayer_${normalizedHour}`] ?? dataset.concludingPrayers[`concluding_prayer_${hourId}`] ?? selectBySeed(Object.values(dataset.concludingPrayers), seed) as Record<string, any> | undefined
  const blessing = dataset.blessings[`blessing_${normalizedHour}`] ?? dataset.blessings[`blessing_${hourId}`] ?? selectBySeed(Object.values(dataset.blessings), seed) as Record<string, any> | undefined
  const gospelAntiphon = dataset.gospelCanticleAntiphons[`gospel_antiphon_${normalizedHour}`] ?? dataset.gospelCanticleAntiphons[`gospel_antiphon_${hourId}`] ?? selectBySeed(Object.values(dataset.gospelCanticleAntiphons), seed) as Record<string, any> | undefined

  for (const element of template.elements) {
    if (element === 'hymn') {
      const hymnText = hymnFromList ? `${hymnFromList.title || 'Hymn'}\n${joinText(hymnFromList)}`.trim() || fallbackText.hymn : fallbackText.hymn
      blocks.push({ heading: 'Hymn', text: stripVerseNumbers(hymnText) })
      continue
    }

    if (element === 'invitatory_antiphon' || element === 'invitatory_psalm') {
      const invitatory = dataset.invitatory.invitatory ?? Object.values(dataset.invitatory)[0]
      const invitatoryAntiphon = dataset.antiphons[invitatory?.antiphon_id ?? ''] ?? Object.values(dataset.antiphons).find((item: any) => item.id?.includes('psalm_95') || item.id === 'antiphon_psalm_95')
      const invitatoryPsalm = dataset.psalms[invitatory?.psalm_id ?? ''] ?? Object.values(dataset.psalms).find((item: any) => item.id === 'psalm_95')

      if (element === 'invitatory_antiphon' && invitatoryAntiphon) {
        blocks.push({ heading: 'Invitatory Antiphon', text: stripVerseNumbers(joinText(invitatoryAntiphon)) || fallbackText.psalm })
      }
      if (element === 'invitatory_psalm' && invitatoryPsalm) {
        blocks.push({ heading: 'Invitatory Psalm', text: stripVerseNumbers(joinText(invitatoryPsalm)) || fallbackText.psalm })
      }
      continue
    }

    if (element.startsWith('psalmody_block_')) {
      const blockIndex = Number((element.match(/(\d+)$/)?.[1] ?? '1'))
      const parts = resolvePsalmodyText(normalizedHour, blockIndex) ?? []
      if (parts.length) {
        blocks.push(...parts.map((part) => ({ ...part, text: stripVerseNumbers(part.text) })))
      } else {
        blocks.push({ heading: 'Psalm', text: stripVerseNumbers(fallbackText.psalm) })
      }
      continue
    }

    if (element === 'short_reading') {
      if (shortReading) {
        blocks.push({ heading: shortReading.reference ?? 'Reading', text: stripVerseNumbers(joinText(shortReading)) || fallbackText.reading })
      } else {
        blocks.push({ heading: 'Reading', text: stripVerseNumbers(fallbackText.reading) })
      }
      continue
    }

    if (element === 'long_reading_scripture') {
      if (longReading) {
        blocks.push({ heading: longReading.reference ?? 'Reading', text: stripVerseNumbers(joinText(longReading)) || fallbackText.reading })
      } else {
        blocks.push({ heading: 'Reading', text: stripVerseNumbers(fallbackText.reading) })
      }
      continue
    }

    if (element === 'long_reading_patristic') {
      if (patristicReading) {
        blocks.push({ heading: patristicReading.reference ?? 'Patristic Reading', text: stripVerseNumbers(joinText(patristicReading)) || fallbackText.reading })
      } else {
        blocks.push({ heading: 'Patristic Reading', text: stripVerseNumbers(fallbackText.reading) })
      }
      continue
    }

    if (element.startsWith('responsory')) {
      const responseText = [responsory?.verse, responsory?.response].filter(Boolean).join('\n')
      blocks.push({ heading: 'Responsory', text: stripVerseNumbers(responseText) || stripVerseNumbers(fallbackText.reading) })
      continue
    }

    if (element === 'gospel_canticle_benedictus' || element === 'gospel_canticle_magnificat' || element === 'gospel_canticle_nunc_dimittis') {
      const canticleIdMap: Record<string, string> = {
        gospel_canticle_benedictus: 'song_of_zechariah',
        gospel_canticle_magnificat: 'song_of_mary',
        gospel_canticle_nunc_dimittis: 'song_of_simeon',
      }
      const canticleId = canticleIdMap[element]
      const canticle = dataset.canticles[canticleId] ?? Object.values(dataset.canticles)[0]
      blocks.push({ heading: canticle?.reference ?? 'Canticle', text: stripVerseNumbers(joinText(canticle)) || stripVerseNumbers(fallbackText.psalm) })
      continue
    }

    if (element === 'gospel_canticle_antiphon') {
      blocks.push({ heading: 'Antiphon', text: stripVerseNumbers(joinText(gospelAntiphon)) || stripVerseNumbers(fallbackText.psalm) })
      continue
    }

    if (element === 'intercessions') {
      blocks.push({ heading: 'Intercessions', text: stripVerseNumbers(joinText(intercession)) || stripVerseNumbers(fallbackText.intercession) })
      continue
    }

    if (element === 'concluding_prayer') {
      blocks.push({ heading: 'Conclusion', text: stripVerseNumbers(conclusion?.text || joinText(conclusion) || fallbackText.conclusion) })
      continue
    }

    if (element === 'blessing') {
      blocks.push({ heading: 'Blessing', text: stripVerseNumbers(blessing?.text || joinText(blessing) || fallbackText.conclusion) })
      continue
    }
  }

  if (!blocks.length) {
    blocks.push({ heading: 'Conclusion', text: fallbackText.conclusion })
  }

  return blocks
}

function getAdjacentPrayer(date: Date, hourId: string, direction: 1 | -1) {
  const currentIndex = hours.findIndex((hour) => hour.id === hourId)

  if (direction === -1) {
    if (currentIndex > 0) {
      return { date, hour: hours[currentIndex - 1] }
    }

    const prevDate = new Date(date)
    prevDate.setDate(prevDate.getDate() - 1)
    return { date: prevDate, hour: hours[hours.length - 1] }
  }

  if (currentIndex < hours.length - 1) {
    return { date, hour: hours[currentIndex + 1] }
  }

  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + 1)
  return { date: nextDate, hour: hours[0] }
}

function AppExpanded() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [month, setMonth] = useState(() => new Date())
  const [drawer, setDrawer] = useState(false)
  const [dark, setDark] = useState(true)
  const [fontSize, setFontSize] = useState(18)
  const [selected, setSelected] = useState<Hour>(() => currentHour())
  const [route, setRoute] = useState<'/' | '/calendar' | '/prayer'>('/')
  const [contentVersion, setContentVersion] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const todayHour = currentHour()
  const saint = Object.values(dataset.saints).find((item: any) => item.date === dateKey(selectedDate))
  const prayer = useMemo(() => buildPrayer(selectedDate, selected.id), [selectedDate, selected.id])
  const previousPrayer = useMemo(() => getAdjacentPrayer(selectedDate, selected.id, -1), [selectedDate, selected.id])
  const nextPrayer = useMemo(() => getAdjacentPrayer(selectedDate, selected.id, 1), [selectedDate, selected.id])

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    return () => stopSpeech()
  }, [])

  useEffect(() => {
    stopSpeech()
  }, [route])

  const openHour = (hour: Hour, dateOverride?: Date) => {
    const nextDate = dateOverride ?? selectedDate
    stopSpeech()
    setSelectedDate(nextDate)
    setSelected(hour)
    setMonth(nextDate)
    setRoute('/prayer')
    setDrawer(false)
    setContentVersion((value) => value + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigatePrayer = (direction: 1 | -1) => {
    const next = getAdjacentPrayer(selectedDate, selected.id, direction)
    stopSpeech()
    setSelectedDate(next.date)
    setSelected(next.hour)
    setMonth(next.date)
    setContentVersion((value) => value + 1)
    setRoute('/prayer')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openCalendar = () => {
    stopSpeech()
    setRoute('/calendar')
    setDrawer(false)
  }

  const goHome = () => {
    stopSpeech()
    const today = new Date()
    setSelectedDate(today)
    setMonth(today)
    setSelected(currentHour())
    setRoute('/')
  }

  const speak = () => {
    if (!('speechSynthesis' in window)) return

    if (isSpeaking) {
      stopSpeech()
      return
    }

    const text = prayer.map((block) => block.text).join(' ')
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
  }

  const firstDay = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={goHome} aria-label="Return home">
          <span className="brand-mark"><Sparkles size={18} /></span>
          <span>Breviary</span>
        </button>
        <div className="header-actions">
          <button className="date-chip" onClick={openCalendar} aria-label="Open calendar">
            <CalendarDays size={15} /> {dateText(selectedDate, { weekday: 'short', month: 'short', day: 'numeric' })}
          </button>
          <button className="icon-button" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu size={21} />
          </button>
        </div>
      </header>

      {route === '/' && (
        <main className="home-page">
          <section className="hero">
            <div className="eyebrow"><span className="eyebrow-dot" /> The SoundFaith Breviary</div>
            <div className="hero-sparkle"><Sparkles size={108} /></div>
            <h1>A quiet place<br /><em>to pray.</em></h1>
            <p className="hero-copy">A simple daily rhythm of prayer, scripture, and the hours of the Church.</p>
            <button className="primary-button" onClick={() => openHour(todayHour, new Date())}>
              <BookOpen size={18} /> Pray {todayHour.label}
              <span className="button-arrow">→</span>
            </button>
            <div className="hero-note">
              <Clock3 size={15} /> It is time for <strong>{todayHour.label}</strong>
            </div>
          </section>

          <section className="hours-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">The daily office</span>
                <h2>Today’s hours</h2>
              </div>
            </div>
            <div className="hours-grid">
              {hours.map((hour) => {
                const Icon = hour.icon
                return (
                  <button className={`hour-card ${hour.id === todayHour.id ? 'active' : ''}`} key={hour.id} onClick={() => openHour(hour, new Date())}>
                    <div className="hour-card-icon"><Icon size={18} /></div>
                    <strong>{hour.label}</strong>
                    <span className="hour-caption">{hour.caption}</span>
                    <span className="hour-time">{hour.time}</span>
                  </button>
                )
              })}
            </div>
          </section>
        </main>
      )}

      {route === '/prayer' && (
        <main className="reader-page">
          <div className="reader-toolbar">
            <button className="back-button" onClick={goHome}>
              <ChevronLeft size={17} /> Today
            </button>
            <span className="reader-date">{dateText(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>

          <article key={`${selected.id}-${dateKey(selectedDate)}-${contentVersion}`} className="prayer-content prayer-content--enter" style={{ fontSize }}>
            <span className="section-kicker">{selected.time} · {dateText(selectedDate, { month: 'long', day: 'numeric' })}</span>
            <h1>{selected.label}</h1>
            <p className="prayer-subtitle">{saint ? saint.name : 'Saint of the day'} · {saint ? 'Memorial' : 'Feria'}</p>
            <div className="rule" />
            {prayer.map((block, index) => (
              <section className="prayer-block" key={`${block.heading}-${index}`}>
                <div className="prayer-block-header">
                  <h2>{block.heading}</h2>
                </div>
                <p style={{ whiteSpace: 'pre-line' }}>{block.text}</p>
              </section>
            ))}
          </article>

          <div className="reader-footer">
            <button className="text-button" onClick={() => navigatePrayer(-1)}>
              <ChevronLeft size={16} />
              <span>Previous: {previousPrayer.hour.label}</span>
            </button>
            <button className="audio-button" onClick={speak}>
              <Volume2 size={16} /> {isSpeaking ? 'Stop' : 'Listen'}
            </button>
            <button className="text-button" onClick={() => navigatePrayer(1)}>
              <span>Next: {nextPrayer.hour.label}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </main>
      )}

      {route === '/calendar' && (
        <main className="utility-page">
          <div className="utility-heading">
            <div>
              <span className="section-kicker">The liturgical year</span>
              <h1>Calendar</h1>
              <p>Every day has its own character.</p>
            </div>
          </div>

          <div className="calendar-layout">
            <section className="calendar-panel">
              <div className="calendar-nav">
                <button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">
                  <ChevronLeft size={18} />
                </button>
                <h2>{dateText(month, { month: 'long', year: 'numeric' })}</h2>
                <button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="weekday-row">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
              </div>

              <div className="month-grid">
                {Array.from({ length: firstDay }).map((_, index) => <span className="empty-day" key={`empty-${index}`} />)}
                {days.map((date) => {
                  const daySaint = Object.values(dataset.saints).find((saintItem: any) => saintItem.date === dateKey(date))
                  const season = seasonClass(date)
                  return (
                    <button
                      key={date.toISOString()}
                      className={`calendar-day ${dateKey(date) === dateKey(selectedDate) ? 'selected' : ''} ${season}`}
                      onClick={() => {
                        setSelectedDate(date)
                        setMonth(date)
                        setRoute('/prayer')
                      }}
                    >
                      <span>{date.getDate()}</span>
                      <i className={`color-dot ${season}`} />
                      <small>{daySaint ? daySaint.name.split(' ').slice(-1)[0] : ''}</small>
                    </button>
                  )
                })}
              </div>
            </section>

            <aside className="calendar-prayer-panel">
              <div className="calendar-prayer-header">
                <span className="section-kicker">Selected day</span>
                <h3>{dateText(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
              </div>
              <div className="calendar-prayer-list">
                {hours.map((hour) => (
                  <button
                    key={hour.id}
                    className={`calendar-prayer-item ${selected.id === hour.id ? 'current' : ''}`}
                    onClick={() => openHour(hour, selectedDate)}
                  >
                    <span>{hour.label}</span>
                    <small>{hour.time}</small>
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </main>
      )}

      {drawer && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
          <aside className="drawer">
            <div className="drawer-top">
              <button className="icon-button" onClick={() => setDrawer(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <nav className="drawer-nav">
              <span className="nav-label">Today</span>
              {hours.map((hour) => (
                <button key={hour.id} onClick={() => openHour(hour)} className={selected.id === hour.id && route === '/prayer' ? 'current' : ''}>
                  <span>{hour.label}</span>
                  <small>{hour.time}</small>
                </button>
              ))}
              <button onClick={() => setRoute('/calendar')}><CalendarDays size={16} /> Calendar</button>
            </nav>
            <div className="drawer-settings">
              <span className="nav-label">Settings</span>
              <button onClick={() => setDark(!dark)}>
                {dark ? <Moon size={16} /> : <Sun size={16} />}
                {dark ? 'Dark theme' : 'Light theme'}
                <span className="setting-state">On</span>
              </button>
              <label>
                <span>Text size</span>
                <input type="range" min="16" max="24" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} />
              </label>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

export default AppExpanded
