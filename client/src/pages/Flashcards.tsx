import { useMemo, useState } from 'react'
import { terms, TOPICS } from '../lib/data'
import { getFlash, markFlash } from '../lib/storage'

// Цветовые акценты колод по блокам
const DECK_META: Record<string, { short: string; hue: string }> = {
  'Человек и общество': { short: 'Человек', hue: '#4ade80' },
  'Духовная культура': { short: 'Культура', hue: '#22d3ee' },
  'Экономика': { short: 'Экономика', hue: '#fbbf24' },
  'Социальные отношения': { short: 'Социум', hue: '#f472b6' },
  'Политика': { short: 'Политика', hue: '#a78bfa' },
  'Право': { short: 'Право', hue: '#60a5fa' },
}

export default function Flashcards() {
  // выбранная колода: null = экран выбора колод, 'all' или название блока = режим изучения
  const [deck, setDeck] = useState<string | null>(null)

  if (deck === null) return <DeckPicker onPick={setDeck} />
  return <StudyMode deck={deck} onExit={() => setDeck(null)} />
}

/* ============================================================
   Экран выбора колоды
   ============================================================ */
function DeckPicker({ onPick }: { onPick: (deck: string) => void }) {
  const flash = getFlash()
  const masteredOf = (pool: typeof terms) =>
    pool.filter((t) => (flash[t.term]?.box ?? 0) >= 3).length

  const totalMastered = masteredOf(terms)

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Карточки терминов</h1>
          <p className="text-text-soft text-sm mt-1">
            Колоды по блокам · интервальное повторение (Leitner) · {terms.length} терминов
          </p>
        </div>
        <div className="card px-4 py-2 flex items-center gap-3">
          <div>
            <p className="text-xs text-muted">Освоено всего</p>
            <p className="font-bold text-accent2">
              {totalMastered} <span className="text-muted font-normal">/ {terms.length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Колода «Все термины» */}
      <button
        onClick={() => onPick('all')}
        className="card-hover w-full p-5 flex items-center gap-4 text-left bg-gradient-hero"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="6" width="14" height="14" rx="2" />
            <rect x="7" y="3" width="14" height="14" rx="2" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold">Все термины</p>
          <p className="text-sm text-text-soft">Перемешанная колода из всех блоков — {terms.length} карточек</p>
        </div>
        <Progress value={totalMastered} max={terms.length} />
      </button>

      {/* Колоды по блокам */}
      <div className="grid sm:grid-cols-2 gap-3">
        {TOPICS.map((topic) => {
          const pool = terms.filter((t) => t.topic === topic)
          const mastered = masteredOf(pool)
          const meta = DECK_META[topic]
          return (
            <button
              key={topic}
              onClick={() => onPick(topic)}
              className="card-hover p-5 text-left flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shrink-0"
                  style={{ backgroundColor: meta?.hue ?? '#4ade80' }}
                >
                  {meta?.short.charAt(0) ?? '•'}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{topic}</p>
                  <p className="text-xs text-muted">{pool.length} терминов</p>
                </div>
              </div>
              <Progress value={mastered} max={pool.length} hue={meta?.hue} />
            </button>
          )
        })}
      </div>

      <p className="text-xs text-muted text-center max-w-md mx-auto">
        «Освоено» — карточка попала в 3-ю коробку Лейтнера и выше. Неизвестные карточки возвращаются раньше.
      </p>
    </div>
  )
}

function Progress({ value, max, hue }: { value: number; max: number; hue?: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted mb-1">
        <span>освоено</span>
        <span className="font-medium text-text-soft">{value}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-panel2 overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: hue ?? 'var(--accent)' }} />
      </div>
    </div>
  )
}

/* ============================================================
   Режим изучения колоды
   ============================================================ */
function StudyMode({ deck, onExit }: { deck: string; onExit: () => void }) {
  const [flipped, setFlipped] = useState(false)
  const [idx, setIdx] = useState(0)
  const [version, setVersion] = useState(0)
  const [session, setSession] = useState({ known: 0, unknown: 0 })

  const title = deck === 'all' ? 'Все термины' : deck

  // очередь: сначала «просроченные» по SRS, затем по номеру коробки
  const queue = useMemo(() => {
    const flash = getFlash()
    const now = Date.now()
    const pool = terms.filter((t) => deck === 'all' || t.topic === deck)
    const due = pool.filter((t) => !flash[t.term] || flash[t.term].due <= now)
    const order = due.length ? due : pool
    return [...order].sort((a, b) => (flash[a.term]?.box ?? -1) - (flash[b.term]?.box ?? -1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, version])

  const card = queue[idx % Math.max(queue.length, 1)]
  const total = terms.filter((t) => deck === 'all' || t.topic === deck).length

  function next(known: boolean) {
    if (card) markFlash(card.term, known)
    setSession((s) => ({
      known: s.known + (known ? 1 : 0),
      unknown: s.unknown + (known ? 0 : 1),
    }))
    setFlipped(false)
    if (idx + 1 >= queue.length) {
      setIdx(0)
      setVersion((v) => v + 1)
    } else {
      setIdx((i) => i + 1)
    }
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Шапка с кнопкой назад */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={onExit} className="btn-ghost flex items-center gap-2 text-sm py-1.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Все колоды
        </button>
        <div className="flex items-center gap-3 text-sm">
          <span className="chip" style={{ color: 'var(--good)' }}>✓ {session.known}</span>
          <span className="chip" style={{ color: 'var(--bad)' }}>✗ {session.unknown}</span>
        </div>
      </div>

      <div>
        <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
        <p className="text-text-soft text-sm mt-1">
          Карточка {queue.length ? (idx % queue.length) + 1 : 0} из {queue.length} · в колоде {total}
        </p>
      </div>

      {card ? (
        <div className="space-y-4">
          <button
            onClick={() => setFlipped((f) => !f)}
            className="card w-full min-h-[260px] p-8 flex flex-col items-center justify-center text-center hover:border-accent hover:shadow-accent transition-all group"
          >
            {!flipped ? (
              <>
                <span className="chip mb-4">Термин</span>
                <p className="text-3xl font-bold text-balance max-w-md">{card.term}</p>
                <p className="text-sm text-muted mt-6 group-hover:text-accent2 transition-colors">
                  Нажми, чтобы увидеть определение
                </p>
              </>
            ) : (
              <>
                <span className="chip mb-4">{card.topic}</span>
                <p className="text-lg leading-relaxed text-balance max-w-xl text-text">{card.definition}</p>
                <p className="text-sm text-muted mt-6">Нажми, чтобы перевернуть</p>
              </>
            )}
          </button>

          {flipped && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => next(false)}
                className="btn bg-bad/10 text-bad border border-bad/30 hover:bg-bad hover:text-white transition-all py-3"
              >
                Не знал
              </button>
              <button
                onClick={() => next(true)}
                className="btn bg-good/10 text-good border border-good/30 hover:bg-good hover:text-white transition-all py-3"
              >
                Знал
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-muted">Нет карточек в этой колоде.</p>
        </div>
      )}

      <p className="text-xs text-muted text-center max-w-md mx-auto">
        Система сама выбирает интервал повторения (от 1 минуты до 16 дней).
      </p>
    </div>
  )
}
