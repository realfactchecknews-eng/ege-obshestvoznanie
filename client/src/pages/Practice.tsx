import { useMemo, useState } from 'react'
import TaskCard from '../components/TaskCard'
import { tasks, TOPICS } from '../lib/data'
import { addAnswer, getAnswers, todayStr } from '../lib/storage'
import type { Task } from '../types'

export default function Practice({ initialTopics }: { initialTopics?: string[] }) {
  const [topic, setTopic] = useState<string>(
    initialTopics && initialTopics.length === 1 ? initialTopics[0] : 'all'
  )
  const [num, setNum] = useState<string>('all')
  const [part, setPart] = useState<'all' | '1' | '2'>('all')
  const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set())

  const taskNumbers = useMemo(
    () => [...new Set(tasks.map((t) => t.task_number))].sort((a, b) => a - b),
    []
  )

  const filtered: Task[] = useMemo(() => {
    return tasks.filter((t) => {
      if (initialTopics && initialTopics.length && !initialTopics.includes(t.topic)) return false
      if (topic !== 'all' && t.topic !== topic) return false
      if (num !== 'all' && t.task_number !== +num) return false
      if (part === '1' && t.task_number > 20) return false
      if (part === '2' && t.task_number <= 20) return false
      return true
    })
  }, [topic, num, part, initialTopics])

  const perNumberStats = useMemo(() => {
    const answers = getAnswers()
    const m = new Map<number, { c: number; t: number }>()
    for (const a of answers) {
      const cur = m.get(a.taskNumber) || { c: 0, t: 0 }
      cur.t++
      if (a.correct) cur.c++
      m.set(a.taskNumber, cur)
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answeredIds])

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

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Заголовок */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Задания</h1>
          <p className="text-text-soft text-sm mt-1">
            {tasks.length} реальных заданий в формате ЕГЭ · {filtered.length} по фильтру
          </p>
        </div>
      </div>

      {/* Баннер режима слабых тем */}
      {initialTopics && initialTopics.length > 0 && (
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
            <p className="text-sm text-text-soft mt-0.5">{initialTopics.join(', ')}</p>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="card p-4 flex flex-wrap gap-3 md:gap-4">
        <Select
          label="Раздел" value={topic} onChange={setTopic}
          options={[['all', 'Все разделы'], ...TOPICS.map((t) => [t, t] as [string, string])]}
        />
        <Select
          label="Номер задания" value={num} onChange={setNum}
          options={[['all', 'Любой'], ...taskNumbers.map((n) => [String(n), `№ ${n}`] as [string, string])]}
        />
        <Select
          label="Часть" value={part} onChange={(v) => setPart(v as 'all' | '1' | '2')}
          options={[['all', 'Все'], ['1', 'Часть 1 (1–20)'], ['2', 'Часть 2 (21–25)']]}
        />
      </div>

      {/* Пусто */}
      {filtered.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-muted">Нет заданий по выбранным фильтрам.</p>
          <p className="text-xs text-muted mt-1">Попробуй сбросить фильтры.</p>
        </div>
      )}

      {/* Лента */}
      <div className="space-y-5">
        {filtered.map((t) => {
          const s = perNumberStats.get(t.task_number)
          return (
            <div key={t.id}>
              {s && (
                <p className="text-xs text-muted mb-1.5 ml-1 flex items-center gap-2">
                  <span className="chip !px-2 !py-0.5 !text-[10px]">№ {t.task_number}</span>
                  <span>{s.c}/{s.t} верных по этому номеру</span>
                </p>
              )}
              <TaskCard task={t} onResult={(c) => record(t, c)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Select({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: [string, string][]
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm min-w-[160px]">
      <span className="text-muted text-xs font-medium uppercase tracking-wide">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-panel2 border border-border rounded-lg px-3 py-2 outline-none
                   focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all
                   hover:border-accent/40"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}
