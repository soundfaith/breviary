import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Copy, Menu, Moon, Play, Share2, Sparkles, Sun, X } from 'lucide-react'
import { assembleDailyPrayer, cycleDayForDate, libraryCollections, prayerToBlocks, type DailyPrayer } from './assembly'
import AboutSources from './AboutSources'

type HourId = 'lauds' | 'vespers' | 'compline'
type Hour = { id: HourId; label: string; time: string; caption: string; icon: typeof Sun }
type LibraryTab = 'psalms' | 'readings' | 'reflections' | 'canticles' | 'blessings' | 'saints' | 'seasons'

const hours: Hour[] = [
  { id: 'lauds', label: 'Lauds', time: 'Morning', caption: 'Awakening prayer', icon: Sun },
  { id: 'vespers', label: 'Vespers', time: 'Evening', caption: 'Evening thanksgiving', icon: Sun },
  { id: 'compline', label: 'Compline', time: 'Night', caption: 'Night rest', icon: Moon },
]

function currentHour() {
  const hour = new Date().getHours()
  if (hour < 15) return hours[0]
  if (hour < 21) return hours[1]
  return hours[2]
}

function dateKey(date: Date) { return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function dateText(date: Date, options: Intl.DateTimeFormatOptions) { return date.toLocaleDateString('en-US', options) }
const libraryTabs: { id: LibraryTab; label: string }[] = [
  { id: 'psalms', label: 'Psalms' }, { id: 'readings', label: 'Readings' }, { id: 'reflections', label: 'Reflections' },
  { id: 'canticles', label: 'Canticles' }, { id: 'blessings', label: 'Blessings' }, { id: 'saints', label: 'Saints' }, { id: 'seasons', label: 'Seasons' },
]

function libraryItems(tab: LibraryTab) {
  const source = libraryCollections[tab]
  if (Array.isArray(source)) return source.map((item: any) => ({ id: item.id, title: item.reference ?? item.name ?? `Day ${item.day}`, meta: item.day ? `Day ${item.day}` : '', text: item.text ?? item.shortBiography ?? '' }))
  return Object.values(source).map((item: any, index) => ({ id: item.id ?? `${tab}-${index}`, title: item.reference ?? item.name ?? item.hour ?? item.id ?? `Item ${index + 1}`, meta: item.number ? `Psalm ${item.number}` : item.hour ?? '', text: item.text ?? '' }))
}

function AppExpanded() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [month, setMonth] = useState(() => new Date())
  const [drawer, setDrawer] = useState(false)
  const [dark, setDark] = useState(true)
  const [fontSize, setFontSize] = useState(18)
  const [selected, setSelected] = useState<Hour>(() => currentHour())
  const [route, setRoute] = useState<'/' | '/calendar' | '/prayer' | '/library' | '/about'>('/')
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('psalms')
  const [libraryPage, setLibraryPage] = useState(1)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)
  const todayHour = currentHour()
  const prayer = useMemo<DailyPrayer>(() => assembleDailyPrayer({ day: cycleDayForDate(selectedDate), date: selectedDate }), [selectedDate])
  const blocks = useMemo(() => prayerToBlocks(prayer, selected.id), [prayer, selected.id])
  const saint = prayer.saint

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])
  useEffect(() => () => { window.speechSynthesis?.cancel(); speechRef.current = null }, [])
  useEffect(() => { if (route !== '/prayer') stopSpeech() }, [route])

  const stopSpeech = () => { window.speechSynthesis?.cancel(); speechRef.current = null; setIsSpeaking(false) }
  const openHour = (hour: Hour, dateOverride = selectedDate) => {
    stopSpeech(); setSelectedDate(dateOverride); setMonth(dateOverride); setSelected(hour); setRoute('/prayer'); setDrawer(false); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const navigatePrayer = (direction: 1 | -1) => {
    const index = hours.findIndex((hour) => hour.id === selected.id)
    const nextIndex = (index + direction + hours.length) % hours.length
    const nextDate = new Date(selectedDate)
    if ((direction === 1 && index === hours.length - 1) || (direction === -1 && index === 0)) nextDate.setDate(nextDate.getDate() + direction)
    openHour(hours[nextIndex], nextDate)
  }
  const goHome = () => { stopSpeech(); const today = new Date(); setSelectedDate(today); setMonth(today); setSelected(currentHour()); setRoute('/') }
  const copyPrayer = async () => {
    await navigator.clipboard?.writeText(`${selected.label}\n\n${blocks.map((block) => `${block.heading}\n${block.text}`).join('\n\n')}`)
    setIsCopied(true); window.setTimeout(() => setIsCopied(false), 1800)
  }
  const shareLandingPage = async () => {
    const url = `${window.location.origin}${window.location.pathname}`
    if (navigator.share) await navigator.share({ title: 'Breviary', text: 'A simple daily rhythm of prayer.', url })
    else await navigator.clipboard?.writeText(url)
  }
  const speak = () => {
    if (!('speechSynthesis' in window)) return
    if (isSpeaking) { window.speechSynthesis.pause(); setIsSpeaking(false); return }
    if (speechRef.current && window.speechSynthesis.paused) { window.speechSynthesis.resume(); setIsSpeaking(true); return }
    const utterance = new SpeechSynthesisUtterance(blocks.map((block) => block.text).join(' '))
    utterance.onend = () => { speechRef.current = null; setIsSpeaking(false) }; utterance.onerror = () => { speechRef.current = null; setIsSpeaking(false) }
    speechRef.current = utterance; window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance); setIsSpeaking(true)
  }
  const firstDay = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))
  const previousHour = hours[(hours.findIndex((hour) => hour.id === selected.id) + hours.length - 1) % hours.length]
  const nextHour = hours[(hours.findIndex((hour) => hour.id === selected.id) + 1) % hours.length]
  const libraryData = useMemo(() => libraryItems(libraryTab), [libraryTab])
  const libraryPageSize = 12
  const libraryPageCount = Math.max(1, Math.ceil(libraryData.length / libraryPageSize))
  const visibleLibraryItems = libraryData.slice((libraryPage - 1) * libraryPageSize, libraryPage * libraryPageSize)
  const openLibrary = () => { setRoute('/library'); setDrawer(false); setLibraryPage(1) }

  return <div className="app-shell">
    <header className="site-header"><button className="brand" onClick={goHome} aria-label="Return home"><span className="brand-mark"><Sparkles size={18} /></span><span>Breviary</span></button><div className="header-actions"><button className="date-chip" onClick={() => setRoute('/calendar')} aria-label="Open calendar"><CalendarDays size={15} /> {dateText(selectedDate, { weekday: 'short', month: 'short', day: 'numeric' })}</button><button className="icon-button" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={21} /></button></div></header>
    {route === '/' && <main className="home-page"><section className="hero"><div className="eyebrow"><span className="eyebrow-dot" /> The SoundFaith Breviary</div><h1>A quiet place<br /><em>to pray.</em></h1><p className="hero-copy">A simple daily rhythm of prayer, scripture, and the hours of the Church.</p><button className="primary-button" onClick={() => openHour(todayHour, new Date())}><BookOpen size={18} /> Pray {todayHour.label}<span className="button-arrow">→</span></button><div className="hero-note"><Clock3 size={15} /> It is time for <strong>{todayHour.label}</strong></div></section><section className="hours-section"><div className="section-heading"><div><span className="section-kicker">The daily office</span><h2>Today’s hours</h2></div><button className="text-button" onClick={() => setRoute('/calendar')}>View calendar <ChevronRight size={16} /></button></div><div className="hours-grid">{hours.map((hour) => { const Icon = hour.icon; return <button className={`hour-card ${hour.id === todayHour.id ? 'active' : ''}`} key={hour.id} onClick={() => openHour(hour, new Date())}><div className="hour-card-icon"><Icon size={18} /></div><strong>{hour.label}</strong><span className="hour-caption">{hour.caption}</span><span className="hour-time">{hour.time}</span></button> })}</div></section></main>}
    {route === '/prayer' && <main className="reader-page"><div className="reader-toolbar"><button className="back-button" onClick={goHome}><ChevronLeft size={17} /> Today</button><span className="reader-date">{dateText(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span><div className="reader-actions"><button className="reader-action" onClick={copyPrayer} aria-label="Copy prayer" title="Copy prayer">{isCopied ? <Check size={17} /> : <Copy size={17} />}</button><button className="reader-action" onClick={shareLandingPage} aria-label="Share Breviary" title="Share Breviary"><Share2 size={17} /></button></div></div><article className="prayer-content prayer-content--enter" style={{ fontSize: fontSize - 2 }}><span className="section-kicker">{selected.time} · {dateText(selectedDate, { month: 'long', day: 'numeric' })}</span><h1>{selected.label}</h1><p className="prayer-subtitle">{saint ? saint.name : 'Saint of the day'} · {saint ? 'Memorial' : 'Feria'}</p><div className="rule" />{blocks.map((block, index) => <section className={`prayer-block ${block.kind === 'reflection' ? 'prayer-block--reflection' : ''}`} key={`${block.heading}-${index}`}><div className="prayer-block-header"><h2>{block.heading}</h2></div><p style={{ whiteSpace: 'pre-line' }}>{block.text}</p></section>)}</article><div className="reader-footer"><button className="text-button" onClick={() => navigatePrayer(-1)}><ChevronLeft size={16} /> <span>Previous: {previousHour.label}</span></button><button className={`audio-button ${isSpeaking ? 'is-speaking' : ''}`} onClick={speak} aria-label={isSpeaking ? 'Pause reading' : 'Play reading'} title={isSpeaking ? 'Pause reading' : 'Play reading'}>{isSpeaking ? <span className="equalizer" aria-hidden="true"><i /><i /><i /><i /></span> : <Play size={18} fill="currentColor" />}</button><button className="text-button" onClick={() => navigatePrayer(1)}><span>Next: {nextHour.label}</span> <ChevronRight size={16} /></button></div></main>}
    {route === '/calendar' && <main className="utility-page"><div className="utility-heading"><div><span className="section-kicker">The liturgical year</span><h1>Calendar</h1><p>Every day has its own character.</p></div></div><div className="calendar-layout"><section className="calendar-panel"><div className="calendar-nav"><button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={18} /></button><h2>{dateText(month, { month: 'long', year: 'numeric' })}</h2><button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={18} /></button></div><div className="weekday-row">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div><div className="month-grid">{Array.from({ length: firstDay }).map((_, index) => <span className="empty-day" key={`empty-${index}`} />)}{days.map((date) => <button key={date.toISOString()} className={`calendar-day ${dateKey(date) === dateKey(selectedDate) ? 'selected' : ''}`} onClick={() => openHour(selected, date)}><span>{date.getDate()}</span><small>{dateKey(date) === dateKey(selectedDate) && saint ? saint.name.split(' ').slice(-1)[0] : ''}</small></button>)}</div></section><aside className="calendar-prayer-panel"><div className="calendar-prayer-header"><span className="section-kicker">Selected day</span><h3>{dateText(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}</h3></div><div className="calendar-prayer-list">{hours.map((hour) => <button key={hour.id} className={`calendar-prayer-item ${selected.id === hour.id ? 'current' : ''}`} onClick={() => openHour(hour, selectedDate)}><span>{hour.label}</span><small>{hour.time}</small></button>)}</div></aside></div></main>}
    {route === '/library' && <main className="utility-page library-page"><div className="utility-heading"><div><span className="section-kicker">Source data</span><h1>Library</h1><p>Inspect every record used by the daily office.</p></div></div><div className="library-tabs" role="tablist">{libraryTabs.map((tab) => <button key={tab.id} role="tab" aria-selected={libraryTab === tab.id} className={libraryTab === tab.id ? 'active' : ''} onClick={() => { setLibraryTab(tab.id); setLibraryPage(1) }}>{tab.label}<small>{libraryItems(tab.id).length}</small></button>)}</div><div className="reference-list">{visibleLibraryItems.map((item) => <article className="reference-item library-reference" key={item.id}><div className="reference-item-main"><span className="section-kicker">{item.meta}</span><h2>{item.title}</h2><p>{item.text}</p></div></article>)}</div><div className="pagination-bar"><button className="page-button" disabled={libraryPage === 1} onClick={() => setLibraryPage((page) => page - 1)}><ChevronLeft size={15} /> Previous</button><span>Page {libraryPage} of {libraryPageCount}</span><button className="page-button" disabled={libraryPage === libraryPageCount} onClick={() => setLibraryPage((page) => page + 1)}>Next <ChevronRight size={15} /></button></div></main>}
    {route === '/about' && <main className="utility-page about-page"><div className="utility-heading"><div><span className="section-kicker">A simpler rhythm</span><h1>About the Breviary</h1><p>A simplified daily office for the prayer of the laity.</p></div></div><section className="about-content"><h2>What this is</h2><p>This is a simplified breviary: a gentle way for lay people to pray with Scripture through the day. It is not the official Breviary or Liturgy of the Hours used by priests and clergy, but it can be prayed faithfully by anyone.</p><h2>The Liturgy of the Hours</h2><p>The official Liturgy of the Hours grew from the Church’s long tradition of sanctifying the day with prayer. Its purpose is to praise God, listen to his word, and join the prayer of the Church throughout the day. This simplified version keeps that purpose while making the rhythm easier to enter.</p><p>The psalms remain at the heart of the prayer, so that the whole Psalter can be prayed across the cycle. The Church also encourages the faithful to take part in the liturgy and to spend time in personal prayer with Scripture, especially the Psalms.</p><AboutSources /><h2>How each prayer is assembled</h2><p><strong>Lauds</strong> begins the day with an opening prayer, a seasonal antiphon, one psalm, a short Scripture reading, a reflection, the Benedictus, intercessions, a concluding prayer, and a blessing.</p><p><strong>Vespers</strong> offers a peaceful evening prayer with an opening verse, one short psalm, the Magnificat, a seasonal prayer, and a blessing.</p><p><strong>Compline</strong> closes the day simply with an opening verse, one night psalm, the Nunc Dimittis, and a blessing.</p><h2>How to pray</h2><ol><li>Choose the prayer that fits the time of day, or begin with Lauds.</li><li>Read slowly. Let one phrase from the psalm or Scripture stay with you.</li><li>Use the reflection as a quiet invitation to prayer and daily action.</li><li>Finish with the canticle, intercessions, concluding prayer, and blessing.</li><li>Return each day. Regular prayer matters more than length.</li></ol></section></main>}
    {drawer && <><div className="drawer-backdrop" onClick={() => setDrawer(false)} /><aside className="drawer"><div className="drawer-top"><button className="icon-button" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={20} /></button></div><nav className="drawer-nav"><span className="nav-label">Today</span>{hours.map((hour) => <button key={hour.id} onClick={() => openHour(hour)} className={selected.id === hour.id && route === '/prayer' ? 'current' : ''}><span>{hour.label}</span><small>{hour.time}</small></button>)}<button onClick={() => { setRoute('/calendar'); setDrawer(false) }}><CalendarDays size={16} /> Calendar</button><button onClick={openLibrary}><BookOpen size={16} /> Library</button><button onClick={() => { setRoute('/about'); setDrawer(false) }}><BookOpen size={16} /> About</button></nav><div className="drawer-settings"><span className="nav-label">Settings</span><button onClick={() => setDark(!dark)}>{dark ? <Moon size={16} /> : <Sun size={16} />} {dark ? 'Dark theme' : 'Light theme'}<span className="setting-state">On</span></button><label><span>Text size</span><input type="range" min="16" max="24" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /></label></div></aside></>}
  </div>
}

export default AppExpanded
