import { useEffect, useMemo, useRef, useState } from 'react'
import TaskCard from '../components/TaskCard'
import { buildVariant, checkAnswer } from '../lib/data'
import { addAnswer, addVariant, todayStr } from '../lib/storage'
import type { Task, VariantResult } from '../types'

const DURATION = 3 * 3600 + 55 * 60 // 3 ч 55 мин

export default function Variant() {
  const [started, setStarted] = useState(false)
  const [variant, setVariant] = useState<Task[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [left, setLeft] = useState(DURATION)
  const timer = useRef<number | null>(null)

  function start() {
    setVariant(buildVariant())
    setAnswers({})
    setSubmitted(false)
    setLeft(DURATION)
    setStarted(true)
  }

  useEffect(() => {
    if (started && !submitted) {
      timer.current = window.setInterval(() => {
        setLeft((l) => {
          if (l <= 1) {
            window.clearInterval(timer.current!)
            return 0
          }
          return l - 1
        })
      }, 1000)
      return () => window.clearInterval(timer.current!)
    }
  }, [started, submitted])

  useEffect(() => {
    if (left === 0 && started && !submitted) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left])

  const result = useMemo(() => {
    if (!submitted) return null
    const byTopic: Record<string, { correct: number; total: number }> = {}
    let score = 0
    let max = 0
    for (const t of variant) {
      if (t.type === 'written') continue // часть 2 оценивается вручную
      max++
      const ok = checkAnswer(t, answers[t.id] ?? '')
      if (ok) score++
      byTopic[t.topic] ??= { correct: 0, total: 0 }
      byTopic[t.topic].total++
      if (ok) byTopic[t.topic].correct++
    }
    return { score, max, byTopic }
  }, [submitted, variant, answers])

  function finish() {
    if (timer.current) window.clearInterval(timer.current)
    setSubmitted(true)
    // фиксируем результаты в общий прогресс
    for (const t of variant) {
      if (t.type === 'written') continue
      const ok = checkAnswer(t, answers[t.id] ?? '')
      addAnswer({
        taskId: t.id,
        taskNumber: t.task_number,
        topic: t.topic,
        correct: ok,
        date: todayStr(),
        ts: Date.now(),
      })
    }
    // сохраняем вариант
    const byTopic: Record<string, { correct: number; total: number }> = {}
    let score = 0,
      max = 0
    for (const t of variant) {
      if (t.type === 'written') continue
      max++
      const ok = checkAnswer(t, answers[t.id] ?? '')
      if (ok) score++
      byTopic[t.topic] ??= { correct: 0, total: 0 }
      byTopic[t.topic].total++
      if (ok) byTopic[t.topic].correct++
    }
    const v: VariantResult = {
      id: String(Date.now()),
      date: todayStr(),
      totalScore: score,
      maxScore: max,
      byTopic,
      durationSec: DURATION - left,
    }
    addVariant(v)
  }

  const mm = String(Math.floor(left / 60) % 60).padStart(2, '0')
  const hh = String(Math.floor(left / 3600)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  if (!started) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Вариант целиком</h1>
        <div className="card p-6 space-y-4">
          <p className="leading-relaxed">
            Будет собран вариант из доступных заданий (по одному на каждый номер). На решение даётся
            <span className="text-accent font-semibold"> 3 часа 55 минут</span>, как на реальном ЕГЭ.
            Задания части 2 (21–25) проверяются вручную по критериям ФИПИ.
          </p>
          <button className="btn-primary" onClick={start}>
            Начать вариант
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* шапка с таймером */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-bg/95 backdrop-blur border-b border-border flex items-center justify-between">
        <h1 className="text-xl font-bold">Вариант</h1>
        <div className="flex items-center gap-4">
          <span className={`font-mono text-lg ${left < 600 ? 'text-bad' : 'text-accent'}`}>
            {hh}:{mm}:{ss}
          </span>
          {!submitted && (
            <button className="btn-primary" onClick={finish}>
              Завершить
            </button>
          )}
        </div>
      </div>

      {submitted && result && (
        <div className="card p-6 space-y-4">
          <h2 className="text-xl font-bold">
            Результат части 1:{' '}
            <span className="text-accent">{result.score}</span> / {result.max} первичных баллов
          </h2>
          <div className="space-y-2">
            {Object.entries(result.byTopic).map(([topic, s]) => {
              const pct = Math.round((s.correct / s.total) * 100)
              return (
                <div key={topic}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{topic}</span>
                    <span className="text-muted">
                      {s.correct}/{s.total} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-bg overflow-hidden">
                    <div
                      className={`h-full ${pct < 60 ? 'bg-bad' : pct < 80 ? 'bg-warn' : 'bg-good'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-sm text-muted">
            Часть 2 (задания 21–25) оцените самостоятельно по критериям внутри каждого задания.
          </p>
          <button className="btn-ghost" onClick={start}>
            Новый вариант
          </button>
        </div>
      )}

      <div className="space-y-5">
        {variant.map((t, i) => (
          <div key={t.id}>
            <p className="text-xs text-muted mb-1 ml-1">№ {i + 1}</p>
            {submitted ? (
              <TaskCard task={t} />
            ) : (
              <TaskCard
                task={t}
                controlled
                onChange={(a) => setAnswers((prev) => ({ ...prev, [t.id]: a }))}
              />
            )}
          </div>
        ))}
      </div>

      {!submitted && (
        <button className="btn-primary w-full" onClick={finish}>
          Завершить и проверить
        </button>
      )}
    </div>
  )
}
