import { useState } from 'react'
import type { Task } from '../types'
import { checkAnswer } from '../lib/data'

interface Props {
  task: Task
  onResult?: (correct: boolean) => void
  // режим варианта: скрыть кнопку проверки, отдать ответ наружу
  controlled?: boolean
  onChange?: (answer: string) => void
}

export default function TaskCard({ task, onResult, controlled, onChange }: Props) {
  const [single, setSingle] = useState('')
  const [multi, setMulti] = useState<Set<number>>(new Set())
  const [matchSel, setMatchSel] = useState<number[]>(
    task.match_left ? Array(task.match_left.length).fill(0) : []
  )
  const [fill, setFill] = useState('')
  const [showModel, setShowModel] = useState(false)
  const [checkedCrit, setCheckedCrit] = useState<Set<number>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<boolean | null>(null)

  function buildAnswer(): string {
    if (task.type === 'single') return single
    if (task.type === 'fill') return fill
    if (task.type === 'multiple')
      return [...multi].sort((a, b) => a - b).map((i) => i + 1).join('')
    if (task.type === 'matching') return matchSel.join('')
    return ''
  }

  function emitChange(next?: Partial<{ single: string; multi: Set<number>; match: number[]; fill: string }>) {
    if (!controlled || !onChange) return
    // вычисляем ответ с учётом обновлённого состояния
    const s = next?.single ?? single
    const m = next?.multi ?? multi
    const mt = next?.match ?? matchSel
    const f = next?.fill ?? fill
    let ans = ''
    if (task.type === 'single') ans = s
    else if (task.type === 'fill') ans = f
    else if (task.type === 'multiple') ans = [...m].sort((a, b) => a - b).map((i) => i + 1).join('')
    else if (task.type === 'matching') ans = mt.join('')
    onChange(ans)
  }

  function handleSubmit() {
    const correct = checkAnswer(task, buildAnswer())
    setResult(correct)
    setSubmitted(true)
    onResult?.(correct)
  }

  const isWritten = task.type === 'written'
  const disabled = submitted || controlled

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
        <span className="px-2 py-1 rounded bg-accent/20 text-accent font-semibold">
          Задание {task.task_number}
        </span>
        <span className="px-2 py-1 rounded bg-panel2 text-muted">{task.topic}</span>
        <span className="px-2 py-1 rounded bg-panel2 text-muted">{task.subtopic}</span>
        <span className="ml-auto text-muted">{task.source}</span>
      </div>

      <p className="whitespace-pre-line leading-relaxed mb-4">{task.question}</p>

      {/* SINGLE */}
      {task.type === 'single' && (
        <div className="space-y-2">
          {task.options.map((opt) => {
            const sel = single === opt
            const isCorrect = submitted && opt === task.correct_answer
            const isWrong = submitted && sel && opt !== task.correct_answer
            return (
              <button
                key={opt}
                disabled={disabled}
                onClick={() => {
                  setSingle(opt)
                  emitChange({ single: opt })
                }}
                className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors ${
                  isCorrect
                    ? 'border-good bg-good/10'
                    : isWrong
                    ? 'border-bad bg-bad/10'
                    : sel
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-panel2 hover:border-accent/50'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {/* MULTIPLE */}
      {task.type === 'multiple' && (
        <div className="space-y-2">
          {task.options.map((opt, i) => {
            const sel = multi.has(i)
            const correctSet = task.correct_answer.split('').map((c) => +c - 1)
            const isCorrect = submitted && correctSet.includes(i)
            const isWrong = submitted && sel && !correctSet.includes(i)
            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => {
                  const n = new Set(multi)
                  n.has(i) ? n.delete(i) : n.add(i)
                  setMulti(n)
                  emitChange({ multi: n })
                }}
                className={`w-full text-left px-4 py-2.5 rounded-lg border flex gap-3 items-start transition-colors ${
                  isCorrect
                    ? 'border-good bg-good/10'
                    : isWrong
                    ? 'border-bad bg-bad/10'
                    : sel
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-panel2 hover:border-accent/50'
                }`}
              >
                <span className="font-mono text-muted">{i + 1}</span>
                <span>{opt}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* MATCHING */}
      {task.type === 'matching' && task.match_left && task.match_right && (
        <div className="space-y-2">
          <p className="text-xs text-muted mb-1">
            Сопоставьте каждому пункту слева вариант справа:
          </p>
          {task.match_right.map((r, i) => (
            <p key={i} className="text-sm text-muted">
              <span className="font-mono text-accent">{i + 1}</span> — {r}
            </p>
          ))}
          <div className="mt-3 space-y-2">
            {task.match_left.map((l, i) => {
              const correctSet = task.correct_answer.split('').map((c) => +c)
              const ok = submitted && matchSel[i] === correctSet[i]
              const bad = submitted && matchSel[i] !== correctSet[i]
              return (
                <div
                  key={i}
                  className={`flex gap-3 items-center px-3 py-2 rounded-lg border ${
                    ok ? 'border-good bg-good/10' : bad ? 'border-bad bg-bad/10' : 'border-border bg-panel2'
                  }`}
                >
                  <span className="font-mono text-muted">{String.fromCharCode(1040 + i)}</span>
                  <span className="flex-1 text-sm">{l}</span>
                  <select
                    disabled={disabled}
                    value={matchSel[i]}
                    onChange={(e) => {
                      const n = [...matchSel]
                      n[i] = +e.target.value
                      setMatchSel(n)
                      emitChange({ match: n })
                    }}
                    className="bg-bg border border-border rounded px-2 py-1 text-sm"
                  >
                    <option value={0}>—</option>
                    {task.match_right!.map((_, j) => (
                      <option key={j} value={j + 1}>
                        {j + 1}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FILL */}
      {task.type === 'fill' && (
        <input
          disabled={disabled}
          value={fill}
          onChange={(e) => {
            setFill(e.target.value)
            emitChange({ fill: e.target.value })
          }}
          placeholder="Введите ответ (одно слово)"
          className={`w-full px-4 py-2.5 rounded-lg border bg-panel2 outline-none ${
            submitted ? (result ? 'border-good' : 'border-bad') : 'border-border focus:border-accent'
          }`}
        />
      )}

      {/* WRITTEN (part 2) */}
      {isWritten && (
        <div className="space-y-4">
          <textarea
            rows={6}
            placeholder="Введите развёрнутый ответ..."
            className="w-full px-4 py-3 rounded-lg border border-border bg-panel2 outline-none focus:border-accent resize-y"
          />
          <button className="btn-ghost" onClick={() => setShowModel((v) => !v)}>
            {showModel ? 'Скрыть' : 'Показать'} эталонный ответ и критерии
          </button>
          {showModel && (
            <div className="space-y-3">
              <div className="card p-4 bg-panel2">
                <p className="text-xs uppercase tracking-wide text-muted mb-2">
                  Эталонный ответ
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed">
                  {task.correct_answer}
                </p>
              </div>
              {task.criteria && (
                <div className="card p-4 bg-panel2">
                  <p className="text-xs uppercase tracking-wide text-muted mb-2">
                    Критерии ФИПИ — отметьте, что выполнено
                  </p>
                  <div className="space-y-2">
                    {task.criteria.map((c, i) => (
                      <label key={i} className="flex gap-2 items-start cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          className="mt-1 accent-[#7c5cff]"
                          checked={checkedCrit.has(i)}
                          onChange={() => {
                            const n = new Set(checkedCrit)
                            n.has(i) ? n.delete(i) : n.add(i)
                            setCheckedCrit(n)
                          }}
                        />
                        <span className={checkedCrit.has(i) ? 'text-good' : ''}>{c}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-3">
                    Выполнено критериев: {checkedCrit.size} из {task.criteria.length}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTROLS */}
      {!controlled && !isWritten && (
        <div className="mt-4 flex items-center gap-3">
          {!submitted ? (
            <button className="btn-primary" onClick={handleSubmit}>
              Проверить
            </button>
          ) : (
            <span
              className={`font-semibold ${result ? 'text-good' : 'text-bad'}`}
            >
              {result ? '✓ Верно' : '✗ Неверно'}
            </span>
          )}
        </div>
      )}

      {/* EXPLANATION */}
      {submitted && !controlled && (
        <div className="mt-4 card p-4 bg-panel2">
          {!result && task.type !== 'fill' && task.type !== 'single' && (
            <p className="text-sm mb-2">
              <span className="text-muted">Правильный ответ: </span>
              <span className="font-mono text-good">{task.correct_answer}</span>
            </p>
          )}
          {!result && (task.type === 'fill' || (task.type === 'single' && task.options_letters === false)) && (
            <p className="text-sm mb-2">
              <span className="text-muted">Правильный ответ: </span>
              <span className="text-good">{task.correct_answer}</span>
            </p>
          )}
          <p className="text-sm leading-relaxed whitespace-pre-line">
            <span className="text-muted">Пояснение: </span>
            {task.explanation}
          </p>
        </div>
      )}
    </div>
  )
}
