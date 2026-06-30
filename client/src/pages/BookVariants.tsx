import { useMemo, useState } from 'react'
import { bookVariants, checkBookAnswer, kindLabel, type BookVariant, type BookTask, type BookPart2Task } from '../lib/book'
import { addAnswer, getBookScores, setBookScore, todayStr } from '../lib/storage'
import { checkEssay, aiAvailable, type EssayCheck } from '../lib/ai'
import type { Task } from '../types'

export default function BookVariants() {
  const [open, setOpen] = useState<number | null>(null)
  if (open === null) return <VariantPicker onPick={setOpen} />
  const v = bookVariants.find((x) => x.variant === open)!
  return <VariantView variant={v} onExit={() => setOpen(null)} />
}

/* ===================== Список вариантов ===================== */
function VariantPicker({ onPick }: { onPick: (v: number) => void }) {
  const scores = getBookScores()
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Сборник: 30 вариантов</h1>
        <p className="text-text-soft text-sm mt-1">
          Типовые экзаменационные варианты (Котова, Лискова). Часть 1 (задания 1–16) — с автопроверкой по ключу.
        </p>
      </div>

      <div className="card p-4 bg-warn/5 border-warn/30 text-sm text-text-soft flex gap-2.5">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-warn shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
        <span>
          Тексты распознаны из PDF — большинство заданий читается чисто, но местами встречаются опечатки OCR.
          Часть 1 (1–16) — автопроверка по официальному ключу. Часть 2 (17–25) — со своим текстом на вариант
          и официальными критериями оценивания из книги; письменные ответы можно проверить через ИИ.
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {bookVariants.map((v) => {
          const best = scores[v.variant]
          return (
            <button
              key={v.variant}
              onClick={() => onPick(v.variant)}
              className="card-hover p-4 text-center flex flex-col items-center gap-2"
            >
              <span className="w-11 h-11 rounded-xl bg-accent-soft text-accent2 font-bold text-lg flex items-center justify-center">
                {v.variant}
              </span>
              <span className="text-xs text-muted">Вариант {v.variant}</span>
              {best != null ? (
                <span className={`text-xs font-semibold ${best >= 13 ? 'text-good' : best >= 8 ? 'text-warn' : 'text-bad'}`}>
                  лучший: {best}/16
                </span>
              ) : (
                <span className="text-xs text-muted/60">не решён</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ===================== Решение варианта ===================== */
function VariantView({ variant, onExit }: { variant: BookVariant; onExit: () => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [submitted, setSubmitted] = useState(false)

  const score = useMemo(
    () => variant.tasks.reduce((s, t) => s + (checked[t.num] ? 1 : 0), 0),
    [checked, variant]
  )

  function checkOne(t: BookTask) {
    if (submitted) return
    const ok = checkBookAnswer(t, answers[t.num] ?? '')
    setChecked((c) => ({ ...c, [t.num]: ok }))
    addAnswer({
      taskId: variant.variant * 100 + t.num,
      taskNumber: t.num,
      topic: 'Сборник ЕГЭ',
      correct: ok,
      date: todayStr(),
      ts: Date.now(),
    })
  }

  function submitAll() {
    let s = 0
    const next: Record<number, boolean> = {}
    for (const t of variant.tasks) {
      const ok = checkBookAnswer(t, answers[t.num] ?? '')
      next[t.num] = ok
      if (ok) s++
      if (!(t.num in checked)) {
        addAnswer({
          taskId: variant.variant * 100 + t.num,
          taskNumber: t.num,
          topic: 'Сборник ЕГЭ',
          correct: ok,
          date: todayStr(),
          ts: Date.now(),
        })
      }
    }
    setChecked(next)
    setSubmitted(true)
    setBookScore(variant.variant, s)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={onExit} className="btn-ghost flex items-center gap-2 text-sm py-1.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Все варианты
        </button>
        {submitted && (
          <span className={`font-bold ${score >= 13 ? 'text-good' : score >= 8 ? 'text-warn' : 'text-bad'}`}>
            Часть 1: {score} / 16
          </span>
        )}
      </div>

      <h1 className="text-xl md:text-2xl font-bold">Вариант {variant.variant} · Часть 1</h1>

      <div className="space-y-4">
        {variant.tasks.map((t) => (
          <BookTaskCard
            key={t.num}
            task={t}
            value={answers[t.num] ?? ''}
            onChange={(val) => setAnswers((a) => ({ ...a, [t.num]: val }))}
            checked={checked[t.num]}
            revealed={submitted || t.num in checked}
            onCheck={() => checkOne(t)}
            locked={submitted}
          />
        ))}
      </div>

      {/* Часть 2 */}
      <div className="pt-2">
        <h2 className="text-xl md:text-2xl font-bold mb-1">Вариант {variant.variant} · Часть 2</h2>
        <p className="text-sm text-text-soft mb-4">
          Развёрнутые ответы (17–25). Сверяйся с официальными критериями книги — кнопка под каждым заданием.
        </p>
        <div className="space-y-4">
          {variant.part2.map((t) => (
            <Part2TaskCard key={t.num} task={t} criteriaRaw={variant.criteria_raw} />
          ))}
        </div>
      </div>

      {!submitted ? (
        <button className="btn-primary w-full py-3" onClick={submitAll}>
          Проверить весь вариант
        </button>
      ) : (
        <button className="btn-ghost w-full py-3" onClick={onExit}>
          Вернуться к списку вариантов
        </button>
      )}
    </div>
  )
}

function BookTaskCard({
  task, value, onChange, checked, revealed, onCheck, locked,
}: {
  task: BookTask
  value: string
  onChange: (v: string) => void
  checked: boolean | undefined
  revealed: boolean
  onCheck: () => void
  locked: boolean
}) {
  const isOk = checked === true
  const isBad = revealed && checked === false
  return (
    <div className={`card p-4 md:p-5 ${isOk ? 'border-good/50' : isBad ? 'border-bad/50' : ''}`}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="chip"><span className="font-mono font-bold">№ {task.num}</span></span>
        <span className="text-xs text-muted">{kindLabel[task.kind]}</span>
        {task.image && (
          <span className="chip !bg-warn/15 !text-warn !border-warn/30">🖼 с иллюстрацией</span>
        )}
      </div>

      {task.text ? (
        <p className="whitespace-pre-line leading-relaxed text-[15px] mb-3">{task.text}</p>
      ) : (
        <p className="text-sm text-muted italic mb-3">
          Текст задания не распознан — открой вариант {'«'}{task.num}{'»'} в сборнике/PDF, реши и впиши ответ для проверки.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={value}
          disabled={locked}
          inputMode="numeric"
          onChange={(e) => onChange(e.target.value)}
          placeholder="ответ цифрами"
          className={`px-4 py-2.5 rounded-lg border-2 bg-panel2 outline-none transition-all w-44 font-mono
            ${isOk ? 'border-good bg-good/10' : isBad ? 'border-bad bg-bad/10' : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/20'}`}
        />
        {!revealed ? (
          <button className="btn-primary py-2" onClick={onCheck} disabled={!value.trim()}>
            Проверить
          </button>
        ) : (
          <span className={`flex items-center gap-1.5 font-semibold ${isOk ? 'text-good' : 'text-bad'}`}>
            {isOk ? '✓ Верно' : '✗ Неверно'}
          </span>
        )}
        {revealed && !isOk && (
          <span className="text-sm">
            <span className="text-muted">Ответ: </span>
            <span className="font-mono text-good font-semibold">{task.answer}</span>
          </span>
        )}
      </div>
    </div>
  )
}

/* ===================== Карточка задания части 2 ===================== */
function Part2TaskCard({ task, criteriaRaw }: { task: BookPart2Task; criteriaRaw: string }) {
  const [answer, setAnswer] = useState('')
  const [showCriteria, setShowCriteria] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiResult, setAiResult] = useState<EssayCheck | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  async function runAiCheck() {
    setAiError(null)
    setAiBusy(true)
    try {
      const aiTask: Task = {
        id: task.num,
        year: 2026,
        task_number: task.num,
        type: 'written',
        topic: 'Сборник ЕГЭ',
        subtopic: task.topic,
        question: task.text ?? '',
        options: [],
        correct_answer: '',
        criteria: [],
        explanation: '',
        source: 'Котова, Лискова — типовые варианты 2026',
      }
      const res = await checkEssay(aiTask, answer)
      setAiResult(res)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="chip"><span className="font-mono font-bold">№ {task.num}</span></span>
        <span className="text-xs text-muted">{task.topic}</span>
        {task.report_topic && (
          <span className="chip !bg-accent/15 !text-accent2 !border-accent/30">«{task.report_topic}»</span>
        )}
      </div>

      {task.text ? (
        <p className="whitespace-pre-line leading-relaxed text-[15px] mb-4">{task.text}</p>
      ) : (
        <p className="text-sm text-muted italic mb-4">
          Текст задания не распознан чисто — открой вариант {variantHint(task)} в сборнике/PDF.
        </p>
      )}

      <textarea
        rows={5}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Введите развёрнутый ответ..."
        className="w-full px-4 py-3 rounded-lg border-2 border-border bg-panel2 outline-none
                   focus:border-accent focus:ring-2 focus:ring-accent/20 resize-y text-sm leading-relaxed mb-3"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn-primary flex items-center gap-2 disabled:opacity-60"
          onClick={runAiCheck}
          disabled={aiBusy || !answer.trim() || !aiAvailable}
          title={!aiAvailable ? 'ИИ-проверка включится после настройки аккаунта (Supabase)' : ''}
        >
          {aiBusy ? 'Проверяю…' : 'Проверить с ИИ'}
        </button>
        <button className="btn-outline" onClick={() => setShowCriteria((v) => !v)}>
          {showCriteria ? 'Скрыть' : 'Показать'} критерии из книги
        </button>
        {!aiAvailable && <span className="text-xs text-muted">ИИ-проверка включится после настройки аккаунта</span>}
      </div>

      {aiError && (
        <p className="text-sm text-bad bg-bad/10 rounded-lg px-3 py-2 mt-3">Ошибка проверки: {aiError}</p>
      )}

      {aiResult && (
        <div className="card p-4 bg-panel2 animate-fade-in space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-accent2 font-semibold">Оценка ИИ</p>
            <span className={`font-bold text-lg ${aiResult.score >= aiResult.maxScore ? 'text-good' : aiResult.score > 0 ? 'text-warn' : 'text-bad'}`}>
              {aiResult.score} <span className="text-muted font-normal text-sm">/ {aiResult.maxScore} баллов</span>
            </span>
          </div>
          <div className="space-y-2">
            {aiResult.perCriterion?.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${c.met ? 'bg-good text-white' : 'bg-bad text-white'}`}>
                  {c.met ? '✓' : '✗'}
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

      {showCriteria && (
        <div className="card p-4 bg-panel2 mt-3 max-h-[420px] overflow-y-auto">
          <p className="text-xs uppercase tracking-wide text-accent2 font-semibold mb-2">
            Официальные критерии оценивания (весь вариант, из книги)
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-soft">{criteriaRaw}</p>
        </div>
      )}
    </div>
  )
}

function variantHint(task: BookPart2Task) {
  return `«№${task.num}»`
}
