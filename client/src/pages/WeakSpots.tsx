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

  // по номеру задания
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Слабые места</h1>

      {answers.length === 0 && (
        <p className="text-muted">Пока нет данных. Реши несколько заданий, и здесь появится аналитика.</p>
      )}

      {/* по разделам */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold">Точность по разделам</h2>
        {rows.map((r) => (
          <div key={r.topic}>
            <div className="flex justify-between text-sm mb-1">
              <span className={r.pct !== null && r.pct < 60 ? 'text-bad font-medium' : ''}>
                {r.topic}
              </span>
              <span className="text-muted">
                {r.pct === null ? 'нет данных' : `${r.pct}% · ${r.correct}/${r.total}`}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-bg overflow-hidden">
              <div
                className={`h-full ${
                  r.pct === null ? '' : r.pct < 60 ? 'bg-bad' : r.pct < 80 ? 'bg-warn' : 'bg-good'
                }`}
                style={{ width: `${r.pct ?? 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {weak.length > 0 && (
        <div className="card p-5 border-bad/40">
          <h2 className="font-semibold text-bad mb-2">Темы ниже 60%</h2>
          <p className="text-sm text-muted mb-4">{weak.join(', ')}</p>
          <button className="btn-primary" onClick={() => practiceWeak(weak)}>
            Тренировать слабые темы
          </button>
        </div>
      )}

      {/* по номерам заданий */}
      {byNumber.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Точность по номерам заданий</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {byNumber.map(([n, s]) => {
              const pct = Math.round((s.c / s.t) * 100)
              return (
                <div
                  key={n}
                  className={`rounded-lg p-3 text-center border ${
                    pct < 60 ? 'border-bad/50 bg-bad/10' : pct < 80 ? 'border-warn/40 bg-warn/10' : 'border-good/40 bg-good/10'
                  }`}
                >
                  <p className="text-xs text-muted">Задание {n}</p>
                  <p className="font-bold">{pct}%</p>
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
