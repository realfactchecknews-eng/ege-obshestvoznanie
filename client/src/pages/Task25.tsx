import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { aiAvailable } from '../lib/ai'
import {
  HINTS, ISSUE25, TASKS25, checkTask25, countSentences, emptyAnswer, getAttempts25, getDraft25, hintsCount,
  noHints, saveAttempt25, saveDraft25, scoreTask25,
  type AiTask25, type Answer25, type Hints25Used, type Score25, type Task25,
} from '../lib/task25'

const VARIANT_KEY = 'ege2_task25_variant'
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

/** Вкладка «Задание №25»: обоснование + ответ на вопрос + три примера, подсказки по шагам, ИИ по К1/К2/К3. */
export default function Task25Page() {
  const [variant, setVariant] = useState<number>(() => {
    try { const v = Number(localStorage.getItem(VARIANT_KEY)); return TASKS25.some((t) => t.variant === v) ? v : TASKS25[0].variant } catch { return TASKS25[0].variant }
  })
  const task = TASKS25.find((t) => t.variant === variant)!
  const hint = HINTS[String(variant)]

  const [answer, setAnswer] = useState<Answer25>(emptyAnswer)
  const [hints, setHints] = useState<Hints25Used>(noHints)
  const [result, setResult] = useState<{ r: AiTask25; s: Score25; a: Answer25; t: Task25 } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCriteria, setShowCriteria] = useState(false)
  const [attempts, setAttempts] = useState(getAttempts25)
  const resultRef = useRef<HTMLDivElement>(null)
  const skipSave = useRef(false)

  useEffect(() => {
    skipSave.current = true // автосохранение ниже в этом рендере ещё видит старое состояние — не даём затереть черновик
    const d = getDraft25(variant)
    setAnswer(d?.answer ?? emptyAnswer())
    setHints(d?.hints ?? noHints())
    setResult(null)
    setError(null)
    try { localStorage.setItem(VARIANT_KEY, String(variant)) } catch { /* без localStorage просто не запомним */ }
  }, [variant])

  useEffect(() => {
    if (skipSave.current) { skipSave.current = false; return }
    const empty = !answer.justification && answer.items.every((x) => !x) && answer.examples.every((x) => !x) && hintsCount(hints) === 0
    saveDraft25(variant, empty ? null : { answer, hints })
  }, [answer, hints, variant])

  const sentences = countSentences(answer.justification)
  const used = hintsCount(hints)
  const setItem = (i: number, v: string) => setAnswer((a) => ({ ...a, items: a.items.map((x, k) => (k === i ? v : x)) }))
  const setExample = (i: number, v: string) => setAnswer((a) => ({ ...a, examples: a.examples.map((x, k) => (k === i ? v : x)) }))

  async function run() {
    if (!answer.justification.trim()) return setError('Напиши обоснование (пункт 1)')
    if (answer.items.some((x) => !x.trim())) return setError('Заполни все три позиции в пункте 2')
    if (answer.examples.some((x) => !x.trim())) return setError('Напиши все три примера (пункт 3)')
    setError(null)
    setBusy(true)
    try {
      const a: Answer25 = { justification: answer.justification.trim(), items: answer.items.map((x) => x.trim()), examples: answer.examples.map((x) => x.trim()) }
      const r = await checkTask25(task, a)
      const s = scoreTask25(r, { sentences: countSentences(a.justification), joint: task.joint })
      saveAttempt25(task, a, r, s, used)
      setAttempts(getAttempts25())
      setResult({ r, s, a, t: task })
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setAnswer(emptyAnswer())
    setHints(noHints())
    setResult(null)
    setError(null)
  }

  function otherTask() {
    const done = new Set(attempts.map((a) => a.variant))
    const fresh = TASKS25.filter((t) => !done.has(t.variant) && t.variant !== variant)
    const pool = fresh.length ? fresh : TASKS25.filter((t) => t.variant !== variant)
    setVariant(pool[Math.floor(Math.random() * pool.length)].variant)
  }

  const field = 'w-full px-3 py-2 rounded-lg border-2 border-border bg-panel2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-sm leading-relaxed'

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Задание №25</h1>
        <p className="text-text-soft text-sm mt-1">
          Обоснование, ответ на вопрос и три примера. Подсказки по шагам, ИИ проверяет по критериям К1 (0–2), К2 (0–1), К3 (0–3) — всего 6 баллов.
        </p>
      </div>

      <div className="card p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm flex-1 min-w-[220px] max-w-full">
          <span className="text-muted text-xs font-medium uppercase tracking-wide">Задание из сборника</span>
          <select value={variant} onChange={(e) => setVariant(Number(e.target.value))}
            className="w-full min-w-0 bg-panel2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20">
            {TASKS25.map((t) => <option key={t.variant} value={t.variant}>Вариант {t.variant} · {t.topic}</option>)}
          </select>
        </label>
        <button className="btn-outline" onClick={otherTask}>Другое задание</button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          <div className="card p-4 md:p-5 space-y-2">
            <span className="chip">1</span>
            <p className="text-sm leading-relaxed text-text-soft">{task.parts[0]}</p>
            <textarea rows={6} value={answer.justification} onChange={(e) => setAnswer((a) => ({ ...a, justification: e.target.value }))}
              placeholder="Несколько связанных распространённых предложений: опора на понятия, причинно-следственные связи…" className={`${field} resize-y`} />
            <p className={`text-xs ${sentences >= 3 ? 'text-good' : sentences >= 2 ? 'text-warn' : 'text-muted'}`}>
              предложений: {sentences} {sentences < 2 && '— одно предложение по критериям даёт 0 баллов'}
            </p>
          </div>

          <div className="card p-4 md:p-5 space-y-2">
            <span className="chip">2</span>
            <p className="text-sm leading-relaxed text-text-soft">{task.parts[1]}</p>
            {answer.items.map((x, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 text-right font-mono text-accent2">{i + 1}.</span>
                <input value={x} onChange={(e) => setItem(i, e.target.value)} placeholder={`Позиция ${i + 1}`} className={`${field} !py-1.5`} />
              </div>
            ))}
          </div>

          <div className="card p-4 md:p-5 space-y-3">
            <span className="chip">3</span>
            <p className="text-sm leading-relaxed text-text-soft">{task.parts[2]}</p>
            {answer.examples.map((x, i) => (
              <div key={i} className="space-y-1">
                <p className="text-xs text-muted">Пример {i + 1} — к позиции: <b className="text-text-soft">{answer.items[i].trim() || `№${i + 1} из пункта 2`}</b></p>
                <textarea rows={3} value={x} onChange={(e) => setExample(i, e.target.value)} placeholder="Развёрнуто: кто, что сделал, при каких обстоятельствах, с каким результатом" className={`${field} resize-y`} />
                {x.trim() && words(x) < 10 && <p className="text-xs text-warn">слишком коротко — пример должен быть развёрнутым</p>}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary disabled:opacity-60" onClick={run} disabled={busy || !aiAvailable}
              title={!aiAvailable ? 'ИИ-проверка недоступна: не настроен VITE_AI_ENDPOINT' : ''}>
              {busy ? 'Проверяю…' : 'Проверить с ИИ'}
            </button>
            <button className="btn-outline" onClick={reset}>Начать заново</button>
            <button className="btn-outline" onClick={() => setShowCriteria((v) => !v)}>{showCriteria ? 'Скрыть' : 'Показать'} критерии</button>
            {used > 0 && <span className="text-xs text-muted">подсказок взято: {used}</span>}
          </div>

          {error && <p className="text-sm text-bad bg-bad/10 rounded-lg px-3 py-2">{error}</p>}

          {showCriteria && (
            <div className="card p-4 bg-panel2 text-sm leading-relaxed text-text-soft space-y-2 animate-slide-down">
              <p className="text-xs uppercase tracking-wide text-accent2 font-semibold">Критерии задания 25 (макс. 6 баллов)</p>
              <p><b>К1 — обоснование (0–2).</b> 2 — корректное, с опорой на обществоведческие знания, в нескольких распространённых предложениях, раскрывает причинно-следственные и (или) функциональные связи, без ошибок. 1 — в целом корректное, но есть неточности и (или) связи раскрыты не полностью. 0 — одно предложение или бытовой уровень без знаний.</p>
              <p><b>К2 — ответ на вопрос (0–1).</b> Названы все три требуемые позиции, неверных нет.</p>
              <p><b>К3 — примеры (0–3).</b> По баллу за каждый развёрнутый пример, соответствующий условию (требования в скобках, разные функции/права/принципы, без повторов).</p>
            </div>
          )}

          {result && <Result ref={resultRef} {...result} />}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <HintsPanel hint={hint} task={task} hints={hints} setHints={setHints} />
        </aside>
      </div>

      <Stats attempts={attempts} />
    </div>
  )
}

function HintsPanel({ hint, task, hints, setHints }: { hint?: (typeof HINTS)[string]; task: Task25; hints: Hints25Used; setHints: (f: (h: Hints25Used) => Hints25Used) => void }) {
  const Row = ({ title, open, onOpen, children }: { title: string; open: boolean; onOpen: () => void; children?: React.ReactNode }) => (
    <div className="rounded-lg bg-panel2 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{title}</span>
        {!open && <button onClick={onOpen} className="text-xs text-accent2 hover:underline">Подсказка</button>}
      </div>
      {open ? children : <p className="text-sm text-muted">🔒 закрыто</p>}
    </div>
  )
  return (
    <div className="card p-4 space-y-3">
      <div>
        <p className="font-semibold">Подсказки</p>
        <p className="text-xs text-muted mt-0.5">По шагам, от общего к конкретному. Чем меньше берёшь — тем честнее результат.</p>
      </div>
      {!hint && <p className="text-sm text-muted">Для этого задания подсказок нет.</p>}
      {hint && (
        <>
          <Row title="Пункт 1 · понятия для обоснования" open={hints.concepts} onOpen={() => setHints((h) => ({ ...h, concepts: true }))}>
            <div className="flex flex-wrap gap-1.5">{hint.concepts.map((c) => <span key={c} className="chip">{c}</span>)}</div>
          </Row>
          <Row title="Пункт 1 · схема рассуждения" open={hints.chain} onOpen={() => setHints((h) => ({ ...h, chain: true }))}>
            <p className="text-sm text-text-soft leading-relaxed">{hint.chain}</p>
          </Row>
          <div className="rounded-lg bg-panel2 px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Пункт 2 · варианты ответа</span>
              {hints.items < hint.items.length && (
                <button onClick={() => setHints((h) => ({ ...h, items: h.items + 1 }))} className="text-xs text-accent2 hover:underline">
                  {hints.items === 0 ? 'Подсказка' : 'Ещё один вариант'}
                </button>
              )}
            </div>
            {hints.items === 0 ? <p className="text-sm text-muted">🔒 закрыто</p> : (
              <ul className="text-sm text-text-soft space-y-0.5 list-disc pl-4">{hint.items.slice(0, hints.items).map((x) => <li key={x}>{x}</li>)}</ul>
            )}
          </div>
          <Row title="Пункт 3 · на что смотрит эксперт" open={hints.rules} onOpen={() => setHints((h) => ({ ...h, rules: true }))}>
            <ul className="text-sm text-text-soft space-y-1 list-disc pl-4">
              {task.exampleRules.map((r) => <li key={r}>{r}</li>)}
              <li>Конкретная ситуация из российской жизни: кто, что сделал, с каким результатом — не общая фраза.</li>
              <li>Каждый пример привязан к своей позиции из пункта 2.</li>
            </ul>
          </Row>
          <p className="text-[11px] text-muted">Подсказки — авторский ориентир, а не официальный ключ: верны и другие позиции.</p>
        </>
      )}
    </div>
  )
}

const Result = forwardRef<HTMLDivElement, { r: AiTask25; s: Score25; a: Answer25; t: Task25 }>(function Result({ r, s, a, t }, ref) {
  const j = r.justification
  const color = s.total >= 5 ? 'text-good' : s.total >= 3 ? 'text-warn' : 'text-bad'
  const sentences = countSentences(a.justification)
  const why1 = sentences < 2 ? 'Обоснование в одном предложении — по критериям 0 баллов.'
    : !j.usesKnowledge ? 'Нет опоры на обществоведческие знания (бытовой уровень) — 0 баллов.'
    : j.causalLinks === 'none' ? 'Причинно-следственные связи не раскрыты — 0 баллов.'
    : s.k1 === 2 ? 'Обоснование полное и без ошибок.'
    : `Обоснование в целом верное, но ${j.causalLinks === 'partial' ? 'связи раскрыты не полностью' : ''}${j.causalLinks === 'partial' && j.hasErrors ? ' и ' : ''}${j.hasErrors ? 'есть неточности' : ''} — 1 балл.`
  const Mark = ({ ok }: { ok: boolean }) => (
    <span className={`shrink-0 w-5 h-5 mt-0.5 rounded-full flex items-center justify-center text-white text-xs ${ok ? 'bg-good' : 'bg-bad'}`}>{ok ? '✓' : '✗'}</span>
  )
  return (
    <div ref={ref} className="card p-4 md:p-5 bg-panel2 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs uppercase tracking-wide text-accent2 font-semibold">Оценка ИИ</p>
        <span className={`font-bold text-xl ${color}`}>{s.total} <span className="text-muted font-normal text-sm">/ 6</span></span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        {([['К1 · обоснование', s.k1, 2], ['К2 · ответ', s.k2, 1], ['К3 · примеры', s.k3, 3]] as const).map(([l, v, m]) => (
          <div key={l} className="rounded-lg bg-panel px-3 py-2"><p className="text-xs text-muted">{l}</p><p className="font-bold">{v} <span className="text-muted font-normal">/ {m}</span></p></div>
        ))}
      </div>

      <div className="rounded-lg bg-panel px-3 py-2.5 space-y-1">
        <p className="text-sm font-medium">Пункт 1 · обоснование</p>
        <p className="text-sm text-text-soft">{why1}</p>
        {j.comment && <p className="text-xs text-muted">{j.comment}</p>}
      </div>

      <div className="rounded-lg bg-panel px-3 py-2.5 space-y-1.5">
        <p className="text-sm font-medium">Пункт 2 · позиции {s.k2 ? '— все верны' : '— есть неверные'}</p>
        {a.items.map((x, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <Mark ok={!!r.items[i]?.ok} />
            <div className="min-w-0"><span className="text-text-soft">{x}</span>{!r.items[i]?.ok && r.items[i]?.comment && <p className="text-xs text-muted">{r.items[i].comment}</p>}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-panel px-3 py-2.5 space-y-2">
        <p className="text-sm font-medium">Пункт 3 · примеры</p>
        {a.examples.map((x, i) => {
          const e = r.examples[i]
          return (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Mark ok={!!e?.ok} />
              <div className="min-w-0">
                <p className="text-text-soft">{x}</p>
                {!e?.ok && <p className="text-xs text-muted">{e?.issue && ISSUE25[e.issue] && <b>{ISSUE25[e.issue]}. </b>}{e?.comment}</p>}
              </div>
            </div>
          )
        })}
        {t.joint && r.jointRequirementMet === false && (
          <p className="text-xs text-warn">Не выполнено требование «в совокупности»: примеры должны иллюстрировать разные функции/права/принципы — К3 не выше 2.</p>
        )}
      </div>

      {r.advice && <p className="text-sm leading-relaxed border-t border-border-soft pt-3"><span className="text-accent2 font-medium">Совет: </span>{r.advice}</p>}
      <p className="text-[11px] text-muted">ИИ-оценка ориентировочна и может отличаться от реального эксперта ФИПИ — особенно по фактам в примерах.</p>
    </div>
  )
})

function Stats({ attempts }: { attempts: ReturnType<typeof getAttempts25> }) {
  if (!attempts.length) return null
  const n = attempts.length
  const avg = (f: (a: (typeof attempts)[number]) => number) => attempts.reduce((s, a) => s + f(a), 0) / n
  const issues: Record<string, number> = {}
  for (const a of attempts) for (const [k, v] of Object.entries(a.issues)) issues[k] = (issues[k] ?? 0) + v
  const top = Object.entries(issues).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const Stat = ({ label, value }: { label: string; value: string }) => <div className="rounded-lg bg-panel2 px-3 py-2"><p className="text-xs text-muted">{label}</p><p className="font-bold">{value}</p></div>
  return (
    <div className="card p-4 md:p-5 space-y-4">
      <p className="font-semibold">Где я отстаю</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
        <Stat label="Попыток" value={String(n)} />
        <Stat label="Средний балл" value={`${avg((a) => a.k1 + a.k2 + a.k3).toFixed(1)} / 6`} />
        <Stat label="К1 обоснование" value={`${avg((a) => a.k1).toFixed(1)} / 2`} />
        <Stat label="К2 ответ" value={`${Math.round(avg((a) => a.k2) * 100)}%`} />
        <Stat label="К3 примеры" value={`${avg((a) => a.k3).toFixed(1)} / 3`} />
      </div>
      {top.length > 0 && (
        <div className="text-sm">
          <p className="text-muted text-xs mb-1.5">Типичные ошибки (за все попытки)</p>
          <div className="flex flex-wrap gap-1.5">
            {top.map(([k, v]) => <span key={k} className="chip !bg-warn/15 !text-warn !border-warn/30">{ISSUE25[k] ?? k} · {v}</span>)}
          </div>
        </div>
      )}
      <div>
        <p className="text-muted text-xs mb-1.5">Последние попытки</p>
        <ul className="divide-y divide-border-soft text-sm">
          {attempts.slice(0, 6).map((a) => (
            <li key={a.ts} className="py-1.5 flex items-center gap-3">
              <span className="flex-1 min-w-0 truncate">Вар. {a.variant} · {a.topic}</span>
              {a.hints > 0 && <span className="text-xs text-muted shrink-0">подсказок {a.hints}</span>}
              <span className="font-bold shrink-0">{a.k1 + a.k2 + a.k3}<span className="text-muted font-normal">/6</span></span>
              <span className="text-xs text-muted shrink-0">{a.date.slice(5).split('-').reverse().join('.')}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
