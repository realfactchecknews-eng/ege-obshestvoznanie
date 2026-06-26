import { useState } from 'react'
import type { Task } from '../types'
import { checkAnswer } from '../lib/data'
import { checkEssay, aiAvailable, type EssayCheck } from '../lib/ai'

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
  // письменные задания + ИИ-проверка
  const [written, setWritten] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiResult, setAiResult] = useState<EssayCheck | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  async function runAiCheck() {
    setAiError(null)
    setAiBusy(true)
    try {
      const res = await checkEssay(task, written)
      setAiResult(res)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiBusy(false)
    }
  }

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
  const isPart2 = task.task_number > 20
  const disabled = submitted || controlled

  return (
    <div className={`card p-5 md:p-6 transition-shadow ${submitted && !controlled ? 'shadow-soft-md' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="chip">
          <span className="font-mono font-bold">№ {task.task_number}</span>
        </span>
        <span className="text-xs text-text-soft font-medium">{task.topic}</span>
        <span className="text-xs text-muted">·</span>
        <span className="text-xs text-muted">{task.subtopic}</span>
        {isPart2 && (
          <span className="chip !bg-warn/15 !text-warn !border-warn/30">Часть 2</span>
        )}
        {task.source && (
          <span className="ml-auto text-xs text-muted hidden sm:inline">{task.source}</span>
        )}
      </div>

      {/* Question */}
      <div className="mb-4">
        <p className="whitespace-pre-line leading-relaxed text-[15px] md:text-base">
          {task.question}
        </p>
      </div>

      {/* SINGLE */}
      {task.type === 'single' && (
        <div className="space-y-2">
          {task.options.map((opt, i) => {
            const sel = single === opt
            const isCorrect = submitted && opt === task.correct_answer
            const isWrong = submitted && sel && opt !== task.correct_answer
            const showLetter = task.options_letters !== false
            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => {
                  setSingle(opt)
                  emitChange({ single: opt })
                }}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all flex items-start gap-3
                  ${isCorrect
                    ? 'border-good bg-good/10 shadow-[0_0_0_1px_rgba(52,211,153,0.3)]'
                    : isWrong
                    ? 'border-bad bg-bad/10'
                    : sel
                    ? 'border-accent bg-accent-soft'
                    : 'border-border bg-panel2 hover:border-accent/50 hover:bg-panel'}`}
              >
                {showLetter && (
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                    ${isCorrect ? 'bg-good text-white' :
                      isWrong ? 'bg-bad text-white' :
                      sel ? 'bg-accent text-white' : 'bg-panel border border-border text-text-soft'}`}>
                    {String.fromCharCode(1040 + i)}
                  </span>
                )}
                <span className="flex-1 pt-0.5">{opt}</span>
                {isCorrect && (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-good shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isWrong && (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-bad shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* MULTIPLE */}
      {task.type === 'multiple' && (
        <div className="space-y-2">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Выбери несколько вариантов
          </p>
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
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all flex items-start gap-3
                  ${isCorrect
                    ? 'border-good bg-good/10'
                    : isWrong
                    ? 'border-bad bg-bad/10'
                    : sel
                    ? 'border-accent bg-accent-soft'
                    : 'border-border bg-panel2 hover:border-accent/50 hover:bg-panel'}`}
              >
                <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                  ${isCorrect ? 'bg-good text-white' :
                    isWrong ? 'bg-bad text-white' :
                    sel ? 'bg-accent text-white' : 'bg-panel border border-border text-text-soft'}`}>
                  {i + 1}
                </span>
                <span className="flex-1 pt-0.5">{opt}</span>
                {sel && !submitted && (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-accent2 shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* MATCHING */}
      {task.type === 'matching' && task.match_left && task.match_right && (
        <div className="space-y-3">
          <div className="card p-3 bg-panel2/60">
            <p className="text-xs uppercase tracking-wide text-muted mb-2">Варианты справа</p>
            <div className="space-y-1.5">
              {task.match_right.map((r, i) => (
                <p key={i} className="text-sm flex items-start gap-2">
                  <span className="font-mono text-accent2 font-bold shrink-0">{i + 1}.</span>
                  <span>{r}</span>
                </p>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted">Сопоставьте каждому пункту слева вариант справа:</p>
            {task.match_left.map((l, i) => {
              const correctSet = task.correct_answer.split('').map((c) => +c)
              const ok = submitted && matchSel[i] === correctSet[i] && matchSel[i] !== 0
              const bad = submitted && matchSel[i] !== correctSet[i]
              return (
                <div
                  key={i}
                  className={`flex gap-3 items-center px-3 py-2.5 rounded-lg border-2 transition-all
                    ${ok ? 'border-good bg-good/10' :
                      bad ? 'border-bad bg-bad/10' :
                      'border-border bg-panel2'}`}
                >
                  <span className="font-mono font-bold text-accent2 shrink-0 w-6">
                    {String.fromCharCode(1040 + i)}
                  </span>
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
                    className="bg-panel border border-border rounded-lg px-3 py-1.5 text-sm font-medium
                               focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none
                               disabled:opacity-60"
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
        <div>
          <input
            disabled={disabled}
            value={fill}
            onChange={(e) => {
              setFill(e.target.value)
              emitChange({ fill: e.target.value })
            }}
            placeholder="Введите ответ"
            className={`w-full px-4 py-3 rounded-lg border-2 bg-panel2 outline-none transition-all text-base
              ${submitted
                ? result
                  ? 'border-good bg-good/10'
                  : 'border-bad bg-bad/10'
                : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/20'}`}
          />
          {submitted && !result && (
            <p className="text-xs text-muted mt-2">
              Подсказка: проверка нечувствительна к регистру и замене «е»/«ё».
            </p>
          )}
        </div>
      )}

      {/* WRITTEN (part 2) */}
      {isWritten && (
        <div className="space-y-4">
          <textarea
            rows={6}
            value={written}
            onChange={(e) => setWritten(e.target.value)}
            placeholder="Введите развёрнутый ответ..."
            className="w-full px-4 py-3 rounded-lg border-2 border-border bg-panel2 outline-none
                       focus:border-accent focus:ring-2 focus:ring-accent/20 resize-y text-sm leading-relaxed"
          />

          {/* ИИ-проверка письменного ответа */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="btn-primary flex items-center gap-2 disabled:opacity-60"
              onClick={runAiCheck}
              disabled={aiBusy || !written.trim() || !aiAvailable}
              title={!aiAvailable ? 'ИИ-проверка включится после настройки аккаунта (Supabase)' : ''}
            >
              {aiBusy ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" />
                </svg>
              )}
              {aiBusy ? 'Проверяю…' : 'Проверить с ИИ'}
            </button>
            {!aiAvailable && (
              <span className="text-xs text-muted">ИИ-проверка включится после настройки аккаунта</span>
            )}
          </div>

          {aiError && (
            <p className="text-sm text-bad bg-bad/10 rounded-lg px-3 py-2">Ошибка проверки: {aiError}</p>
          )}

          {aiResult && (
            <div className="card p-4 bg-panel2 animate-fade-in space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-accent2 font-semibold flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" />
                  </svg>
                  Оценка ИИ
                </p>
                <span className={`font-bold text-lg ${aiResult.score >= aiResult.maxScore ? 'text-good' : aiResult.score > 0 ? 'text-warn' : 'text-bad'}`}>
                  {aiResult.score} <span className="text-muted font-normal text-sm">/ {aiResult.maxScore} баллов</span>
                </span>
              </div>
              <div className="space-y-2">
                {aiResult.perCriterion?.map((c, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${c.met ? 'bg-good text-white' : 'bg-bad text-white'}`}>
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={c.met ? 'M5 13l4 4L19 7' : 'M18 6L6 18M6 6l12 12'} />
                      </svg>
                    </span>
                    <div>
                      <p className="text-text-soft">{c.criterion}</p>
                      {c.comment && <p className="text-xs text-muted mt-0.5">{c.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {aiResult.overall && (
                <p className="text-sm leading-relaxed text-text border-t border-border-soft pt-3">
                  <span className="text-accent2 font-medium">Итог: </span>{aiResult.overall}
                </p>
              )}
              <p className="text-[11px] text-muted">ИИ-оценка ориентировочна и может отличаться от реального эксперта ФИПИ.</p>
            </div>
          )}

          <button
            className="btn-outline flex items-center gap-2"
            onClick={() => setShowModel((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={showModel ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
            </svg>
            {showModel ? 'Скрыть' : 'Показать'} эталон и критерии
          </button>
          {showModel && (
            <div className="space-y-3 animate-fade-in">
              <div className="card p-4 bg-panel2 border-l-4 !border-l-accent">
                <p className="text-xs uppercase tracking-wide text-accent2 mb-2 font-semibold">
                  Эталонный ответ
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed">
                  {task.correct_answer}
                </p>
              </div>
              {task.criteria && (
                <div className="card p-4 bg-panel2">
                  <p className="text-xs uppercase tracking-wide text-accent2 mb-3 font-semibold">
                    Критерии ФИПИ — отметьте выполненные
                  </p>
                  <div className="space-y-2">
                    {task.criteria.map((c, i) => (
                      <label
                        key={i}
                        className="flex gap-2.5 items-start cursor-pointer text-sm py-1.5 px-2 rounded hover:bg-panel transition-colors"
                      >
                        <span className={`relative w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors
                          ${checkedCrit.has(i) ? 'bg-good border-good' : 'border-border bg-panel'}`}>
                          <input
                            type="checkbox"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            checked={checkedCrit.has(i)}
                            onChange={() => {
                              const n = new Set(checkedCrit)
                              n.has(i) ? n.delete(i) : n.add(i)
                              setCheckedCrit(n)
                            }}
                          />
                          {checkedCrit.has(i) && (
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className={checkedCrit.has(i) ? 'text-text' : 'text-text-soft'}>
                          {c}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-soft flex items-center justify-between text-xs">
                    <span className="text-muted">Выполнено критериев</span>
                    <span className="font-bold text-accent2">
                      {checkedCrit.size} <span className="text-muted font-normal">/ {task.criteria.length}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTROLS (только для части 1 в режиме тренировки) */}
      {!controlled && !isWritten && (
        <div className="mt-5 flex items-center gap-3">
          {!submitted ? (
            <button className="btn-primary flex items-center gap-2" onClick={handleSubmit}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Проверить
            </button>
          ) : (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold
              ${result
                ? 'bg-good/15 text-good border border-good/30'
                : 'bg-bad/15 text-bad border border-bad/30'}`}>
              {result ? (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Верно
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                  Неверно
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* EXPLANATION */}
      {submitted && !controlled && task.explanation && (
        <div className="mt-4 card p-4 bg-panel2 border-l-4 !border-l-accent">
          {!result && task.type !== 'fill' && task.type !== 'single' && (
            <p className="text-sm mb-2">
              <span className="text-muted">Правильный ответ: </span>
              <span className="font-mono text-good font-semibold">{task.correct_answer}</span>
            </p>
          )}
          {!result && (task.type === 'fill' || (task.type === 'single' && task.options_letters === false)) && (
            <p className="text-sm mb-2">
              <span className="text-muted">Правильный ответ: </span>
              <span className="text-good font-semibold">{task.correct_answer}</span>
            </p>
          )}
          <p className="text-sm leading-relaxed whitespace-pre-line text-text">
            <span className="text-accent2 font-medium">Пояснение: </span>
            {task.explanation}
          </p>
        </div>
      )}
    </div>
  )
}
