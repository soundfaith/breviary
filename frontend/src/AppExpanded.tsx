import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, Menu, Moon, Search, Sun, Volume2, X } from 'lucide-react'

type Hour = { id: string; label: string; latin: string; time: string; source: string }
type CalendarInfo = { saint: string; rank: string; color: string; season: string; commemorations: string }
type ReferenceEntry = {
  id: string
  category: string
  categoryLabel: string
  route: string
  title: string
  summary: string
  rank?: string
  feastDate?: string
  raw: string
}

type RubricItem = { slug: string; title: string; description: string }

const hours: Hour[] = [
  { id: 'matutinum', label: 'Office of Readings', latin: 'Matutinum', time: 'Before dawn', source: 'Ordinarium/Matutinum.txt' },
  { id: 'laudes', label: 'Lauds', latin: 'Laudes', time: 'Morning', source: 'Ordinarium/Laudes.txt' },
  { id: 'prima', label: 'Prime', latin: 'Prima', time: 'First hour', source: 'Ordinarium/Prima.txt' },
  { id: 'tertia', label: 'Terce', latin: 'Tertia', time: 'Mid-morning', source: 'Ordinarium/Minor.txt' },
  { id: 'sexta', label: 'Sext', latin: 'Sexta', time: 'Midday', source: 'Ordinarium/Minor.txt' },
  { id: 'nona', label: 'None', latin: 'Nona', time: 'Mid-afternoon', source: 'Ordinarium/Minor.txt' },
  { id: 'vespera', label: 'Vespers', latin: 'Vesperae', time: 'Evening', source: 'Ordinarium/Vespera.txt' },
  { id: 'completorium', label: 'Compline', latin: 'Completorium', time: 'Night', source: 'Ordinarium/Completorium.txt' },
]

const categoryMap = {
  sancti: { label: 'Sancti', route: '/sancti', description: 'Feasts and offices for the saints of the year.' },
  tempora: { label: 'Tempora', route: '/tempora', description: 'Advent, Lent, Easter, and the time after Pentecost.' },
  commune: { label: 'Commune', route: '/commune', description: 'Shared offices for martyrs, virgins, doctors, and pastors.' },
  psalterium: { label: 'Psalterium', route: '/psalterium', description: 'Psalms and the musical pattern of the office.' },
  ordinarium: { label: 'Ordinarium', route: '/ordinarium', description: 'The unchanging structure of the daily office.' },
  martyrologium1960: { label: 'Martyrologium1960', route: '/martyrologium1960', description: 'The saints remembered by the Church each day.' },
} as const

const rubricItems: RubricItem[] = [
  { slug: 'pray', title: 'How to pray the breviary', description: 'A simple orientation to the daily order of psalms, hours, and prayer.' },
  { slug: 'feasts', title: 'How feasts work', description: 'A guide to the rank of feasts, their colors, and their liturgical weight.' },
  { slug: 'commemorations', title: 'How commemorations work', description: 'What is remembered, when it is joined, and how it affects a day.' },
  { slug: 'psalter', title: 'How the psalter rotates', description: 'An overview of the weekly psalm cycles and their seasonal use.' },
  { slug: '1962', title: 'Rubrics 1962', description: 'The canonical rules as they are set out in the 1962 edition.' },
  { slug: '1960-1930', title: 'Rubrics 1960 / 1930', description: 'A historical note on the older rubrics and their continuity with the current form.' },
]

