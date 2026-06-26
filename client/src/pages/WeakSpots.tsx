import { useMemo } from 'react'
import { getAnswers } from '../lib/storage'
import { TOPICS } from '../lib/data'

export default function WeakSpots({ practiceWeak }: { practiceWeak: (topics: string[]) => void }) {
  const answers = getAnswers()

  const rows = useMemo(() => {
    return TOPICS.map((topic) => {
      const a = answers.filter((x) => x.topic === topic)
      const c = a.filter((x) => x.correct).length
      const pct = a.length ? Math.round((c / a.length) * 100) : null
      return { topic, total: a.length, correct: c, pct }
    })
  }, [answers])

  const weak = rows.filter((r) => r.pct !== null && r.pct < 60).map((r) => r.topic)

  const byNumber = useMemo(() => {
    const m = new Map<number, { c: number; t: number }>()
    for (const a of answers) {
      const cur = m.get(a.taskNumber) || { c: 0, t: 0 }
      cur.t++
      if (a.correct) cur.c++
      m.set(a.taskNumber, cur)
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0])
  }, [answers])

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Слабые места</h1>
        <p className="text-text-soft text-sm mt-1">
          Аналитика на основе твоих ответов
        </p>
      </div>

      {answers.length === 0 && (
        <div className="card p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-panel2 text-muted flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 4 4 5-5" />
            </svg>
          </div>
          <p className="text-text-soft">Пока нет данных.</p>
          <p className="text-xs text-muted mt-1">Реши несколько заданий, и здесь появится аналитика.</p>
        </div>
      )}

      {/* По разделам */}
      {answers.length > 0 && (
        <div className="card p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Точность по разделам</h2>
            <p className="text-xs text-muted">% верных ответов</p>
          </div>
          {rows.map((r) => {
            const color = r.pct === null ? 'bg-muted/40' : r.pct < 60 ? 'bg-bad' : r.pct < 80 ? 'bg-warn' : 'bg-good'
            const textColor = r.pct === null ? 'text-muted' : r.pct < 60 ? 'text-bad' : r.pct < 80 ? 'text-warn' : 'text-good'
            return (
              <div key={r.topic}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className={`text-sm ${r.pct !== null && r.pct < 60 ? 'font-semibold text-bad' : 'font-medium'}`}>
                    {r.topic}
                  </span>
                  <span className={`text-sm font-semibold ${textColor}`}>
                    {r.pct === null ? <span className="text-muted font-normal">—</span> : `${r.pct}%`}
                    {r.pct !== null && (
                      <span className="text-muted font-normal text-xs ml-1.5">
                        ({r.correct}/{r.total})
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${r.pct ?? 0}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Кнопка тренировки слабых тем */}
      {weak.length > 0 && (
        <div className="card p-5 border-bad/30 bg-bad/5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-bad/15 text-bad flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-bad">Темы ниже 60%</h2>
              <p className="text-sm text-text-soft mt-1">{weak.join(', ')}</p>
            </div>
          </div>
          <button className="btn-primary bg-bad hover:bg-bad/90 w-full sm:w-auto shadow-[0_8px_24px_-8px_rgba(239,68,68,0.45)]" onClick={() => practiceWeak(weak)}>
            Тренировать слабые темы →
          </button>
        </div>
      )}

      {/* По номерам заданий */}
      {byNumber.length > 0 && (
        <div className="card p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Точность по номерам</h2>
            <p className="text-xs text-muted">по заданиям, которые ты решал</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
            {byNumber.map(([n, s]) => {
              const pct = Math.round((s.c / s.t) * 100)
              const tone = pct < 60 ? 'bad' : pct < 80 ? 'warn' : 'good'
              return (
                <div
                  key={n}
                  className={`rounded-xl p-3 text-center border-2 transition-all hover:scale-[1.02]
                    ${tone === 'bad' ? 'border-bad/30 bg-bad/5' :
                      tone === 'warn' ? 'border-warn/30 bg-warn/5' :
                      'border-good/30 bg-good/5'}`}
                >
                  <p className="text-xs text-muted">Задание</p>
                  <p className="text-2xl font-bold leading-tight">{n}</p>
                  <p className={`text-sm font-bold mt-1
                    ${tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-good'}`}>
                    {pct}%
                  </p>
                  <p className="text-xs text-muted">{s.c}/{s.t}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
