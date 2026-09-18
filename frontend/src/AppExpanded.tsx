import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  BookMarked,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Cross,
  Home,
  Info,
  Library,
  Menu,
  MessageSquare,
  Moon,
  Pause,
  Play,
  Share2,
  Sparkles,
  Sun,
  Sunrise,
  ScrollText,
  Search,
  Type,
  X,
} from "lucide-react";
import {
  assembleDailyPrayer,
  cycleDayForDate,
  libraryCollections,
  prayerToBlocks,
  type DailyPrayer,
} from "./assembly";
import { massReadingsForDate } from "./massReadings";
import {
  bibleBookById,
  bibleBooks,
  bibleChapter,
  bibleChapters,
  bibleNewTestamentBooks,
  bibleOldTestamentBooks,
} from "./bible";
import AboutSources from "./AboutSources";

type HourId = "lauds" | "vespers" | "compline";
type Hour = {
  id: HourId;
  label: string;
  time: string;
  caption: string;
  description: string;
  icon: typeof Sun;
};
type LibraryTab =
  | "psalms"
  | "readings"
  | "reflections"
  | "canticles"
  | "blessings"
  | "saints"
  | "seasons";

const hours: Hour[] = [
  {
    id: "lauds",
    label: "Lauds",
    time: "Morning",
    caption: "Morning prayer",
    description: "Begin the day by praising God and offering your day to him.",
    icon: Sunrise,
  },
  {
    id: "vespers",
    label: "Vespers",
    time: "Evening",
    caption: "Evening thanksgiving",
    description: "Pause at day’s end to give thanks and return your attention to God.",
    icon: Sun,
  },
  {
    id: "compline",
    label: "Compline",
    time: "Night",
    caption: "Night rest",
    description: "Close the day peacefully and place yourself in God’s care.",
    icon: Moon,
  },
];

function currentHour() {
  const hour = new Date().getHours();
  if (hour < 15) return hours[0];
  if (hour < 21) return hours[1];
  return hours[2];
}

