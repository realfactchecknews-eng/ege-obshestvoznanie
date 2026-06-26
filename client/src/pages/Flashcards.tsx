import { useMemo, useState } from 'react'
import { terms, TOPICS } from '../lib/data'
import { getFlash, markFlash } from '../lib/storage'

export default function Flashcards() {
  const [topic, setTopic] = useState('all')
  const [flipped, setFlipped] = useState(false)
  const [idx, setIdx] = useState(0)
  const [version, setVersion] = useState(0) // для пересборки очереди

  // очередь: сначала «просроченные» по SRS, затем новые
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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Термины — карточки</h1>
        <p className="text-sm text-muted">
          Освоено: <span className="text-good font-semibold">{learned}</span> / {terms.length}
        </p>
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted text-xs">Раздел</span>
          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value)
              setIdx(0)
              setFlipped(false)
              setVersion((v) => v + 1)
            }}
            className="bg-bg border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
          >
            <option value="all">Все разделы</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-muted ml-auto">
          Карточка {queue.length ? (idx % queue.length) + 1 : 0} из {queue.length}
        </p>
      </div>

      {card ? (
        <div>
          <button
            onClick={() => setFlipped((f) => !f)}
            className="card w-full min-h-[220px] p-8 flex flex-col items-center justify-center text-center hover:border-accent transition-colors"
          >
            {!flipped ? (
              <>
                <p className="text-xs uppercase tracking-wide text-muted mb-3">Термин</p>
                <p className="text-2xl font-bold">{card.term}</p>
                <p className="text-sm text-muted mt-4">Нажми, чтобы увидеть определение</p>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-wide text-muted mb-3">Определение</p>
                <p className="text-lg leading-relaxed">{card.definition}</p>
              </>
            )}
          </button>

          {flipped && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                className="btn bg-bad/20 text-bad border border-bad/40 hover:bg-bad/30"
                onClick={() => next(false)}
              >
                Не знал
              </button>
              <button
                className="btn bg-good/20 text-good border border-good/40 hover:bg-good/30"
                onClick={() => next(true)}
              >
                Знал
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted text-center py-10">Нет карточек в этом разделе.</p>
      )}

      <p className="text-xs text-muted text-center">
        Карточки, которые ты не знал, вернутся раньше (интервальное повторение).
      </p>
    </div>
  )
}
