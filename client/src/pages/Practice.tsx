import { useMemo, useState } from 'react'
import TaskCard from '../components/TaskCard'
import { tasks, TOPICS } from '../lib/data'
import { addAnswer, getAnswers, todayStr } from '../lib/storage'
import type { Task } from '../types'

export default function Practice({ initialTopics }: { initialTopics?: string[] }) {
  const [topic, setTopic] = useState<string>(initialTopics && initialTopics.length === 1 ? initialTopics[0] : 'all')
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

  // статистика по номеру задания
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
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Задания</h1>
        <p className="text-muted text-sm">Найдено: {filtered.length}</p>
      </div>

      {initialTopics && initialTopics.length > 0 && (
        <div className="card p-3 bg-bad/10 border-bad/40 text-sm">
          Режим тренировки слабых тем: {initialTopics.join(', ')}
        </div>
      )}

      {/* фильтры */}
      <div className="card p-4 flex flex-wrap gap-3">
        <Select label="Раздел" value={topic} onChange={setTopic}
          options={[['all', 'Все разделы'], ...TOPICS.map((t) => [t, t] as [string, string])]} />
        <Select label="Номер задания" value={num} onChange={setNum}
          options={[['all', 'Любой'], ...taskNumbers.map((n) => [String(n), `№ ${n}`] as [string, string])]} />
        <Select label="Часть" value={part} onChange={(v) => setPart(v as 'all' | '1' | '2')}
          options={[['all', 'Все'], ['1', 'Часть 1 (1–20)'], ['2', 'Часть 2 (21–25)']]} />
      </div>

      {filtered.length === 0 && (
        <p className="text-muted text-center py-10">Нет заданий по выбранным фильтрам.</p>
      )}

      <div className="space-y-5">
        {filtered.map((t) => {
          const s = perNumberStats.get(t.task_number)
          return (
            <div key={t.id}>
              {s && (
                <p className="text-xs text-muted mb-1 ml-1">
                  Задание {t.task_number}: {s.c}/{s.t} верных
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
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: [string, string][]
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted text-xs">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-bg border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
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
