import { useEffect, useMemo, useState } from 'react'
import TaskCard from '../components/TaskCard'
import { tasks, TOPICS } from '../lib/data'
import { addAnswer, getAnswers, todayStr } from '../lib/storage'
import type { Task } from '../types'

/**
 * Вкладка «Задания»: колоды по номерам ЕГЭ (№1–№25).
 * Сначала выбираешь колоду, внутри — задания этого номера по порядку.
 * Фильтр по разделу — по желанию, влияет и на колоды, и на список.
 */
export default function Practice({ initialTopics, openTaskId }: { initialTopics?: string[]; openTaskId?: number }) {
  const [topic, setTopic] = useState<string>(
    initialTopics && initialTopics.length === 1 ? initialTopics[0] : 'all'
  )
  const [deck, setDeck] = useState<number | null>(null)

  // Переход из админки по конкретному заданию: открыть его колоду и проскроллить к нему
  useEffect(() => {
    if (!openTaskId) return
    const t = tasks.find((x) => x.id === openTaskId)
    if (!t) return
    setDeck(t.task_number)
    setTimeout(() => {
      document.getElementById(`task-${openTaskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }, [openTaskId])
  const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set())

  // Режим «слабые темы» (переход со страницы Слабые места) — плоский список по разделам
  const weakMode = !!(initialTopics && initialTopics.length)

  // Задания с учётом фильтра раздела
  const byTopicFilter: Task[] = useMemo(() => {
    return tasks.filter((t) => {
      if (weakMode && !initialTopics!.includes(t.topic)) return false
      if (!weakMode && topic !== 'all' && t.topic !== topic) return false
      return true
    })
  }, [topic, initialTopics, weakMode])

  // Решённые задания (уникальные id с верным ответом) — по всей истории
  const solvedIds = useMemo(() => {
    const s = new Set<number>()
    for (const a of getAnswers()) if (a.correct) s.add(a.taskId)
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answeredIds])

  // Колоды: номер → { всего, решено }
  const decks = useMemo(() => {
    const m = new Map<number, { total: number; solved: number }>()
    for (const t of byTopicFilter) {
      const cur = m.get(t.task_number) ?? { total: 0, solved: 0 }
      cur.total++
      if (solvedIds.has(t.id)) cur.solved++
      m.set(t.task_number, cur)
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0])
  }, [byTopicFilter, solvedIds])

  // Задания текущей колоды — по порядку (id = порядок добавления: сначала ФИПИ, потом варианты 1→30)
  const deckTasks: Task[] = useMemo(() => {
    if (deck === null) return []
    return byTopicFilter.filter((t) => t.task_number === deck).sort((a, b) => a.id - b.id)
  }, [deck, byTopicFilter])

  function record(task: Task, correct: boolean) {
    if (answeredIds.has(task.id)) return
    addAnswer({
      taskId: task.id,
      taskNumber: task.task_number,
      topic: task.topic,
      correct,
      date: todayStr(),
      ts: Date.now(),
    })
    setAnsweredIds((s) => new Set(s).add(task.id))
  }

  const totalSolved = decks.reduce((s, [, d]) => s + d.solved, 0)

  // ===== Режим слабых тем: плоский список, как раньше =====
  if (weakMode) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Задания</h1>
          <p className="text-text-soft text-sm mt-1">{byTopicFilter.length} заданий по слабым темам</p>
        </div>
        <div className="card p-4 bg-bad/5 border-bad/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-bad/15 text-bad flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-bad">Режим тренировки слабых тем</p>
            <p className="text-sm text-text-soft mt-0.5">{initialTopics!.join(', ')}</p>
          </div>
        </div>
        <div className="space-y-5">
          {byTopicFilter.map((t, i) => (
            <div key={t.id} className="animate-slide-up" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
              <TaskCard task={t} onResult={(c) => record(t, c)} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ===== Внутри колоды =====
  if (deck !== null) {
    const info = decks.find(([n]) => n === deck)?.[1]
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setDeck(null)} className="btn-ghost flex items-center gap-2 !px-3">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Все колоды
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Задание № {deck}</h1>
            <p className="text-text-soft text-sm mt-0.5">
              решено {info?.solved ?? 0} из {info?.total ?? 0}
              {topic !== 'all' && <> · раздел «{topic}»</>}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {deckTasks.map((t, i) => (
            <div
              key={t.id}
              id={`task-${t.id}`}
              className={`animate-slide-up ${t.id === openTaskId ? 'ring-2 ring-accent rounded-xl' : ''}`}
              style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
            >
              {solvedIds.has(t.id) && (
                <p className="text-xs text-good mb-1.5 ml-1 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  уже решал верно
                </p>
              )}
              <TaskCard task={t} onResult={(c) => record(t, c)} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ===== Экран выбора колоды =====
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Задания</h1>
          <p className="text-text-soft text-sm mt-1">
            {byTopicFilter.length} заданий · решено {totalSolved}
          </p>
        </div>
        {/* Фильтр по разделу — по желанию */}
        <label className="flex flex-col gap-1.5 text-sm min-w-[180px]">
          <span className="text-muted text-xs font-medium uppercase tracking-wide">Раздел (необязательно)</span>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="bg-panel2 border border-border rounded-lg px-3 py-2 outline-none
                       focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all hover:border-accent/40"
          >
            <option value="all">Все разделы</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {decks.map(([num, d], i) => {
          const pct = d.total ? Math.round((d.solved / d.total) * 100) : 0
          const done = d.solved >= d.total && d.total > 0
          return (
            <button
              key={num}
              onClick={() => setDeck(num)}
              className={`card p-4 text-left group lift-on-hover hover:shadow-soft-md hover:border-accent/40 animate-pop-in
                ${done ? 'border-good/40 bg-good/5' : ''}`}
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-lg font-bold ${done ? 'text-good' : 'text-accent2'}`}>№ {num}</span>
                {done && (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-good" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-muted mb-2">
                решено <span className="font-semibold text-text">{d.solved}</span> из {d.total}
              </p>
              <div className="h-1.5 rounded-full bg-panel2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-width duration-500 ${done ? 'bg-good' : 'bg-accent'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
