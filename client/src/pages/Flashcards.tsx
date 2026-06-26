import { useMemo, useState } from 'react'
import { terms, TOPICS } from '../lib/data'
import { getFlash, markFlash } from '../lib/storage'

export default function Flashcards() {
  const [topic, setTopic] = useState('all')
  const [flipped, setFlipped] = useState(false)
  const [idx, setIdx] = useState(0)
  const [version, setVersion] = useState(0)

  const queue = useMemo(() => {
    const flash = getFlash()
    const now = Date.now()
    const pool = terms.filter((t) => topic === 'all' || t.topic === topic)
    const due = pool.filter((t) => !flash[t.term] || flash[t.term].due <= now)
    const order = due.length ? due : pool
    return [...order].sort((a, b) => {
      const ba = flash[a.term]?.box ?? -1
      const bb = flash[b.term]?.box ?? -1
      return ba - bb
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, version])

  const card = queue[idx % Math.max(queue.length, 1)]

  function next(known: boolean) {
    if (card) markFlash(card.term, known)
    setFlipped(false)
    if (idx + 1 >= queue.length) {
      setIdx(0)
      setVersion((v) => v + 1)
    } else {
      setIdx((i) => i + 1)
    }
  }

  const flash = getFlash()
  const learned = terms.filter((t) => (flash[t.term]?.box ?? 0) >= 3).length
  const pct = terms.length ? Math.round((learned / terms.length) * 100) : 0
  const totalInTopic = topic === 'all' ? terms.length : terms.filter((t) => t.topic === topic).length

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Карточки терминов</h1>
          <p className="text-text-soft text-sm mt-1">
            Интервальное повторение · Leitner · {terms.length} терминов
          </p>
        </div>
        <div className="card px-4 py-2 flex items-center gap-3">
          <div>
            <p className="text-xs text-muted">Освоено</p>
            <p className="font-bold text-accent2">
              {learned} <span className="text-muted font-normal">/ {terms.length}</span>
            </p>
          </div>
          <div className="w-16 h-1.5 rounded-full bg-panel2 overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Фильтр + счётчик */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <label className="flex flex-col gap-1.5 text-sm min-w-[200px]">
          <span className="text-muted text-xs font-medium uppercase tracking-wide">Раздел</span>
          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value)
              setIdx(0)
              setFlipped(false)
              setVersion((v) => v + 1)
            }}
            className="bg-panel2 border border-border rounded-lg px-3 py-2 outline-none
                       focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
          >
            <option value="all">Все разделы</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted">Карточка</p>
          <p className="font-bold text-accent2">
            {queue.length ? (idx % queue.length) + 1 : 0}
            <span className="text-muted font-normal"> / {totalInTopic}</span>
          </p>
        </div>
      </div>

      {/* Карточка */}
      {card ? (
        <div className="space-y-4">
          <button
            onClick={() => setFlipped((f) => !f)}
            className="card w-full min-h-[260px] p-8 flex flex-col items-center justify-center text-center
                       hover:border-accent hover:shadow-accent transition-all group"
          >
            {!flipped ? (
              <>
                <span className="chip mb-4">Термин</span>
                <p className="text-3xl font-bold text-balance max-w-md">{card.term}</p>
                <p className="text-sm text-muted mt-6 flex items-center gap-2 group-hover:text-accent2 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                  Нажми, чтобы увидеть определение
                </p>
              </>
            ) : (
              <>
                <span className="chip mb-4">{card.topic}</span>
                <p className="text-lg leading-relaxed text-balance max-w-xl text-text">
                  {card.definition}
                </p>
                <p className="text-sm text-muted mt-6 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l7-7 7 7M12 19V5" />
                  </svg>
                  Нажми, чтобы перевернуть
                </p>
              </>
            )}
          </button>

          {flipped && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => next(false)}
                className="btn bg-bad/10 text-bad border border-bad/30 hover:bg-bad hover:text-white transition-all py-3 flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                Не знал
              </button>
              <button
                onClick={() => next(true)}
                className="btn bg-good/10 text-good border border-good/30 hover:bg-good hover:text-white transition-all py-3 flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Знал
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-muted">Нет карточек в этом разделе.</p>
        </div>
      )}

      <p className="text-xs text-muted text-center max-w-md mx-auto">
        Карточки, которые ты не знал, вернутся раньше — система сама выбирает интервал (от 1 минуты до 16 дней).
      </p>
    </div>
  )
}