function dateKey(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dateText(date: Date, options: Intl.DateTimeFormatOptions) {
  return date.toLocaleDateString("en-US", options);
}
const libraryTabs: { id: LibraryTab; label: string }[] = [
  { id: "psalms", label: "Psalms" },
  { id: "readings", label: "Readings" },
  { id: "reflections", label: "Reflections" },
  { id: "canticles", label: "Canticles" },
  { id: "blessings", label: "Blessings" },
  { id: "saints", label: "Saints" },
  { id: "seasons", label: "Seasons" },
];

function libraryItems(tab: LibraryTab) {
  const source = libraryCollections[tab];
  if (Array.isArray(source))
    return source.map((item: any) => ({
      id: item.id,
      title: item.reference ?? item.name ?? `Day ${item.day}`,
      meta: item.day ? `Day ${item.day}` : "",
      text: item.text ?? item.shortBiography ?? "",
    }));
  return Object.values(source).map((item: any, index) => ({
    id: item.id ?? `${tab}-${index}`,
    title:
      item.reference ??
      item.name ??
      item.hour ??
      item.id ??
      `Item ${index + 1}`,
    meta: item.number ? `Psalm ${item.number}` : (item.hour ?? ""),
    text: item.text ?? "",
  }));
}

function AppExpanded() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [month, setMonth] = useState(() => new Date());
  const [drawer, setDrawer] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorClosing, setSelectorClosing] = useState(false);
  const [dark, setDark] = useState(
    () => window.localStorage.getItem("soundfaith-theme") === "dark",
  );
  const [fontSize, setFontSize] = useState(() => {
    const saved = Number(window.localStorage.getItem("soundfaith-font-size"));
    return Number.isFinite(saved) ? Math.min(24, Math.max(16, saved)) : 18;
  });
  const [selected, setSelected] = useState<Hour>(() => currentHour());
  const [route, setRoute] = useState<
    | "/"
    | "/calendar"
    | "/prayer"
    | "/readings"
    | "/bible"
    | "/library"
    | "/about"
  >("/");
  const [bibleBookId, setBibleBookId] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("soundfaith-bible-location") ?? "null") as { bookId?: string } | null;
      return saved?.bookId && bibleBookById.has(saved.bookId) ? saved.bookId : "genesis";
    } catch { return "genesis"; }
  });
  const [bibleChapterNumber, setBibleChapterNumber] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("soundfaith-bible-location") ?? "null") as { chapter?: number } | null;
      const savedBookId = JSON.parse(window.localStorage.getItem("soundfaith-bible-location") ?? "null") as { bookId?: string } | null;
      const savedBook = savedBookId?.bookId ? bibleBookById.get(savedBookId.bookId) : undefined;
      const chapter = saved?.chapter;
      return typeof chapter === "number" && Number.isInteger(chapter) && chapter > 0 && (!savedBook || bibleChapters(savedBook).includes(chapter)) ? chapter : 1;
    } catch { return 1; }
  });
  const [expandedTestament, setExpandedTestament] = useState<"old" | "new">("old");
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("psalms");
  const [libraryPage, setLibraryPage] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0);
  const [audioProgressVisible, setAudioProgressVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [bibleSearchOpen, setBibleSearchOpen] = useState(false);
  const [bibleSearchQuery, setBibleSearchQuery] = useState("");
  const [bibleSearchLimit, setBibleSearchLimit] = useState(12);
  const [searchedVerseKey, setSearchedVerseKey] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [bibleSwipeDirection, setBibleSwipeDirection] = useState<"next" | "previous" | null>(null);
  const [speechVoices, setSpeechVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => window.localStorage.getItem("soundfaith-voice-uri") ?? "");
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const bibleTouchStart = useRef<number | null>(null);
  const pinchStartDistance = useRef<number | null>(null);
  const pinchCurrentDistance = useRef<number | null>(null);
  const selectorTouchStart = useRef<number | null>(null);
  const bibleSearchTouchStart = useRef<number | null>(null);
  const continueBibleAudio = useRef(false);
  const audioProgressHideTimer = useRef<number | null>(null);
  const pendingSpeechSeek = useRef<number | null>(null);
  const speechSession = useRef(0);
  const todayHour = currentHour();
  const TodayHourIcon = todayHour.icon;
  const prayer = useMemo<DailyPrayer>(
    () =>
      assembleDailyPrayer({
        day: cycleDayForDate(selectedDate),
        date: selectedDate,
      }),
    [selectedDate],
  );
  const massReadings = useMemo(
    () => massReadingsForDate(selectedDate),
    [selectedDate],
  );
  const blocks = useMemo(
    () => prayerToBlocks(prayer, selected.id),
    [prayer, selected.id],
  );
  const saint = prayer.saint;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("soundfaith-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    window.localStorage.setItem("soundfaith-bible-location", JSON.stringify({ bookId: bibleBookId, chapter: bibleChapterNumber }));
  }, [bibleBookId, bibleChapterNumber]);
  useEffect(() => {
    window.localStorage.setItem("soundfaith-font-size", String(fontSize));
  }, [fontSize]);
  useEffect(() => {
    if (!searchedVerseKey) return;
    const startedAt = performance.now();
    let userScrolled = false;
    let clearOnScroll: (() => void) | undefined;
    const minimumDuration = window.setTimeout(() => {
      if (userScrolled) setSearchedVerseKey(null);
    }, 2800);
    const scrollTimeout = window.setTimeout(() => {
      document.getElementById(searchedVerseKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
      clearOnScroll = () => {
        userScrolled = true;
        if (performance.now() - startedAt >= 2800) setSearchedVerseKey(null);
      };
      window.addEventListener("scroll", clearOnScroll, { passive: true });
    }, 0);
    return () => {
      window.clearTimeout(scrollTimeout);
      window.clearTimeout(minimumDuration);
      if (clearOnScroll) window.removeEventListener("scroll", clearOnScroll);
    };
  }, [bibleBookId, bibleChapterNumber, searchedVerseKey]);
  useEffect(() => {
    const updateVoices = () => setSpeechVoices(window.speechSynthesis?.getVoices() ?? []);
    updateVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", updateVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", updateVoices);
  }, []);
  useEffect(() => {
    if (selectedVoiceURI && speechVoices.some((voice) => voice.voiceURI === selectedVoiceURI)) {
      window.localStorage.setItem("soundfaith-voice-uri", selectedVoiceURI);
    }
  }, [selectedVoiceURI, speechVoices]);
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
      speechRef.current = null;
    },
    [],
  );
  useEffect(() => {
    if (route !== "/prayer" && route !== "/readings" && route !== "/bible") stopSpeech();
  }, [route]);

  const stopSpeech = () => {
    continueBibleAudio.current = false;
    window.speechSynthesis?.cancel();
    speechRef.current = null;
    setIsSpeaking(false);
    setIsAudioPaused(false);
    setAudioProgressVisible(false);
  };
  const showAudioProgress = () => {
    if (audioProgressHideTimer.current !== null) window.clearTimeout(audioProgressHideTimer.current);
    if (isSpeaking) setAudioProgressVisible(true);
  };
  const hideAudioProgressSoon = () => {
    if (audioProgressHideTimer.current !== null) window.clearTimeout(audioProgressHideTimer.current);
    audioProgressHideTimer.current = window.setTimeout(() => setAudioProgressVisible(false), 1400);
  };
  const openSelector = () => {
    setDrawer(false);
    setSelectorClosing(false);
    setSelectorOpen(true);
  };
  const closeSelector = () => {
    if (!selectorOpen || selectorClosing) return;
    setSelectorClosing(true);
    window.setTimeout(() => {
      setSelectorOpen(false);
      setSelectorClosing(false);
    }, 220);
  };
  const openHour = (hour: Hour, dateOverride = selectedDate) => {
    stopSpeech();
    setSelectorOpen(false);
    setSelectorClosing(false);
    setSelectedDate(dateOverride);
    setMonth(dateOverride);
    setSelected(hour);
    setRoute("/prayer");
    setDrawer(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const navigatePrayer = (direction: 1 | -1) => {
    const index = hours.findIndex((hour) => hour.id === selected.id);
    const nextIndex = (index + direction + hours.length) % hours.length;
    const nextDate = new Date(selectedDate);
    if (
      (direction === 1 && index === hours.length - 1) ||
      (direction === -1 && index === 0)
    )
      nextDate.setDate(nextDate.getDate() + direction);
    openHour(hours[nextIndex], nextDate);
  };
  const goHome = () => {
    stopSpeech();
    const today = new Date();
    setSelectedDate(today);
    setMonth(today);
    setSelected(currentHour());
    setRoute("/");
  };
  const copyPrayer = async () => {
    await navigator.clipboard?.writeText(
      `${selected.label}\n\n${blocks.map((block) => `${block.heading}\n${block.text}`).join("\n\n")}`,
    );
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1800);
  };
  const copyReading = async () => {
    await navigator.clipboard?.writeText(audioText);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1800);
  };
  const decreaseFontSize = () => setFontSize((size) => Math.max(16, size - 1));
  const increaseFontSize = () => setFontSize((size) => Math.min(24, size + 1));
  const submitFeedback = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedbackSending(true);
    setFeedbackError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: feedbackName, email: feedbackEmail, message: feedbackMessage }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || "Feedback could not be sent.");
      }
      setFeedbackMessage("");
      setFeedbackOpen(false);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Feedback could not be sent right now. Please try again later.");
    } finally {
      setFeedbackSending(false);
    }
  };
  const shareLandingPage = async () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    if (navigator.share)
      await navigator.share({
        title: "Breviary",
        text: "A simple daily rhythm of prayer.",
        url,
      });
    else await navigator.clipboard?.writeText(url);
  };
  const speak = () => {
    if (!("speechSynthesis" in window) || !audioText) return;
    if (isSpeaking) {
      window.speechSynthesis.pause();
      setIsSpeaking(false);
      setIsAudioPaused(true);
      return;
    }
    if (speechRef.current && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsSpeaking(true);
      setIsAudioPaused(false);
      return;
    }
    continueBibleAudio.current = route === "/bible";
    startSpeech(audioText);
  };
  const firstDay =
    (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = Array.from(
    {
      length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    },
    (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1),
  );
  const previousHour =
    hours[
    (hours.findIndex((hour) => hour.id === selected.id) + hours.length - 1) %
    hours.length
    ];
  const nextHour =
    hours[
    (hours.findIndex((hour) => hour.id === selected.id) + 1) % hours.length
    ];
  const libraryData = useMemo(() => libraryItems(libraryTab), [libraryTab]);
  const libraryPageSize = 12;
  const libraryPageCount = Math.max(
    1,
    Math.ceil(libraryData.length / libraryPageSize),
  );
  const visibleLibraryItems = libraryData.slice(
    (libraryPage - 1) * libraryPageSize,
    libraryPage * libraryPageSize,
  );
  const openLibrary = () => {
    setRoute("/library");
    setDrawer(false);
    setLibraryPage(1);
  };
  const openMassReadings = (dateOverride = selectedDate) => {
    setSelectorOpen(false);
    setSelectorClosing(false);
    setSelectedDate(dateOverride);
    setMonth(dateOverride);
    setRoute("/readings");
    setDrawer(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openBible = () => {
    setSelectorOpen(false);
    setSelectorClosing(false);
    setRoute("/bible");
    setDrawer(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const bibleBook = bibleBookById.get(bibleBookId) ?? bibleBooks[0];
  const bibleChapterNumbers = bibleChapters(bibleBook);
  const bibleVerses = bibleChapter(bibleBook, bibleChapterNumber);
  const bibleSearchResults = useMemo(() => {
    const query = bibleSearchQuery.trim();
    if (!query) return [];
    const referenceMatch = query.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if (referenceMatch) {
      const book = bibleBooks.find((candidate) => candidate.name.toLowerCase() === referenceMatch[1].trim().toLowerCase());
      if (book) {
        const chapter = Number(referenceMatch[2]);
        const verseNumber = referenceMatch[3] ? Number(referenceMatch[3]) : undefined;
        const matches = book.verses.filter((verse) => verse.chapter === chapter && (verseNumber === undefined || verse.verse === verseNumber));
        return matches.slice(0, 20).map((verse) => ({ ...verse, bookId: book.id, bookName: book.name }));
      }
    }
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const results: Array<(typeof bibleBooks)[number]["verses"][number] & { bookId: string; bookName: string }> = [];
    for (const book of bibleBooks) {
      for (const verse of book.verses) {
        const text = verse.text.toLowerCase();
        if (words.every((word) => text.includes(word))) results.push({ ...verse, bookId: book.id, bookName: book.name });
        if (results.length >= 60) return results;
      }
    }
    return results;
  }, [bibleSearchQuery]);
  const bibleParagraphs = bibleVerses.reduce<Array<typeof bibleVerses>>((paragraphs, verse) => {
    const current = paragraphs[paragraphs.length - 1];
    if (!current || current[0].chapter !== verse.chapter || current[0].paragraph !== verse.paragraph) paragraphs.push([verse]);
    else current.push(verse);
    return paragraphs;
  }, []);
  const moveBibleChapter = (direction: 1 | -1) => {
    const currentIndex = bibleChapterNumbers.indexOf(bibleChapterNumber);
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < bibleChapterNumbers.length) {
      setBibleChapterNumber(bibleChapterNumbers[nextIndex]);
      return;
    }
    const bookIndex = bibleBooks.findIndex((book) => book.id === bibleBook.id);
    const nextBook = bibleBooks[bookIndex + direction];
    if (!nextBook) return;
    setBibleBookId(nextBook.id);
    const nextBookChapters = bibleChapters(nextBook);
    setBibleChapterNumber(direction === 1 ? nextBookChapters[0] : nextBookChapters[nextBookChapters.length - 1]);
    setExpandedTestament(bibleOldTestamentBooks.some((book) => book.id === nextBook.id) ? "old" : "new");
  };
  const moveBibleChapterWithAnimation = (direction: 1 | -1) => {
    setBibleSwipeDirection(direction === 1 ? "next" : "previous");
    moveBibleChapter(direction);
    window.setTimeout(() => setBibleSwipeDirection(null), 320);
  };
  const selectBibleBook = (bookId: string, testament: "old" | "new") => {
    setBibleBookId(bookId);
    setBibleChapterNumber(1);
    setExpandedTestament(testament);
  };
  const openBibleSearch = () => {
    setBibleSearchQuery("");
    setBibleSearchLimit(12);
    setBibleSearchOpen(true);
  };
  const closeBibleSearch = () => setBibleSearchOpen(false);
  const selectBibleSearchResult = (result: (typeof bibleSearchResults)[number]) => {
    setBibleBookId(result.bookId);
    setBibleChapterNumber(result.chapter);
    setSearchedVerseKey(`bible-verse-${result.bookId}-${result.chapter}-${result.verse}`);
    setBibleSearchOpen(false);
  };
  const selectedWeekday = dateText(selectedDate, { weekday: "long" });
  const compactReadingText = (text: string) =>
    text
      .replace(/\n{2,}/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const readableFontSize = fontSize - 2;
  const handleReaderTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length === 2) {
      const first = event.touches[0];
      const second = event.touches[1];
      const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
      pinchStartDistance.current = distance;
      pinchCurrentDistance.current = distance;
    }
  };
  const handleReaderTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 2 || pinchStartDistance.current === null) return;
    const first = event.touches[0];
    const second = event.touches[1];
    pinchCurrentDistance.current = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  };
  const handleReaderTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (pinchStartDistance.current === null) return;
    const distance = pinchCurrentDistance.current;
    if (distance !== null) {
      if (Math.abs(distance - pinchStartDistance.current) > 18) {
        setFontSize((size) => Math.min(24, Math.max(16, size + (distance > pinchStartDistance.current! ? 1 : -1))));
      }
    }
    pinchStartDistance.current = null;
    pinchCurrentDistance.current = null;
  };
  const audioText = route === "/prayer"
    ? blocks.map((block) => block.text).join(" ")
    : route === "/readings"
      ? Object.values(massReadings?.readings ?? {}).map((reading) => reading?.text ?? "").join(" ")
      : route === "/bible"
        ? bibleVerses.map((verse) => verse.text).join(" ")
        : "";
  const audioPaused = isAudioPaused && speechRef.current !== null;
  const audioButtonActive = isSpeaking || audioPaused;
  const startSpeech = (text: string, voiceURI = selectedVoiceURI, offset = 0) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const session = ++speechSession.current;
    const selectedVoice = speechVoices.find((voice) => voice.voiceURI === voiceURI);
    if (selectedVoice) utterance.voice = selectedVoice;
    setIsAudioPaused(false);
    setSpeechProgress(offset / Math.max(audioText.length, 1));
    utterance.onboundary = (event) => {
      if (event.name === "word" || event.name === "sentence") {
        setSpeechProgress(Math.min(1, (offset + event.charIndex) / Math.max(audioText.length, 1)));
      }
    };
    utterance.onend = () => {
      if (session !== speechSession.current || speechRef.current !== utterance) return;
      speechRef.current = null;
      if (route === "/bible" && continueBibleAudio.current) {
        const currentIndex = bibleChapterNumbers.indexOf(bibleChapterNumber);
        if (currentIndex < bibleChapterNumbers.length - 1) {
          const nextChapter = bibleChapterNumbers[currentIndex + 1];
          setBibleChapterNumber(nextChapter);
          startSpeech(bibleChapter(bibleBook, nextChapter).map((verse) => verse.text).join(" "), voiceURI, 0);
          return;
        }
        continueBibleAudio.current = false;
      }
      setSpeechProgress(1);
      setIsSpeaking(false);
      setIsAudioPaused(false);
      setAudioProgressVisible(false);
    };
    utterance.onerror = () => {
      if (session !== speechSession.current || speechRef.current !== utterance) return;
      speechRef.current = null;
      continueBibleAudio.current = false;
      setSpeechProgress(0);
      setIsSpeaking(false);
      setIsAudioPaused(false);
      setAudioProgressVisible(false);
    };
    speechRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };
  const seekSpeech = (value: number) => {
    if (!speechRef.current || !audioText) return;
    const offset = Math.floor(Math.min(1, Math.max(0, value)) * audioText.length);
    const remainingText = audioText.slice(offset).trimStart();
    if (!remainingText) return;
    const shouldContinueBible = route === "/bible";
    continueBibleAudio.current = shouldContinueBible;
    window.speechSynthesis.cancel();
    speechRef.current = null;
    setSpeechProgress(offset / audioText.length);
    startSpeech(remainingText, selectedVoiceURI, offset);
    showAudioProgress();
  };
  const updateSpeechSeek = (value: number) => {
    const nextValue = Math.min(1, Math.max(0, value));
    pendingSpeechSeek.current = nextValue;
    setSpeechProgress(nextValue);
  };
  const commitSpeechSeek = () => {
    if (pendingSpeechSeek.current === null) return;
    const value = pendingSpeechSeek.current;
    pendingSpeechSeek.current = null;
    seekSpeech(value);
  };
  const changeVoice = (voiceURI: string) => {
    setSelectedVoiceURI(voiceURI);
    if (!isSpeaking || !audioText) return;
    continueBibleAudio.current = route === "/bible";
    window.speechSynthesis.cancel();
    speechRef.current = null;
    startSpeech(audioText, voiceURI);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={goHome} aria-label="Return home">
          <span className="brand-mark">
            <Cross size={15} strokeWidth={2.5} />
          </span>
          <span>Breviary</span>
        </button>
        <div className="header-actions">
          <button
            className="header-menu-button"
            onClick={openSelector}
            aria-label={`Open ${route === "/bible" ? "books" : "calendar"}`}
          >
            {route === "/bible" ? <Library size={16} /> : <CalendarDays size={16} />}
            <span>{route === "/bible" ? "Books" : "Calendar"}</span>
          </button>
          <button
            className="icon-button"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>
        </div>
      </header>
      {route === "/" && (
        <main className="home-page">
          <section className="hero">
            <div className="eyebrow">
              <span className="eyebrow-dot" /> The SoundFaith Breviary
            </div>
            <h1>
              A quiet place
              <br />
              <em>to pray.</em>
            </h1>
            <p className="hero-copy">
              A simple daily rhythm of prayer, scripture, and the hours of the
              Church.
            </p>
            <button
              className="primary-button"
              onClick={() => openHour(todayHour, new Date())}
            >
              <BookOpen size={18} /> Pray {todayHour.label}
              <span className="button-arrow">→</span>
            </button>
            <div className="hero-note">
              <Clock3 size={15} /> It is time for{" "}
              <strong>{todayHour.label}</strong>
            </div>
          </section>
          <section className="hours-section">
            {/* breviary */}
            <div className="section-heading">
              <div>
                <span className="section-kicker">The daily office</span>
                <h2>Today’s hours</h2>
              </div>
            </div>
            <div className="hours-grid">
              {hours.map((hour) => {
                const Icon = hour.icon;
                return (
                  <button
                    className={`hour-card ${hour.id === todayHour.id ? "active" : ""}`}
                    key={hour.id}
                    onClick={() => openHour(hour, new Date())}
                  >
                    <div className="hour-card-icon">
                      <Icon size={18} />
                    </div>
                    <strong>{hour.label}</strong>
                    <span className="hour-caption">{hour.caption}</span>
                    <span className="hour-description">{hour.description}</span>
                    <span className="hour-time">{hour.time}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="hours-section">
            {/* readings and bible */}
            <div className="section-heading">
              <div>
                <span className="section-kicker">Holy Scripture</span>
                <h2>Readings & Bible</h2>
              </div>
            </div>
            <div className="hours-grid">
              <section className="landing-reading-card">
                <button
                  className="hour-card"
                  onClick={() => openMassReadings(new Date())}
                >
                  <div className="hour-card-icon">
                    <ScrollText size={18} />
                  </div>
                  <strong>Today’s readings</strong>
                  <span className="hour-caption">Mass readings</span>
                  <span className="hour-description">Read the Scripture proclaimed at Mass, with the first reading, Psalm, and Gospel.</span>
                  <span className="hour-time">
                    Today’s lectionary
                  </span>
                </button>
              </section>
              <section className="landing-reading-card">
                <button className="hour-card" onClick={openBible}>
                  <div className="hour-card-icon">
                    <BookMarked size={18} />
                  </div>
                  <strong>Read the Bible</strong>
                  <span className="hour-caption">Bible reading</span>
                  <span className="hour-description">Explore the books of the Bible one chapter at a time, at your own pace.</span>
                  <span className="hour-time">World English Bible</span>
                </button>
              </section>
            </div>
          </section>
        </main>
      )}
      {route === "/prayer" && (
        <main className="reader-page" onTouchStart={handleReaderTouchStart} onTouchMove={handleReaderTouchMove} onTouchEnd={handleReaderTouchEnd}>
          <div className="reader-toolbar">
            <button className="back-button" onClick={goHome}>
              <ChevronLeft size={17} /> Home
            </button>
            <div className="reader-actions">
              <button
                className="reader-action"
                onClick={copyPrayer}
                aria-label="Copy prayer"
                title="Copy prayer"
              >
                {isCopied ? <Check size={17} /> : <Copy size={17} />}
              </button>
              <button className="reader-action font-size-action" onClick={decreaseFontSize} disabled={fontSize <= 16} aria-label="Decrease text size" title="Decrease text size"><Type size={17} /></button>
              <button className="reader-action font-size-action" onClick={increaseFontSize} disabled={fontSize >= 24} aria-label="Increase text size" title="Increase text size"><Type size={21} /></button>
            </div>
          </div>
          <article
            className="prayer-content prayer-content--enter"
            style={{ fontSize: readableFontSize }}
          >
            <span className="section-kicker">
              {selected.time} ·{" "}
              {dateText(selectedDate, { month: "long", day: "numeric" })}
            </span>
            <h1>{selected.label}</h1>
            <p className="prayer-subtitle">
              {saint ? saint.name : "Saint of the day"} ·{" "}
              {saint ? "Memorial" : "Feria"}
              {saint?.shortBiography && (
                <small className="saint-bio">{saint.shortBiography}</small>
              )}
            </p>
            <div className="rule" />
            {blocks.map((block, index) => (
              <section
                className={`prayer-block ${block.kind === "reflection" ? "prayer-block--reflection" : ""}`}
                key={`${block.heading}-${index}`}
              >
                <div className="prayer-block-header">
                  <h2>{block.heading}</h2>
                </div>
                <p style={{ whiteSpace: "pre-line" }}>{block.text}</p>
              </section>
            ))}
          </article>
          <div className="reader-footer">
            <button className="text-button" onClick={() => navigatePrayer(-1)}>
              <ChevronLeft size={16} />{" "}
              <span>Previous: {previousHour.label}</span>
            </button>
            <div className={`audio-control ${audioProgressVisible ? "progress-visible" : ""}`} onMouseLeave={hideAudioProgressSoon}>
              <input className="audio-progress" style={{ "--audio-progress": speechProgress } as React.CSSProperties} type="range" min="0" max="1" step="0.01" value={speechProgress} onMouseEnter={showAudioProgress} onFocus={showAudioProgress} onPointerDown={showAudioProgress} onPointerUp={(event) => { commitSpeechSeek(); hideAudioProgressSoon(); }} onKeyUp={commitSpeechSeek} onChange={(event) => updateSpeechSeek(Number(event.target.value))} aria-label="Seek audio" />
              <button
                className={`audio-button ${isSpeaking ? "is-speaking" : ""} ${audioButtonActive ? "audio-session-active" : ""}`}
                onClick={speak}
                onMouseEnter={showAudioProgress}
                aria-label={isSpeaking ? "Pause reading" : audioPaused ? "Resume reading" : "Play reading"}
                title={isSpeaking ? "Pause reading" : audioPaused ? "Resume reading" : "Play reading"}
              >
                {isSpeaking ? (
                  <span className="equalizer" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                ) : audioPaused ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" />
                )}
              </button>
            </div>
            <button className="text-button" onClick={() => navigatePrayer(1)}>
              <span>Next: {nextHour.label}</span> <ChevronRight size={16} />
            </button>
          </div>
        </main>
      )}
      {false && (
        <main className="utility-page">
          <div className="utility-heading">
            <div>
              <span className="section-kicker">The liturgical year</span>
              <h1>Calendar</h1>
              <p>Every day has its own character.</p>
            </div>
          </div>
        </main>
      )}
      {route === "/readings" && (
        <main className="reader-page readings-page" onTouchStart={handleReaderTouchStart} onTouchMove={handleReaderTouchMove} onTouchEnd={handleReaderTouchEnd}>
          <div className="reader-toolbar">
            <button className="back-button" onClick={goHome}>
              <ChevronLeft size={17} /> Home
            </button>
            <div className="reader-actions">
              <button className="reader-action" onClick={copyReading} aria-label="Copy readings" title="Copy readings">
                {isCopied ? <Check size={17} /> : <Copy size={17} />}
              </button>
              <button className="reader-action font-size-action" onClick={decreaseFontSize} disabled={fontSize <= 16} aria-label="Decrease text size" title="Decrease text size"><Type size={17} /></button>
              <button className="reader-action font-size-action" onClick={increaseFontSize} disabled={fontSize >= 24} aria-label="Increase text size" title="Increase text size"><Type size={21} /></button>
            </div>
          </div>
          <article className="prayer-content prayer-content--enter" style={{ fontSize: readableFontSize }}>
            <span className="section-kicker">
              {massReadings?.season ?? "Mass readings"}
            </span>
            <h1>{selectedWeekday} readings</h1>
            <p className="prayer-subtitle">
              {massReadings
                ? dateText(selectedDate, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
                : "No local reading record for this date"}
            </p>
            <div className="rule" />
            {massReadings ? (
              Object.entries({
                firstReading: "First reading",
                psalm: "Responsorial Psalm",
                secondReading: "Second reading",
                gospel: "Gospel",
              }).map(([key, label]) => {
                const reading =
                  massReadings.readings[
                  key as keyof typeof massReadings.readings
                  ];
                return reading ? (
                  <section className="prayer-block" key={key}>
                    <div className="prayer-block-header">
                      <h2>{label}</h2>
                    </div>
                    <h3>{reading.reference}</h3>
                    <p>{compactReadingText(reading.text)}</p>
                  </section>
                ) : null;
              })
            ) : (
              <p>
                Readings are not available in the local schedule for this date.
              </p>
            )}
          </article>
          <div className="reader-footer">
            <div className={`audio-control ${audioProgressVisible ? "progress-visible" : ""}`} onMouseLeave={hideAudioProgressSoon}>
              <input className="audio-progress" style={{ "--audio-progress": speechProgress } as React.CSSProperties} type="range" min="0" max="1" step="0.01" value={speechProgress} onChange={(event) => updateSpeechSeek(Number(event.target.value))} onMouseEnter={showAudioProgress} onFocus={showAudioProgress} onPointerDown={showAudioProgress} onPointerUp={(event) => { commitSpeechSeek(); hideAudioProgressSoon(); }} onKeyUp={commitSpeechSeek} aria-label="Seek audio" />
              <button
                className="text-button"
                onClick={() =>
                  openMassReadings(new Date(selectedDate.getTime() - 86400000))
                }
              >
                <ChevronLeft size={16} /> Previous day
              </button>
            </div>
            <button
              className={`audio-button ${isSpeaking ? "is-speaking" : ""} ${audioButtonActive ? "audio-session-active" : ""}`}
              onClick={speak}
              onMouseEnter={showAudioProgress}
              aria-label={isSpeaking ? "Pause reading" : audioPaused ? "Resume reading" : "Play reading"}
              title={isSpeaking ? "Pause reading" : audioPaused ? "Resume reading" : "Play reading"}
            >
              {isSpeaking ? (
                <span className="equalizer" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              ) : audioPaused ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
            </button>
            <button
              className="text-button"
              onClick={() =>
                openMassReadings(new Date(selectedDate.getTime() + 86400000))
              }
            >
              Next day <ChevronRight size={16} />
            </button>
          </div>
        </main>
      )}
      {route === "/bible" && (
        <main className="reader-page bible-page" onTouchStart={handleReaderTouchStart} onTouchMove={handleReaderTouchMove} onTouchEnd={handleReaderTouchEnd}>
          <div className="reader-toolbar">
            <button className="back-button" onClick={goHome}>
              <ChevronLeft size={17} /> Home
            </button>
            <div className="reader-actions">
              <button className="reader-action" onClick={openBibleSearch} aria-label="Search Bible" title="Search Bible">
                <Search size={17} />
              </button>
              <button className="reader-action" onClick={copyReading} aria-label="Copy Bible text" title="Copy Bible text">
                {isCopied ? <Check size={17} /> : <Copy size={17} />}
              </button>
              <button className="reader-action font-size-action" onClick={decreaseFontSize} disabled={fontSize <= 16} aria-label="Decrease text size" title="Decrease text size"><Type size={17} /></button>
              <button className="reader-action font-size-action" onClick={increaseFontSize} disabled={fontSize >= 24} aria-label="Increase text size" title="Increase text size"><Type size={21} /></button>
            </div>
          </div>
          <article
            className={`prayer-content prayer-content--enter bible-reader ${bibleSwipeDirection ? `bible-swipe-${bibleSwipeDirection}` : ""}`}
            style={{ fontSize: readableFontSize }}
            onTouchStart={(event) => { bibleTouchStart.current = event.touches[0]?.clientX ?? null }}
            onTouchEnd={(event) => {
              if (bibleTouchStart.current === null) return
              const distance = (event.changedTouches[0]?.clientX ?? bibleTouchStart.current) - bibleTouchStart.current
              if (Math.abs(distance) > 55) moveBibleChapterWithAnimation(distance < 0 ? 1 : -1)
              bibleTouchStart.current = null
            }}
          >
            <span className="section-kicker">Scripture</span>
            <h1>{bibleBook.name} {bibleChapterNumber}</h1>
            <div className="rule" />
            <div className="bible-verses">{bibleParagraphs.map((paragraph, index) => <p key={`${bibleBook.id}-${bibleChapterNumber}-${index}`}>{paragraph.map((verse) => { const verseId = `bible-verse-${bibleBook.id}-${verse.chapter}-${verse.verse}`; return <span className={searchedVerseKey === verseId ? "bible-verse-highlight" : ""} id={verseId} key={verse.verse}><sup>{verse.verse}</sup>{verse.text} </span>; })}</p>)}</div>
          </article>
          <div className="reader-footer">
            <button className="text-button" onClick={() => moveBibleChapter(-1)}><ChevronLeft size={16} /> Previous chapter</button>
            <div className={`audio-control ${audioProgressVisible ? "progress-visible" : ""}`} onMouseLeave={hideAudioProgressSoon}>
              <input className="audio-progress" style={{ "--audio-progress": speechProgress } as React.CSSProperties} type="range" min="0" max="1" step="0.01" value={speechProgress} onChange={(event) => updateSpeechSeek(Number(event.target.value))} onMouseEnter={showAudioProgress} onFocus={showAudioProgress} onPointerDown={showAudioProgress} onPointerUp={(event) => { commitSpeechSeek(); hideAudioProgressSoon(); }} onKeyUp={commitSpeechSeek} aria-label="Seek audio" />
              <button
                className={`audio-button ${isSpeaking ? "is-speaking" : ""} ${audioButtonActive ? "audio-session-active" : ""}`}
                onClick={speak}
                onMouseEnter={showAudioProgress}
                aria-label={isSpeaking ? "Pause reading" : audioPaused ? "Resume reading" : "Play reading"}
                title={isSpeaking ? "Pause reading" : audioPaused ? "Resume reading" : "Play reading"}
              >
                {isSpeaking ? (
                  <span className="equalizer" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                ) : audioPaused ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" />
                )}
              </button>
            </div>
            <button className="text-button" onClick={() => moveBibleChapter(1)}>Next chapter <ChevronRight size={16} /></button>
          </div>
        </main>
      )}
      {bibleSearchOpen && route === "/bible" && (
        <>
          <div className="selector-backdrop" onClick={closeBibleSearch} />
          <section
            className="selector-modal bible-search-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Search Bible"
            onTouchStart={(event) => { bibleSearchTouchStart.current = event.touches[0]?.clientY ?? null; }}
            onTouchEnd={(event) => {
              if (bibleSearchTouchStart.current !== null && (event.changedTouches[0]?.clientY ?? bibleSearchTouchStart.current) - bibleSearchTouchStart.current > 55) closeBibleSearch();
              bibleSearchTouchStart.current = null;
            }}
          >
            <span className="selector-handle" aria-hidden="true" />
            <div className="selector-modal-header">
              <strong>Search Bible</strong>
              <button className="icon-button" onClick={closeBibleSearch} aria-label="Close Bible search"><X size={18} /></button>
            </div>
            <div className="bible-search-input">
              <Search size={17} aria-hidden="true" />
              <input
                autoFocus
                value={bibleSearchQuery}
                onChange={(event) => { setBibleSearchQuery(event.target.value); setBibleSearchLimit(12); }}
                onKeyDown={(event) => { if (event.key === "Enter") setBibleSearchLimit(12); }}
                placeholder="John 3:16 or God so loved"
                aria-label="Search Bible"
              />
            </div>
            {bibleSearchQuery.trim() && (
              <div className="bible-search-results">
                {bibleSearchResults.length === 0 ? <p className="bible-search-empty">No matches found.</p> : bibleSearchResults.slice(0, bibleSearchLimit).map((result) => (
                  <button className="bible-search-result" key={`${result.bookId}-${result.chapter}-${result.verse}`} onClick={() => selectBibleSearchResult(result)}>
                    <strong>{result.bookName} {result.chapter}:{result.verse}</strong>
                    <span>{result.text}</span>
                  </button>
                ))}
                {bibleSearchResults.length > bibleSearchLimit && <button className="bible-search-more" onClick={() => setBibleSearchLimit((limit) => limit + 12)}>Show more</button>}
              </div>
            )}
          </section>
        </>
      )}
      {route === "/library" && (
        <main className="utility-page library-page">
          <div className="utility-heading">
            <div>
              <span className="section-kicker">Source data</span>
              <h1>Library</h1>
              <p>Inspect every record used by the daily office.</p>
            </div>
          </div>
          <div className="library-tabs" role="tablist">
            {libraryTabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={libraryTab === tab.id}
                className={libraryTab === tab.id ? "active" : ""}
                onClick={() => {
                  setLibraryTab(tab.id);
                  setLibraryPage(1);
                }}
              >
                {tab.label}
                <small>{libraryItems(tab.id).length}</small>
              </button>
            ))}
          </div>
          <div className="reference-list">
            {visibleLibraryItems.map((item) => (
              <article
                className="reference-item library-reference"
                key={item.id}
              >
                <div className="reference-item-main">
                  <span className="section-kicker">{item.meta}</span>
                  <h2>{item.title}</h2>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="pagination-bar">
            <button
              className="page-button"
              disabled={libraryPage === 1}
              onClick={() => setLibraryPage((page) => page - 1)}
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <span>
              Page {libraryPage} of {libraryPageCount}
            </span>
            <button
              className="page-button"
              disabled={libraryPage === libraryPageCount}
              onClick={() => setLibraryPage((page) => page + 1)}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </main>
      )}
      {route === "/about" && (
        <main className="utility-page about-page">
          <div className="utility-heading">
            <div>
              <span className="section-kicker">A simpler rhythm</span>
              <h1>About the Breviary</h1>
              <p>A simplified daily office for the prayer of the laity.</p>
            </div>
          </div>
          <section className="about-content">
            <h2>What this is</h2>
            <p>
              This is a simplified breviary: a gentle way for lay people to pray
              with Scripture through the day. It is not the official Breviary or
              Liturgy of the Hours used by priests and clergy, but it can be
              prayed faithfully by anyone.
            </p>
            <h2>The Liturgy of the Hours</h2>
            <p>
              The official Liturgy of the Hours grew from the Church’s long
              tradition of sanctifying the day with prayer. Its purpose is to
              praise God, listen to his word, and join the prayer of the Church
              throughout the day. This simplified version keeps that purpose
              while making the rhythm easier to enter.
            </p>
            <p>
              The psalms remain at the heart of the prayer, so that the whole
              Psalter can be prayed across the cycle. The Church also encourages
              the faithful to take part in the liturgy and to spend time in
              personal prayer with Scripture, especially the Psalms.
            </p>
            <AboutSources />
            <h2>How each prayer is assembled</h2>
            <p>
              <strong>Lauds</strong> begins the day with an opening prayer, a
              seasonal antiphon, one psalm, a short Scripture reading, a
              reflection, the Benedictus, intercessions, a concluding prayer,
              and a blessing.
            </p>
            <p>
              <strong>Vespers</strong> offers a peaceful evening prayer with an
              opening verse, one short psalm, the Magnificat, a seasonal prayer,
              and a blessing.
            </p>
            <p>
              <strong>Compline</strong> closes the day simply with an opening
              verse, one night psalm, the Nunc Dimittis, and a blessing.
            </p>
            <h2>How to pray</h2>
            <ol>
              <li>
                Choose the prayer that fits the time of day, or begin with
                Lauds.
              </li>
              <li>
                Read slowly. Let one phrase from the psalm or Scripture stay
                with you.
              </li>
              <li>
                Use the reflection as a quiet invitation to prayer and daily
                action.
              </li>
              <li>
                Finish with the canticle, intercessions, concluding prayer, and
                blessing.
              </li>
              <li>Return each day. Regular prayer matters more than length.</li>
            </ol>
          </section>
        </main>
      )}
      {selectorOpen && (
        <>
          <div className="selector-backdrop" onClick={closeSelector} />
          <section
            className={`selector-modal ${selectorClosing ? "is-closing" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={route === "/bible" ? "Choose a Bible book" : "Choose a date"}
            tabIndex={-1}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeSelector();
            }}
            onTouchStart={(event) => {
              selectorTouchStart.current = event.touches[0]?.clientY ?? null;
            }}
            onTouchEnd={(event) => {
              if (selectorTouchStart.current === null) return;
              const distance = (event.changedTouches[0]?.clientY ?? selectorTouchStart.current) - selectorTouchStart.current;
              if (distance > 55) closeSelector();
              selectorTouchStart.current = null;
            }}
          >
            <span className="selector-handle" aria-hidden="true" />
            <div className="selector-modal-header">
              <strong>{route === "/bible" ? "Books" : "Calendar"}</strong>
              <button className="icon-button" onClick={closeSelector} aria-label="Close selector">
                <X size={18} />
              </button>
            </div>
            {route === "/bible" ? (
              <>
                <section className="bible-testament">
                  <button className="bible-testament-toggle" onClick={() => setExpandedTestament("old")} aria-expanded={expandedTestament === "old"}>
                    <span>Old Testament</span><ChevronRight size={15} className={expandedTestament === "old" ? "expanded" : ""} />
                  </button>
                  {expandedTestament === "old" && <div className="bible-book-pills">{bibleOldTestamentBooks.map((book) => <button className={book.id === bibleBook.id ? "selected" : ""} key={book.id} onClick={() => selectBibleBook(book.id, "old")}>{book.name}</button>)}</div>}
                </section>
                <section className="bible-testament">
                  <button className="bible-testament-toggle" onClick={() => setExpandedTestament("new")} aria-expanded={expandedTestament === "new"}>
                    <span>New Testament</span><ChevronRight size={15} className={expandedTestament === "new" ? "expanded" : ""} />
                  </button>
                  {expandedTestament === "new" && <div className="bible-book-pills">{bibleNewTestamentBooks.map((book) => <button className={book.id === bibleBook.id ? "selected" : ""} key={book.id} onClick={() => selectBibleBook(book.id, "new")}>{book.name}</button>)}</div>}
                </section>
                <div className="bible-chapter-pills"><span className="nav-label">Chapters</span><div>{bibleChapterNumbers.map((chapter) => <button className={chapter === bibleChapterNumber ? "selected" : ""} key={chapter} onClick={() => { setBibleChapterNumber(chapter); closeSelector(); }}>{chapter}</button>)}</div></div>
              </>
            ) : (
              <div className="drawer-calendar">
                <div className="drawer-calendar-header">
                  <button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={15} /></button>
                  <strong>{dateText(month, { month: "long", year: "numeric" })}</strong>
                  <button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={15} /></button>
                </div>
                <div className="weekday-row">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div>
                <div className="month-grid">
                  {Array.from({ length: firstDay }).map((_, index) => <span className="empty-day" key={`selector-empty-${index}`} />)}
                  {days.map((date) => <button key={date.toISOString()} className={`calendar-day ${dateKey(date) === dateKey(selectedDate) ? "selected" : ""}`} onClick={() => { setSelectedDate(date); setMonth(date); }}><span>{date.getDate()}</span></button>)}
                </div>
                <span className="nav-label">Pray</span>
                {hours.map((hour) => (
                  <button
                    key={hour.id}
                    className={`selector-action ${selected.id === hour.id && route === "/prayer" ? "current" : ""}`}
                    onClick={() => openHour(hour)}
                  >
                    <span>{hour.label}</span>
                    <small>{hour.time}</small>
                  </button>
                ))}
                <button className={`selector-action ${route === "/readings" ? "current" : ""}`} onClick={() => openMassReadings()}>
                  <span>Mass readings</span>
                  <small>Scripture</small>
                </button>
              </div>
            )}
          </section>
        </>
      )}
      {drawer && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
          <aside className="drawer">
            <div className="drawer-top">
              <button
                className="icon-button"
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="drawer-nav">
              {hours.map((hour) => {
                const Icon = hour.icon;
                return (
                  <button
                    key={hour.id}
                    onClick={() => openHour(hour, new Date())}
                    className={selected.id === hour.id && route === "/prayer" ? "current" : ""}
                  >
                    <Icon size={16} /> {hour.label}
                  </button>
                );
              })}
              <button
                onClick={() => openMassReadings(new Date())}
                className={route === "/readings" ? "current" : ""}
              >
                <ScrollText size={16} /> Readings
              </button>
              <button onClick={openBible} className={route === "/bible" ? "current" : ""}>
                <BookMarked size={16} /> Bible
              </button>
              <div className="drawer-menu-divider" />
              <button onClick={openLibrary}>
                <Library size={16} /> Library
              </button>
              <button
                onClick={() => {
                  setRoute("/about");
                  setDrawer(false);
                }}
              >
                <Info size={16} /> About
              </button>
            </nav>
            <div className="drawer-settings">
              <span className="nav-label">Settings</span>
              <label className="theme-switch">
                <span>{dark ? "Dark theme" : "Light theme"}</span>
                <input
                  type="checkbox"
                  checked={dark}
                  onChange={(event) => setDark(event.target.checked)}
                />
                <span className="switch-track" aria-hidden="true">
                  <span />
                </span>
              </label>
              <label>
                <span>Text size</span>
                <input
                  type="range"
                  min="16"
                  max="24"
                  value={fontSize}
                  onChange={(event) => setFontSize(Number(event.target.value))}
                />
              </label>
              {speechVoices.length > 0 && (
                <label className="voice-setting">
                  <span>Narrator</span>
                  <select
                    value={selectedVoiceURI}
                    onChange={(event) => changeVoice(event.target.value)}
                    aria-label="Narrator voice"
                  >
                    <option value="">Device default</option>
                    {speechVoices.map((voice) => (
                      <option value={voice.voiceURI} key={voice.voiceURI}>
                        {voice.name}{voice.lang ? ` · ${voice.lang}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </aside>
        </>
      )}
      {feedbackOpen && (
        <>
          <div className="selector-backdrop" onClick={() => setFeedbackOpen(false)} />
          <section className="selector-modal feedback-modal" role="dialog" aria-modal="true" aria-label="Send feedback">
            <span className="selector-handle" aria-hidden="true" />
            <div className="selector-modal-header">
              <div>
                <strong>Feedback</strong>
                <p className="feedback-intro">Help us make Breviary better.</p>
              </div>
              <button className="icon-button" onClick={() => setFeedbackOpen(false)} aria-label="Close feedback"><X size={18} /></button>
            </div>
            <form className="feedback-form" onSubmit={submitFeedback}>
              <label><span>Name <small>optional</small></span><input value={feedbackName} onChange={(event) => setFeedbackName(event.target.value)} /></label>
              <label><span>Email <small>optional</small></span><input type="email" value={feedbackEmail} onChange={(event) => setFeedbackEmail(event.target.value)} /></label>
              <label><span>Message</span><textarea required rows={5} value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} /></label>
              {feedbackError && <p className="feedback-error" role="alert">{feedbackError}</p>}
              <button className="feedback-submit" type="submit" disabled={feedbackSending}>{feedbackSending ? "Sending..." : "Send feedback"}</button>
            </form>
          </section>
        </>
      )}
      <footer className="site-footer">
        <div className="site-footer-brand">
          <a href="https://soundfaith.app" target="_blank" rel="noreferrer">© SoundFaith</a>
          <span>Prayer, Scripture, and the daily rhythm.</span>
        </div>
        <div className="site-footer-actions">
          <button className="site-footer-action" onClick={shareLandingPage}><Share2 size={16} /> Share</button>
          <button className="site-footer-action" onClick={() => setFeedbackOpen(true)}><MessageSquare size={16} /> Feedback</button>
        </div>
      </footer>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <button className={route === "/" ? "active" : ""} onClick={goHome}>
          <Home size={17} />
          <span>Home</span>
        </button>
        <button className={route === "/readings" ? "active" : ""} onClick={() => openMassReadings(new Date())}>
          <ScrollText size={17} />
          <span>Readings</span>
        </button>
        <button className={`mobile-hour-button ${route === "/prayer" ? "active" : ""}`} onClick={() => openHour(todayHour, new Date())}>
          <TodayHourIcon size={18} />
          <span>{todayHour.label}</span>
        </button>
        <button className={route === "/bible" ? "active" : ""} onClick={openBible}>
          <BookMarked size={17} />
          <span>Bible</span>
        </button>
        <button onClick={openSelector}>
          {route === "/bible" ? <Library size={17} /> : <CalendarDays size={17} />}
          <span>{route === "/bible" ? "Books" : "Calendar"}</span>
        </button>
      </nav>
    </div>
  );
}

export default AppExpanded;