const latinCorpus = import.meta.glob('../data/latin/**/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const englishCorpus = import.meta.glob('../data/english/**/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

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

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function dateKey(date: Date) {
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dateText(date: Date, options: Intl.DateTimeFormatOptions) {
  return date.toLocaleDateString('en-US', options)
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item'
}

function inferCategory(filePath: string) {
  const text = filePath.toLowerCase()
  if (text.includes('/sancti/')) return 'sancti'
  if (text.includes('/tempora/')) return 'tempora'
  if (text.includes('/commune/') || text.includes('/communem/') || text.includes('/communeop/')) return 'commune'
  if (text.includes('/psalterium/')) return 'psalterium'
  if (text.includes('/ordinarium/')) return 'ordinarium'
  if (text.includes('/martyrologium1960/')) return 'martyrologium1960'
  return ''
}

function titleFromFilePath(filePath: string, raw: string) {
  const fileName = filePath.split('/').pop()?.replace(/\.txt$/i, '') ?? 'Untitled'
  const name = raw.match(/\[Name\]\s*\n([^\n]+)/i)?.[1] || raw.match(/\[Nomen\]\s*\n([^\n]+)/i)?.[1] || raw.match(/\[Title\]\s*\n([^\n]+)/i)?.[1]
  if (name) return name.trim().replace(/\s+/g, ' ')
  return fileName.replace(/[-_]/g, ' ')
}

function cleanVisibleText(value: string) {
  return value
    .replace(/@(?:[A-Za-z0-9]+\/[A-Za-z0-9._:-]+(?::[A-Za-z0-9._:-]+)?)/gi, '')
    .replace(/\b(?:see|vide|from|ex)\s+[A-Za-z0-9\/._:-]+\s*;?/gi, '')
    .replace(/\b(?:Comkey|TempNat|Pasc\d+[\w.-]*|Tempora|Sancti|Martyrologium1960|Ant|Lectio|Commemoratio)\b[\w./:-]*\s*/gi, '')
    .replace(/;;+/g, ' ')
    .replace(/\[|\]/g, '')
    .replace(/\bPreface=([A-Za-z0-9 ]+)/gi, 'Preface: $1')
    .replace(/\bDoxology=([A-Za-z0-9 ]+)/gi, 'Doxology: $1')
    .replace(/\bCredo\b/gi, 'Credo')
    .replace(/\bGloria\b/gi, 'Gloria')
    .replace(/\bTe Deum\b/gi, 'Te Deum')
    .replace(/\s*;\s*/g, '; ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*:\s*;/g, ': ')
    .replace(/\s+\./g, '.')
    .trim()
}

function getTagValue(raw: string, tag: string) {
  const match = raw.match(new RegExp(`\\[${tag}\\]\\s*\\n?([\\s\\S]*?)(?=\\n\\[[A-Za-z][^\\]]*\\]|$)`, 'i'))
  if (!match) return ''
  return cleanVisibleText(match[1].replace(/\r/g, ''))
}

function getMonthDayFromPath(filePath: string) {
  const filename = filePath.split('/').pop() ?? ''
  const match = filename.match(/^(\d{2})-(\d{2})\.txt$/)
  if (!match) return ''
  const [, month, day] = match
  const date = new Date(2024, Number(month) - 1, Number(day))
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

function summaryFromContent(raw: string, category: string, title: string) {
  const ruleText = getTagValue(raw, 'Rule')
  const rankText = getTagValue(raw, 'Rank')
  const officeText = getTagValue(raw, 'Officium')

  if (category === 'psalterium') {
    const psalmMatch = raw.match(/(?:Psalm(?:us)?\s*[:#-]?\s*(\d+)|\b(\d{1,3})\b)/i)
    if (psalmMatch) {
      const number = psalmMatch[1] || psalmMatch[2]
      const incipit = raw.match(/[A-ZÀ-ÖØ-Þ][^\n]{20,90}/)?.[0]?.trim() || 'Psalm text'
      return `Psalm ${number}; ${incipit.slice(0, 120)}`
    }
  }

  const combined = [ruleText, officeText, rankText].filter(Boolean).join('; ')
  if (combined) {
    const cleaned = combined
      .split(';')
      .map((piece) => piece.trim())
      .filter((piece) => piece && !/^\d+\s+lessons?$/i.test(piece) && !/^\d+\s+lectiones?$/i.test(piece) && !piece.startsWith('see ') && !piece.startsWith('vide ') && !piece.startsWith('from ') && !piece.startsWith('ex '))
      .slice(0, 4)
      .join('; ')

    if (cleaned) return cleaned
  }

  const fallback = raw
    .replace(/\[[^\]]+\][^\n]*\n?/g, '')
    .replace(/@[^\n]+/g, '')
    .replace(/!\s*[A-Za-z0-9 .,:;()'-]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return fallback.slice(0, 180) || `${title} is part of the breviary reference.`
}

function infoFor(raw: string | undefined, date: Date): CalendarInfo {
  const rankLine = raw?.match(/^\[Rank\][^\n]*\n([^\n]+)/m)?.[1] ?? ''
  const parts = rankLine.split(';;')
  const season = date.getMonth() < 2 ? 'Time after Epiphany' : date.getMonth() < 4 ? 'Lent' : date.getMonth() < 6 ? 'Eastertide' : 'Time after Pentecost'
  return {
    saint: parts[0]?.trim() || 'Feria',
    rank: parts[1]?.trim() || 'Feria',
    color: season === 'Lent' ? 'violet' : season === 'Eastertide' ? 'white' : 'green',
    season,
    commemorations: raw?.toLowerCase().includes('commemoratio') ? 'Commemoration noted in the proper.' : 'None',
  }
}

function parsePrayer(raw: string, fallback: string) {
  const blocks: { heading: string; text: string }[] = []
  let heading = fallback
  let text: string[] = []
  const flush = () => {
    if (text.length) blocks.push({ heading, text: text.join(' ') })
    text = []
  }

  raw.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith('!') && !line.startsWith('@') && !line.startsWith('&')).forEach((line) => {
    const section = line.match(/^\[(.+?)\]/)
    if (section) {
      flush()
      heading = section[1].replace(/\s+\(.+\)/, '')
      return
    }
    const clean = line.replace(/;;\d+$/, '').trim()
    if (clean) text.push(clean)
  })
  flush()
  return blocks.slice(0, 22)
}

function buildReferenceEntries(corpus: Record<string, string>): ReferenceEntry[] {
  const counts = new Map<string, number>()
  const entries: ReferenceEntry[] = []

  Object.entries(corpus).forEach(([filePath, raw]) => {
    const category = inferCategory(filePath)
    if (!category) return

    const title = titleFromFilePath(filePath, raw)
    const baseSlug = slugify(title)
    const nextIndex = counts.get(baseSlug) ?? 0
    counts.set(baseSlug, nextIndex + 1)
    const slug = nextIndex === 0 ? baseSlug : `${baseSlug}-${nextIndex + 1}`
    const route = category === 'psalterium' ? `/psalm/${slug}` : `/${category}/${slug}`

    entries.push({
      id: `${category}-${slug}`,
      category,
      categoryLabel: categoryMap[category as keyof typeof categoryMap].label,
      route,
      title,
      summary: summaryFromContent(raw, category, title),
      rank: getTagValue(raw, 'Rank') || undefined,
      feastDate: getMonthDayFromPath(filePath) || undefined,
      raw,
    })
  })

  return entries
}


function getReadableDetailSections(raw: string) {
  const tags = ['Officium', 'Rank', 'Rule', 'Commemoratio', 'Oratio', 'Lectiones', 'Versum', 'Rubrica', 'Rubricae']
  return tags
    .map((tag) => {
      const value = getTagValue(raw, tag)
      if (!value) return null
      return { tag, value }
    })
    .filter((entry): entry is { tag: string; value: string } => Boolean(entry))
}

function SearchGroup({ title, results, onSelect }: { title: string; results: ReferenceEntry[]; onSelect: (entry: ReferenceEntry) => void }) {
  return (
    <section className="search-group">
      <h2>
        {title} <span>({results.length})</span>
      </h2>
      {results.length ? (
        results.slice(0, 6).map((entry) => (
          <button key={entry.route} onClick={() => onSelect(entry)}>
            <strong>{entry.title}</strong>
            <small>{cleanVisibleText(getTagValue(entry.raw, 'Rank') || entry.feastDate || 'Liturgical reference')}</small>
            <small>{entry.summary}</small>
          </button>
        ))
      ) : (
        <p>No matches in this group.</p>
      )}
    </section>
  )
}

export default function AppExpanded() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [month, setMonth] = useState(() => new Date())
  const [drawer, setDrawer] = useState(false)
  const [dark, setDark] = useState(false)
  const [fontSize, setFontSize] = useState(18)
  const [language, setLanguage] = useState<'en' | 'la'>('en')
  const [selected, setSelected] = useState(currentHour())
  const [route, setRoute] = useState(() => window.location.pathname + window.location.search)
  const [referencePage, setReferencePage] = useState<Record<string, number>>({})
  const itemsPerPage = 12

  const activeCorpus = useMemo(
    () => (language === 'en' ? englishCorpus : latinCorpus),
    [language],
  )
  const fallbackCorpus = useMemo(
    () => (language === 'en' ? latinCorpus : englishCorpus),
    [language],
  )

  const referenceEntries = useMemo(() => buildReferenceEntries(activeCorpus), [activeCorpus])

  const today = useMemo(() => new Date(), [])
  const key = dateKey(selectedDate)
  const proper = activeCorpus[`../data/${language === 'en' ? 'english' : 'latin'}/Sancti/${key}.txt`] ?? activeCorpus[`../data/${language === 'en' ? 'english' : 'latin'}/Tempora/${key}.txt`] ?? fallbackCorpus[`../data/${language === 'en' ? 'latin' : 'english'}/Sancti/${key}.txt`] ?? fallbackCorpus[`../data/${language === 'en' ? 'latin' : 'english'}/Tempora/${key}.txt`] ?? ''
  const ordinary = activeCorpus[`../data/${language === 'en' ? 'english' : 'latin'}/${selected.source}`] ?? fallbackCorpus[`../data/${language === 'en' ? 'latin' : 'english'}/${selected.source}`] ?? ''
  const prayer = parsePrayer([proper, ordinary].filter(Boolean).join('\n'), selected.latin)
  const info = infoFor(proper, selectedDate)

  const firstDay = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname + window.location.search)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const toggleLanguage = () => {
    setLanguage((current) => {
      const nextLanguage = current === 'en' ? 'la' : 'en'
      setReferencePage({})
      return nextLanguage
    })
    setRoute(window.location.pathname + window.location.search)
  }

  const navigate = (nextPath: string) => {
    const normalized = nextPath.startsWith('/') ? nextPath : `/${nextPath}`
    window.history.pushState({}, '', normalized)
    setRoute(window.location.pathname + window.location.search)
    setDrawer(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToDate = (date: Date) => {
    setSelectedDate(date)
    setMonth(date)
    navigate('/calendar')
  }

  const openHour = (hour: Hour, date = selectedDate) => {
    setSelected(hour)
    setSelectedDate(date)
    navigate('/prayer')
  }

  const shiftDate = (amount: number) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + amount)
    setSelectedDate(next)
    setMonth(next)
  }

  const speak = () => {
    window.speechSynthesis?.cancel()
    if (window.speechSynthesis) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(prayer.map((block) => block.text).join(' ')))
    }
  }

  const currentPath = route.split('?')[0]
  const searchParams = new URLSearchParams(route.split('?')[1] ?? '')
  const searchQuery = searchParams.get('q') ?? ''
  const results = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []
    return referenceEntries.filter((entry) => {
      const haystack = [entry.title, entry.summary, entry.categoryLabel, entry.raw].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [searchQuery])

  const grouped = {
    Saints: results.filter((entry) => entry.category === 'sancti'),
    Psalms: results.filter((entry) => entry.category === 'psalterium'),
    Seasons: results.filter((entry) => entry.category === 'tempora'),
    Commons: results.filter((entry) => entry.category === 'commune'),
    Martyrology: results.filter((entry) => entry.category === 'martyrologium1960'),
    Ordinarium: results.filter((entry) => entry.category === 'ordinarium'),
  }

  const detailEntry = referenceEntries.find((entry) => entry.route === currentPath) ?? null

  const rubricContent: Record<string, { title: string; description: string; paragraphs: string[] }> = {
    pray: {
      title: 'How to pray the breviary',
      description: 'A simple orientation to the daily order of psalms, hours, and prayer.',
      paragraphs: [
        'The Roman Breviary is ordered around the rhythm of the day. In practice, the faithful move from Matins to Lauds, the daytime hours, Vespers, and Compline, with a seasonal and sanctoral texture that changes from week to week.',
        'Each hour is not an isolated text but a continuation of the same prayerful pattern: psalms, readings, and intercessory prayer, all shaped by the liturgical season and by the feast or feria that stands before the Church.',
      ],
    },
    feasts: {
      title: 'How feasts work',
      description: 'A guide to the rank of feasts, their colors, and their liturgical weight.',
      paragraphs: [
        'Feasts are not all equal in the secular or liturgical sense. Their rank determines whether a celebration takes precedence, whether it replaces the office of the feria, and how the Church orders the psalmody and commemorations in that day.',
        'The color of a feast likewise signals the character of the celebration: white for joy, violet for preparation and penance, red for martyrs and the Passion, and green for the ordinary course of the season.',
      ],
    },
    commemorations: {
      title: 'How commemorations work',
      description: 'What is remembered, when it is joined, and how it affects a day.',
      paragraphs: [
        'A commemoration is a smaller remembrance that does not eclipse the principal office of the day. It is woven into the celebration under the authority of the higher feast or feria that dominates the liturgical day.',
        'In practical terms, commemorations preserve the memory of saints and events without overturning the seasonal or sanctoral pattern already in place.',
      ],
    },
    psalter: {
      title: 'How the psalter rotates',
      description: 'An overview of the weekly psalm cycles and their seasonal use.',
      paragraphs: [
        'The psalter is arranged so that the Church does not repeat the same text endlessly. Over the course of the week, different psalms and groups are assigned to the hours, letting the prayer of the Office remain varied while keeping a stable order.',
        'Seasonal emphases enter the cycle as well: Advent, Lent, and Easter each give special color and emphasis to the psalmody, so the structure remains the same while the spiritual mood changes.',
      ],
    },
    '1962': {
      title: 'Rubrics 1962',
      description: 'The canonical rules as they are set out in the 1962 edition.',
      paragraphs: [
        'The 1962 rubrics describe the ordinary flow and governance of the Roman Breviary in a highly ordered way: how the office is structured, how solemnities are ranked, and how the Church marks the division between feria, feast, and privilege.',
        'The 1962 arrangement remains a standard reference point for those studying the traditional form of the Divine Office, even when they are comparing it to later revisions and historical forms.',
      ],
    },
    '1960-1930': {
      title: 'Rubrics 1960 / 1930',
      description: 'A historical note on the older rubrics and their continuity with the current form.',
      paragraphs: [
        'The older rubrics preserve important continuity with the Roman tradition. They show how the Church long understood the office through rubrical detail, seasonal handling, and the ordering of feasts and commemorations.',
        'A study of the 1930 and 1960 forms helps explain the manner in which later reforms clarified or adjusted older patterns without abandoning the broader logic of the office.',
      ],
    },
  }

  const renderIndexPage = (category: string) => {
    const items = referenceEntries.filter((entry) => entry.category === category)
    const meta = categoryMap[category as keyof typeof categoryMap]
    const page = referencePage[category] ?? 1
    const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage))
    const safePage = Math.min(page, totalPages)
    const pageItems = items.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage)

    return (
      <main className="utility-page">
        <div className="page-back-bar">
          <button className="back-button" onClick={() => navigate('/library')}>
            <ChevronLeft size={17} /> Back to Proper & Common
          </button>
        </div>

        <div className="utility-heading">
          <div>
            <span className="section-kicker">Reference shelf</span>
            <h1>{meta.label}</h1>
            <p>{meta.description}</p>
          </div>
        </div>

        <div className="reference-list">
          {pageItems.map((entry) => (
            <button key={entry.id} className="reference-item" onClick={() => navigate(entry.route)}>
              <div className="reference-item-main">
                <span className="section-kicker">{entry.feastDate ?? entry.categoryLabel}</span>
                <h2>{entry.title}</h2>
                <p>{entry.summary}</p>
              </div>
              <div className="reference-item-meta">
                <ChevronRight size={17} />
              </div>
            </button>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              type="button"
              className="page-button"
              disabled={safePage === 1}
              onClick={() => setReferencePage((current) => ({ ...current, [category]: Math.max(1, safePage - 1) }))}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span>Page {safePage} of {totalPages}</span>
            <button
              type="button"
              className="page-button"
              disabled={safePage === totalPages}
              onClick={() => setReferencePage((current) => ({ ...current, [category]: Math.min(totalPages, safePage + 1) }))}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </main>
    )
  }

  const renderDetailPage = (entry: ReferenceEntry) => {
    const detailSections = getReadableDetailSections(entry.raw)
    const rankValue = cleanVisibleText(getTagValue(entry.raw, 'Rank') || entry.rank || '')

    return (
      <main className="reader-page detail-page">
        <div className="reader-toolbar">
          <button className="back-button" onClick={() => navigate(`/${entry.category}`)}>
            <ChevronLeft size={17} /> {entry.categoryLabel}
          </button>
          <span className="reader-date">{entry.feastDate ?? 'Reference entry'}</span>
        </div>
        <article className="prayer-content detail-content">
          <span className="section-kicker">{entry.categoryLabel}</span>
          <h1>{entry.title}</h1>
          <p className="prayer-subtitle">{entry.feastDate ? entry.feastDate : 'Liturgical reference'}{rankValue ? ` · ${rankValue}` : ''}</p>
          <div className="rule" />

          <div className="detail-summary">
            <h2>Overview</h2>
            <p>{entry.summary}</p>
            <dl className="detail-list">
              <div className="detail-row"><dt>Name</dt><dd>{entry.title}</dd></div>
              <div className="detail-row"><dt>Date</dt><dd>{entry.feastDate ?? 'Not specified'}</dd></div>
              {rankValue ? <div className="detail-row"><dt>Rank</dt><dd>{rankValue}</dd></div> : null}
            </dl>
          </div>

          <div className="detail-summary">
            <h2>Liturgical notes</h2>
            {detailSections.length ? (
              <dl className="detail-list">
                {detailSections
                  .filter((section) => !['Officium', 'Rank'].includes(section.tag))
                  .map((section) => (
                    <div className="detail-row" key={section.tag}>
                      <dt>{section.tag}</dt>
                      <dd>{section.value}</dd>
                    </div>
                  ))}
              </dl>
            ) : (
              <p>{entry.summary}</p>
            )}
          </div>
        </article>
      </main>
    )
  }

  const renderRubricPage = (slug: string) => {
    const content = rubricContent[slug] ?? {
      title: rubricItems.find((entry) => entry.slug === slug)?.title ?? 'Coming soon',
      description: rubricItems.find((entry) => entry.slug === slug)?.description ?? 'This guide will explain this part of the liturgical tradition once it is available.',
      paragraphs: ['This guide will describe that part of the liturgical tradition once it is available.'],
    }

    return (
      <main className="utility-page rubric-page">
        <div className="page-back-bar">
          <button className="back-button" onClick={() => navigate('/guide')}>
            <ChevronLeft size={17} /> Back to Rubrics & explanations
          </button>
        </div>
        <span className="section-kicker">Rubrics & explanations</span>
        <h1>{content.title}</h1>
        <p className="intro">{content.description}</p>
        <div className="content-card">
          {content.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => navigate('/')} aria-label="Return home">
          <span className="brand-mark">✦</span>
          <span>breviary</span>
        </button>
        <div className="header-actions">
          <span className="date-chip">
            <CalendarDays size={15} /> {dateText(selectedDate, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <button className="icon-button" onClick={() => navigate('/search')} aria-label="Search the breviary">
            <Search size={18} />
          </button>
          <button className="icon-button" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu size={21} />
          </button>
        </div>
      </header>

      {currentPath === '/' && (
        <main className="home-page">
          <section className="hero">
            <div className="eyebrow"><span className="eyebrow-dot" /> 1962 edition · latin</div>
            <h1>
              A quiet place
              <br />
              <em>to pray.</em>
            </h1>
            <p className="hero-copy">The daily office, carefully assembled for the rhythm of your day.</p>
            <button className="primary-button" onClick={() => openHour(selected)}>
              <BookOpen size={18} /> Pray {selected.label}
              <span className="button-arrow">→</span>
            </button>
            <div className="hero-note">
              <Clock3 size={15} /> It is time for <strong>{selected.label}</strong>
            </div>
          </section>

          <section className="hours-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">The daily office</span>
                <h2>Today’s hours</h2>
              </div>
              <button className="text-button" onClick={() => navigate('/calendar')}>
                <span>View calendar</span>
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="hours-grid">
              {hours.map((hour, index) => (
                <button className={`hour-card ${hour.id === selected.id ? 'active' : ''}`} key={hour.id} onClick={() => openHour(hour)}>
                  <span className="hour-number">0{index + 1}</span>
                  <span className="hour-latin">{hour.latin}</span>
                  <strong>{hour.label}</strong>
                  <span className="hour-time">{hour.time}</span>
                </button>
              ))}
            </div>
          </section>
        </main>
      )}

      {currentPath === '/prayer' && (
        <main className="reader-page">
          <div className="reader-toolbar">
            <button className="back-button" onClick={() => navigate('/')}>
              <ChevronLeft size={17} /> All hours
            </button>
            <span className="reader-date">{dateText(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>

          <article className="prayer-content" style={{ fontSize }}>
            <span className="section-kicker">{selected.time} · {dateText(selectedDate, { month: 'long', day: 'numeric' })}</span>
            <h1>{selected.label}</h1>
            <p className="prayer-subtitle">{selected.latin} · {info.saint}</p>
            <div className="day-meta">
              <span className={`color-dot ${info.color}`} />
              {info.rank} · {info.season}
            </div>
            <div className="rule" />
            {prayer.map((block, index) => (
              <section className="prayer-block" key={`${block.heading}-${index}`}>
                <h2>{block.heading}</h2>
                <p>{block.text}</p>
              </section>
            ))}
          </article>

          <div className="reader-footer">
            <button className="text-button" onClick={() => selected.id === 'matutinum' ? shiftDate(-1) : openHour(hours[Math.max(0, hours.indexOf(selected) - 1)])}>
              <ChevronLeft size={16} />
              <span>{selected.id === 'matutinum' ? 'Previous day' : 'Previous hour'}</span>
            </button>
            <button className="audio-button" onClick={speak}>
              <Volume2 size={16} /> Listen
            </button>
            <button className="text-button" onClick={() => selected.id === 'completorium' ? shiftDate(1) : openHour(hours[Math.min(hours.length - 1, hours.indexOf(selected) + 1)])}>
              <span>{selected.id === 'completorium' ? 'Next day' : 'Next hour'}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </main>
      )}

      {currentPath === '/calendar' && (
        <main className="utility-page">
          <div className="utility-heading">
            <div>
              <span className="section-kicker">The liturgical year</span>
              <h1>Calendar</h1>
              <p>Every day has its own character.</p>
            </div>
            <button className="today-button" onClick={() => goToDate(today)}>Today</button>
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
                  const day = infoFor(activeCorpus[`../data/${language === 'en' ? 'english' : 'latin'}/Sancti/${dateKey(date)}.txt`] ?? fallbackCorpus[`../data/${language === 'en' ? 'latin' : 'english'}/Sancti/${dateKey(date)}.txt`], date)
                  return (
                    <button className={`calendar-day ${dateKey(date) === key ? 'selected' : ''} ${dateKey(date) === dateKey(today) ? 'today' : ''}`} key={date.toISOString()} onClick={() => goToDate(date)}>
                      <span>{date.getDate()}</span>
                      <i className={`color-dot ${day.color}`} />
                    </button>
                  )
                })}
              </div>
            </section>

            <aside className="day-summary">
              <span className="section-kicker">Selected day</span>
              <h2>{dateText(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
              <p className="summary-saint">{info.saint}</p>
              <dl>
                <div><dt>Rank</dt><dd>{info.rank}</dd></div>
                <div><dt>Season</dt><dd>{info.season}</dd></div>
                <div><dt>Color</dt><dd><span className={`color-dot ${info.color}`} /> {info.color}</dd></div>
                <div><dt>Commemorations</dt><dd>{info.commemorations}</dd></div>
              </dl>
              <button className="primary-button" onClick={() => openHour(selected, selectedDate)}>Pray {selected.label}</button>
            </aside>
          </div>
        </main>
      )}

      {currentPath === '/library' && (
        <main className="utility-page">
          <div className="utility-heading">
            <div>
              <span className="section-kicker">The reference shelf</span>
              <h1>Proper & common</h1>
              <p>The texts that give each office its shape.</p>
            </div>
          </div>
          <div className="library-grid">
            {Object.entries(categoryMap).map(([key, meta]) => (
              <button className="library-card" key={key} onClick={() => navigate(meta.route)}>
                <span className="library-icon"><BookOpen size={19} /></span>
                <span className="section-kicker">{meta.label}</span>
                <h2>{meta.label === 'Tempora' ? 'Proper of the Season' : meta.label === 'Commune' ? 'Commons' : meta.label === 'Sancti' ? 'Proper of Saints' : meta.label}</h2>
                <p>{meta.description}</p>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </main>
      )}

      {currentPath === '/guide' && (
        <main className="utility-page guide-page">
          <span className="section-kicker">A little orientation</span>
          <h1>Rubrics & explanations</h1>
          <p className="intro">A clear path into the older rhythm of the Roman Breviary.</p>
          <div className="guide-list">
            {rubricItems.map((item, index) => (
              <article key={item.slug} onClick={() => navigate(`/rubrics/${item.slug}`)}>
                <span>0{index + 1}</span>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </div>
                <ChevronRight size={17} />
              </article>
            ))}
          </div>
        </main>
      )}

      {currentPath === '/search' && (
        <main className="utility-page search-page">
          <span className="section-kicker">The whole breviary</span>
          <h1>Search</h1>
          <div className="large-search">
            <Search size={20} />
            <input
              autoFocus
              value={searchQuery}
              onChange={(event) => navigate(`/search?q=${encodeURIComponent(event.target.value)}`)}
              placeholder="Search saints, psalms, seasons, commons..."
            />
          </div>

          {searchQuery ? (
            <div className="search-groups">
              {Object.entries(grouped).map(([groupTitle, groupResults]) => (
                <SearchGroup key={groupTitle} title={groupTitle} results={groupResults} onSelect={(entry) => navigate(entry.route)} />
              ))}
            </div>
          ) : (
            <p className="search-hint">Try a saint name, psalm number, or season word.</p>
          )}
        </main>
      )}

      {currentPath.startsWith('/rubrics/') && renderRubricPage(currentPath.split('/').filter(Boolean)[1] ?? '')}
      {currentPath === '/sancti' && renderIndexPage('sancti')}
      {currentPath === '/tempora' && renderIndexPage('tempora')}
      {currentPath === '/commune' && renderIndexPage('commune')}
      {currentPath === '/psalterium' && renderIndexPage('psalterium')}
      {currentPath === '/ordinarium' && renderIndexPage('ordinarium')}
      {currentPath === '/martyrologium1960' && renderIndexPage('martyrologium1960')}

      {detailEntry && (
        currentPath.startsWith('/sancti/') ||
        currentPath.startsWith('/tempora/') ||
        currentPath.startsWith('/commune/') ||
        currentPath.startsWith('/psalm/') ||
        currentPath.startsWith('/ordinarium/') ||
        currentPath.startsWith('/martyrologium1960/')
      ) && renderDetailPage(detailEntry)}

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
                <button key={hour.id} onClick={() => openHour(hour)} className={selected.id === hour.id && currentPath === '/prayer' ? 'current' : ''}>
                  <span>{hour.label}</span>
                  <small>{hour.latin}</small>
                </button>
              ))}
              <span className="nav-label">Explore</span>
              <button onClick={() => navigate('/calendar')}><CalendarDays size={16} /> Liturgical calendar</button>
              <button onClick={() => navigate('/library')}><BookOpen size={16} /> Proper & common</button>
              <button onClick={() => navigate('/guide')}><BookOpen size={16} /> Rubrics & guides</button>
            </nav>
            <div className="drawer-settings">
              <span className="nav-label">Settings</span>
              <button onClick={() => setDark(!dark)}>
                {dark ? <Moon size={16} /> : <Sun size={16} />}
                {dark ? 'Dark theme' : 'Light theme'}
                <span className="setting-state">On</span>
              </button>
              <button onClick={toggleLanguage}>
                <span>{language === 'en' ? 'English' : 'Latin'}</span>
                <span className="setting-state">{language === 'en' ? 'EN' : 'LA'}</span>
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
