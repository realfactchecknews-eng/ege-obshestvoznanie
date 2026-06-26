import { useMemo, useState } from 'react'
import { bookVariants, checkBookAnswer, kindLabel, type BookVariant, type BookTask } from '../lib/book'
import { addAnswer, getBookScores, setBookScore, todayStr } from '../lib/storage'

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
          Тексты заданий распознаны из PDF и местами неполны — у части заданий показан только номер и поле для ответа
          (решай по сборнику/PDF, а здесь проверяй). Развёрнутые задания 17–25 и иллюстрации добавим позже.
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

      {/* Заглушка для части 2 */}
      <div className="card p-5 border-dashed text-center text-text-soft">
        <p className="font-medium">Часть 2 (задания 17–25)</p>
        <p className="text-sm text-muted mt-1">Развёрнутые задания и ответы добавим позже. Сейчас доступна часть 1.</p>
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
