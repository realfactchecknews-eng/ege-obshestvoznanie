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
    // прокрутить наверх при старте нового варианта
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (started && !submitted) {
      timer.current = window.setInterval(() => {
        setLeft((l) => {
          if (l <= 1) {
            if (timer.current) window.clearInterval(timer.current)
            return 0
          }
          return l - 1
        })
      }, 1000)
      return () => {
        if (timer.current) window.clearInterval(timer.current)
      }
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
      if (t.type === 'written') continue
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const mm = String(Math.floor(left / 60) % 60).padStart(2, '0')
  const hh = String(Math.floor(left / 3600)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  const totalTasks = variant.length
  const answeredCount = Object.values(answers).filter(Boolean).length
  const progressPct = totalTasks ? Math.round((answeredCount / totalTasks) * 100) : 0
  const timerCritical = left < 600 // < 10 мин

  if (!started) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Вариант целиком</h1>
          <p className="text-text-soft text-sm mt-1">
            Полный экзамен в формате ЕГЭ
          </p>
        </div>

        <div className="card p-6 md:p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoItem label="Заданий" value={String(totalTasks || '~25')} />
            <InfoItem label="Время" value="3 ч 55 мин" />
            <InfoItem label="Часть 2" value="вручную" tone="warn" />
          </div>
          <p className="leading-relaxed text-text-soft">
            Будет собран вариант из доступных заданий (по одному на каждый номер).
            На решение даётся <span className="text-accent2 font-semibold">3 часа 55 минут</span>,
            как на реальном ЕГЭ. Задания части 2 (21–25) проверяются вручную по критериям ФИПИ.
          </p>
          <button className="btn-primary w-full sm:w-auto sm:px-8 py-3 text-base flex items-center justify-center gap-2" onClick={start}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Начать вариант
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Sticky header с таймером */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-base md:text-lg font-bold">Вариант ЕГЭ</h1>
            <p className="text-xs text-muted">
              Отвечено: <span className="text-accent2 font-semibold">{answeredCount}</span> / {totalTasks}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono
              ${timerCritical
                ? 'border-bad/40 bg-bad/10 text-bad animate-pulse-soft'
                : 'border-border bg-panel2 text-text'}`}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2 2M9 2h6M12 2v3" />
              </svg>
              <span className="text-base font-bold tabular-nums">
                {hh}:{mm}:{ss}
              </span>
            </div>
            {!submitted && (
              <button className="btn-primary" onClick={finish}>
                Завершить
              </button>
            )}
          </div>
        </div>
        {/* Прогресс */}
        {!submitted && (
          <div className="max-w-6xl mx-auto mt-2 h-1 rounded-full bg-panel2 overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>

      {/* Результат */}
      {submitted && result && (
        <div className="card p-6 md:p-8 space-y-5 shadow-soft-md border-accent/30">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Часть 1</p>
              <h2 className="text-2xl font-bold mt-1">
                <span className={result.score >= 14 ? 'text-good' : result.score >= 9 ? 'text-warn' : 'text-bad'}>
                  {result.score}
                </span>
                <span className="text-muted font-normal"> / {result.max} первичных</span>
              </h2>
              <p className="text-sm text-text-soft mt-1">
                {result.score >= 14 ? 'Отличный результат! Так держать.' :
                  result.score >= 9 ? 'Хорошо, но есть над чем поработать.' :
                  'Нужно больше практики. Используй раздел «Слабые места».'}
              </p>
            </div>
            <button className="btn-primary flex items-center gap-2" onClick={start}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
              </svg>
              Новый вариант
            </button>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs uppercase tracking-wide text-muted">По разделам</p>
            {Object.entries(result.byTopic).map(([topic, s]) => {
              const pct = Math.round((s.correct / s.total) * 100)
              const color = pct < 60 ? 'bg-bad' : pct < 80 ? 'bg-warn' : 'bg-good'
              const textColor = pct < 60 ? 'text-bad' : pct < 80 ? 'text-warn' : 'text-good'
              return (
                <div key={topic}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{topic}</span>
                    <span className={textColor + ' font-semibold'}>
                      {s.correct}/{s.total} <span className="opacity-70">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-panel2 overflow-hidden">
                    <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card p-3 bg-panel2 text-sm text-text-soft flex items-start gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-accent2 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p>
              Часть 2 (задания 21–25) оцените самостоятельно по критериям внутри каждого задания.
              Максимум за часть 2 — 24 балла, плюс мини-сочинение (задание 25) — до 6 баллов.
            </p>
          </div>
        </div>
      )}

      {/* Задания */}
      <div className="space-y-5">
        {variant.map((t, i) => (
          <div key={t.id}>
            <p className="text-xs text-muted mb-1.5 ml-1 flex items-center gap-2">
              <span className="font-mono text-accent2 font-semibold">№ {i + 1}</span>
              {answers[t.id] && !submitted && (
                <span className="text-good text-xs flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  отвечено
                </span>
              )}
            </p>
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
        <div className="sticky bottom-4 z-10">
          <button
            className="btn-primary w-full py-4 text-base shadow-accent"
            onClick={finish}
          >
            Завершить и проверить ({answeredCount}/{totalTasks})
          </button>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'good' }) {
  return (
    <div className="card p-3 text-center bg-panel2/50">
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-bold text-lg ${tone === 'warn' ? 'text-warn' : tone === 'good' ? 'text-good' : 'text-accent2'}`}>
        {value}
      </p>
    </div>
  )
}
