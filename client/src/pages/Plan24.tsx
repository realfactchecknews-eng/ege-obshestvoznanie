import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { aiAvailable } from '../lib/ai'
import {
  ISSUE_LABEL, PLAN_TOPICS, checkPlan, cleanPlan, emptyPlan, getAttempts, getDraft, referenceFor,
  saveAttempt, saveDraft, scorePlan, structureHints, taskText,
  type AiPlanResult, type PlanPoint, type Score,
} from '../lib/plan24'

const LETTERS = 'абвгдежзиклмн'
const CUSTOM = '__custom__'
const TOPIC_KEY = 'ege2_plan24_topic'

/** Вкладка «План №24»: пишешь сложный план, берёшь ступенчатые подсказки, ИИ проверяет по критериям К1/К2. */
export default function Plan24() {
  const [sel, setSel] = useState<string>(() => {
    try { return PLAN_TOPICS.includes(localStorage.getItem(TOPIC_KEY) ?? '') ? localStorage.getItem(TOPIC_KEY)! : PLAN_TOPICS[0] } catch { return PLAN_TOPICS[0] }
  })
  const [custom, setCustom] = useState('')
  const topic = sel === CUSTOM ? custom.trim() : sel
  const reference = useMemo(() => referenceFor(topic), [topic])

  const [plan, setPlan] = useState<PlanPoint[]>(emptyPlan)
  const [hints, setHints] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{ r: AiPlanResult; s: Score; plan: PlanPoint[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRef, setShowRef] = useState(false)
  const [showCriteria, setShowCriteria] = useState(false)
  const [attempts, setAttempts] = useState(getAttempts)
  const focusKey = useRef<string | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const skipSave = useRef(false)

  // смена темы: подтягиваем черновик
  useEffect(() => {
    skipSave.current = true // автосохранение ниже в этом же рендере видит ещё старое состояние — не даём ему затереть черновик
    const d = topic ? getDraft(topic) : null
    setPlan(d?.plan ?? emptyPlan())
    setHints(d?.hints ?? {})
    setResult(null)
    setError(null)
    setShowRef(false)
    if (sel !== CUSTOM) try { localStorage.setItem(TOPIC_KEY, sel) } catch { /* без localStorage просто не запомним тему */ }
  }, [topic]) // eslint-disable-line react-hooks/exhaustive-deps

  // автосохранение черновика
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    if (!topic) return
    const empty = plan.every((p) => !p.title && p.subs.every((s) => !s)) && !Object.keys(hints).length
    saveDraft(topic, empty ? null : { plan, hints })
  }, [plan, hints, topic])

  // фокус после добавления/удаления полей
  useEffect(() => {
    if (!focusKey.current) return
    document.querySelector<HTMLInputElement>(`[data-k="${focusKey.current}"]`)?.focus()
    focusKey.current = null
  })

  const hintsUsed = Object.values(hints).reduce((a, b) => a + b, 0)
  const structure = structureHints(plan)

  function setTitle(i: number, v: string) {
    setPlan((p) => p.map((x, k) => (k === i ? { ...x, title: v } : x)))
  }
  function setSub(i: number, j: number, v: string) {
    setPlan((p) => p.map((x, k) => (k === i ? { ...x, subs: x.subs.map((s, m) => (m === j ? v : s)) } : x)))
  }
  function addSub(i: number, at?: number) {
    setPlan((p) => p.map((x, k) => {
      if (k !== i) return x
      const subs = [...x.subs]
      subs.splice(at ?? subs.length, 0, '')
      return { ...x, subs }
    }))
    focusKey.current = `s${i}-${at ?? plan[i].subs.length}`
  }
  function removeSub(i: number, j: number) {
    setPlan((p) => p.map((x, k) => (k === i ? { ...x, subs: x.subs.filter((_, m) => m !== j) } : x)))
  }
  function addPoint(at: number) {
    setPlan((p) => {
      const n = [...p]
      n.splice(at, 0, { title: '', subs: ['', '', ''] })
      return n
    })
    focusKey.current = `p${at}`
  }
  function removePoint(i: number) {
    setPlan((p) => p.filter((_, k) => k !== i))
  }

  // поток набора как в outliner: Enter идёт дальше, Backspace на пустом подпункте удаляет его
  function onTitleKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (plan[i].subs.length) focusKey.current = `s${i}-0`
    else addSub(i, 0)
    setPlan((p) => [...p]) // перерисовать, чтобы сработал эффект фокуса
  }
  function onSubKey(e: React.KeyboardEvent, i: number, j: number) {
    const v = plan[i].subs[j]
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!v.trim() && j > 0) {
        removeSub(i, j)
        if (i + 1 < plan.length) { focusKey.current = `p${i + 1}`; setPlan((p) => [...p]) } else addPoint(i + 1)
      } else if (j + 1 < plan[i].subs.length && !plan[i].subs[j + 1]) {
        focusKey.current = `s${i}-${j + 1}`
        setPlan((p) => [...p])
      } else addSub(i, j + 1)
    } else if (e.key === 'Backspace' && !v) {
      e.preventDefault()
      removeSub(i, j)
      focusKey.current = j > 0 ? `s${i}-${j - 1}` : `p${i}`
    }
  }

  function hint(i: number) {
    const max = 1 + (reference?.[i].subs.length ?? 0)
    setHints((h) => ((h[i] ?? 0) >= max ? h : { ...h, [i]: (h[i] ?? 0) + 1 }))
  }

  async function run() {
    const cleaned = cleanPlan(plan)
    if (!topic) return setError('Выбери или впиши тему')
    if (!cleaned.length) return setError('Заполни хотя бы один пункт')
    setError(null)
    setBusy(true)
    try {
      const r = await checkPlan(topic, cleaned)
      const s = scorePlan(r)
      saveAttempt(topic, cleaned, r, s, hintsUsed)
      setAttempts(getAttempts())
      setResult({ r, s, plan: cleaned })
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setPlan(emptyPlan())
    setHints({})
    setResult(null)
    setError(null)
  }

  function randomTopic() {
    const done = new Set(attempts.map((a) => a.topic))
    const fresh = PLAN_TOPICS.filter((t) => !done.has(t) && t !== topic)
    const pool = fresh.length ? fresh : PLAN_TOPICS.filter((t) => t !== topic)
    setSel(pool[Math.floor(Math.random() * pool.length)])
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">План — задание №24</h1>
        <p className="text-text-soft text-sm mt-1">
          Пишешь сложный план, при необходимости берёшь подсказки, ИИ проверяет по критериям К1 (0–3) и К2 (0–1).
        </p>
      </div>

      <div className="card p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm flex-1 min-w-[220px]">
          <span className="text-muted text-xs font-medium uppercase tracking-wide">Тема</span>
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="bg-panel2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            {PLAN_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            <option value={CUSTOM}>✎ Своя тема…</option>
          </select>
        </label>
        {sel === CUSTOM && (
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Например: Политические идеологии"
            className="flex-1 min-w-[220px] bg-panel2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-sm"
          />
        )}
        <button className="btn-outline" onClick={randomTopic}>Другая тема</button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          <div className="card p-4 md:p-5">
            <span className="chip mb-2">Задание 24</span>
            <p className="text-sm leading-relaxed whitespace-pre-line text-text-soft">{topic ? taskText(topic) : 'Выбери тему'}</p>
          </div>

          <div className="card p-4 md:p-5 space-y-4">
            {plan.map((p, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-right font-mono font-bold text-accent2 shrink-0">{i + 1}.</span>
                  <input
                    data-k={`p${i}`}
                    value={p.title}
                    onChange={(e) => setTitle(i, e.target.value)}
                    onKeyDown={(e) => onTitleKey(e, i)}
                    placeholder="Пункт плана"
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border-2 border-border bg-panel2 outline-none focus:border-accent text-sm font-medium"
                  />
                  {plan.length > 1 && (
                    <button onClick={() => removePoint(i)} className="text-muted hover:text-bad text-lg leading-none px-1" title="Удалить пункт">×</button>
                  )}
                </div>
                {p.subs.map((s, j) => (
                  <div key={j} className="flex items-center gap-2 ml-8">
                    <span className="w-5 text-right text-muted shrink-0 text-sm">{LETTERS[j] ?? '·'})</span>
                    <input
                      data-k={`s${i}-${j}`}
                      value={s}
                      onChange={(e) => setSub(i, j, e.target.value)}
                      onKeyDown={(e) => onSubKey(e, i, j)}
                      placeholder="Подпункт"
                      className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-border bg-panel2 outline-none focus:border-accent text-sm"
                    />
                    <button onClick={() => removeSub(i, j)} className="text-muted hover:text-bad leading-none px-1" title="Удалить подпункт">×</button>
                  </div>
                ))}
                <button onClick={() => addSub(i)} className="ml-8 text-xs text-accent2 hover:underline">+ подпункт</button>
              </div>
            ))}
            <button onClick={() => addPoint(plan.length)} className="text-sm text-accent2 hover:underline">+ пункт</button>
            <p className="text-[11px] text-muted">
              Enter — следующее поле; Enter на пустом подпункте — новый пункт; Backspace на пустом поле — удалить.
            </p>
          </div>

          <div className="text-xs space-y-1">
            {structure.length === 0
              ? <p className="text-good">✓ Структура в порядке: не меньше трёх пунктов, подпункты есть.</p>
              : structure.map((s) => <p key={s} className="text-warn">• {s}</p>)}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary disabled:opacity-60" onClick={run} disabled={busy || !aiAvailable || !topic}
              title={!aiAvailable ? 'ИИ-проверка недоступна: не настроен VITE_AI_ENDPOINT' : ''}>
              {busy ? 'Проверяю…' : 'Проверить с ИИ'}
            </button>
            <button className="btn-outline" onClick={reset}>Начать заново</button>
            <button className="btn-outline" onClick={() => setShowCriteria((v) => !v)}>
              {showCriteria ? 'Скрыть' : 'Показать'} критерии
            </button>
            {hintsUsed > 0 && <span className="text-xs text-muted">подсказок взято: {hintsUsed}</span>}
          </div>

          {error && <p className="text-sm text-bad bg-bad/10 rounded-lg px-3 py-2">{error}</p>}

          {showCriteria && (
            <div className="card p-4 bg-panel2 text-sm leading-relaxed text-text-soft space-y-2 animate-slide-down">
              <p className="text-xs uppercase tracking-wide text-accent2 font-semibold">Критерии задания 24 (макс. 4 балла)</p>
              <p><b>К1 — раскрытие темы (0–3).</b> Нужно не менее трёх пунктов, непосредственно раскрывающих тему по существу, и подпункты к ним (не менее трёх в каждом; два — только если по теме возможны лишь два).</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>3 балла — три пункта детализированы подпунктами</li>
                <li>2 балла — детализированы только два пункта</li>
                <li>1 балл — детализирован только один пункт</li>
                <li>0 — иное, либо план не сложного типа</li>
              </ul>
              <p>Абстрактные пункты и подпункты («Понятие», «Значение», «Роль в обществе» без конкретики) не засчитываются.</p>
              <p><b>К2 — корректность формулировок (0–1).</b> Ставится только при К1 = 3 и только если нет ошибок и неточностей.</p>
            </div>
          )}

          {result && <Result ref={resultRef} {...result} reference={reference} showRef={showRef} setShowRef={setShowRef} />}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <Hints reference={reference} hints={hints} onHint={hint} />
        </aside>
      </div>

      <Stats attempts={attempts} />
    </div>
  )
}

function Hints({ reference, hints, onHint }: { reference: PlanPoint[] | null; hints: Record<string, number>; onHint: (i: number) => void }) {
  return (
    <div className="card p-4 space-y-3">
      <div>
        <p className="font-semibold">Подсказки</p>
        <p className="text-xs text-muted mt-0.5">
          По шагам: сначала аспект пункта, потом подпункты по одному. Чем меньше берёшь — тем честнее результат.
        </p>
      </div>
      {!reference && <p className="text-sm text-muted">Для своей темы эталона нет — подсказок не будет, проверка работает как обычно.</p>}
      {reference?.map((p, i) => {
        const st = hints[i] ?? 0
        const max = 1 + p.subs.length
        return (
          <div key={i} className="rounded-lg bg-panel2 px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Пункт {i + 1} эталона</span>
              <button
                onClick={() => onHint(i)}
                disabled={st >= max}
                className="text-xs text-accent2 hover:underline disabled:text-muted disabled:no-underline"
              >
                {st === 0 ? 'Подсказка' : st >= max ? 'всё открыто' : 'Ещё подсказка'}
              </button>
            </div>
            {st === 0 && <p className="text-sm text-muted">🔒 закрыто</p>}
            {st >= 1 && <p className="text-sm font-medium">{p.title}</p>}
            {st >= 2 && (
              <ul className="text-sm text-text-soft space-y-0.5">
                {p.subs.slice(0, st - 1).map((s, j) => <li key={j}>{LETTERS[j]}) {s}</li>)}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

const Result = forwardRef<HTMLDivElement, {
  r: AiPlanResult; s: Score; plan: PlanPoint[]; reference: PlanPoint[] | null; showRef: boolean; setShowRef: (v: boolean) => void
}>(function Result({ r, s, plan, reference, showRef, setShowRef }, ref) {
  const color = s.total >= 4 ? 'text-good' : s.total >= 2 ? 'text-warn' : 'text-bad'
  const why =
    s.validPoints < 3
      ? `Пунктов, раскрывающих тему по существу, только ${s.validPoints} — нужно минимум три.`
      : `Раскрывающих пунктов ${s.validPoints}, из них полностью детализированы ${s.detailed}.`
  return (
    <div ref={ref} className="card p-4 md:p-5 bg-panel2 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs uppercase tracking-wide text-accent2 font-semibold">Оценка ИИ</p>
        <span className={`font-bold text-xl ${color}`}>{s.total} <span className="text-muted font-normal text-sm">/ 4</span></span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-panel px-3 py-2"><p className="text-xs text-muted">К1 · раскрытие темы</p><p className="font-bold">{s.k1} <span className="text-muted font-normal">/ 3</span></p></div>
        <div className="rounded-lg bg-panel px-3 py-2"><p className="text-xs text-muted">К2 · формулировки</p><p className="font-bold">{s.k2} <span className="text-muted font-normal">/ 1</span></p></div>
      </div>
      <p className="text-sm text-text-soft">{why}{s.k1 === 3 && !s.k2 && ' К2 не поставлен: есть некорректные формулировки.'}{s.k1 < 3 && ' К2 возможен только при К1 = 3.'}</p>

      <div className="space-y-3">
        {plan.map((p, i) => {
          const a = r.points[i]
          const pp = s.perPoint[i]
          return (
            <div key={i} className="rounded-lg bg-panel px-3 py-2.5 space-y-1.5">
              <div className="flex items-start gap-2">
                <Mark ok={pp.reveals} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{i + 1}. {p.title}</p>
                  {a.comment && <p className="text-xs text-muted">{a.comment}</p>}
                  <p className="text-xs text-muted">
                    засчитано подпунктов: {pp.okSubs} из {p.subs.length}
                    {pp.reveals && !pp.full && <span className="text-warn"> · нужно {pp.need}</span>}
                  </p>
                </div>
              </div>
              <ul className="ml-7 space-y-1">
                {p.subs.map((sub, j) => {
                  const x = a.subs[j]
                  return (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <Mark ok={!!x?.ok} small />
                      <div className="min-w-0">
                        <span className="text-text-soft">{LETTERS[j]}) {sub}</span>
                        {!x?.ok && (
                          <p className="text-xs text-muted">
                            {x?.issue && ISSUE_LABEL[x.issue] && <b>{ISSUE_LABEL[x.issue]}. </b>}{x?.comment}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      {r.formulationNotes && <p className="text-sm"><span className="text-warn font-medium">Формулировки: </span>{r.formulationNotes}</p>}
      {!!r.missing?.length && (
        <div className="text-sm">
          <p className="text-accent2 font-medium mb-1">Чего не хватает в раскрытии темы</p>
          <div className="flex flex-wrap gap-1.5">{r.missing.map((m, i) => <span key={i} className="chip">{m}</span>)}</div>
        </div>
      )}
      {r.advice && <p className="text-sm leading-relaxed border-t border-border-soft pt-3"><span className="text-accent2 font-medium">Совет: </span>{r.advice}</p>}

      {reference && (
        <div>
          <button className="btn-outline" onClick={() => setShowRef(!showRef)}>{showRef ? 'Скрыть' : 'Показать'} эталонный план</button>
          {showRef && (
            <div className="mt-3 text-sm space-y-2 animate-slide-down">
              {reference.map((p, i) => (
                <div key={i}>
                  <p className="font-medium">{i + 1}. {p.title}</p>
                  <ul className="ml-5 text-text-soft">{p.subs.map((x, j) => <li key={j}>{LETTERS[j]}) {x}</li>)}</ul>
                </div>
              ))}
              <p className="text-[11px] text-muted">Авторский ориентир, не официальный ключ: допустимы другие верные формулировки и аспекты.</p>
            </div>
          )}
        </div>
      )}
      <p className="text-[11px] text-muted">ИИ-оценка ориентировочна и может отличаться от реального эксперта ФИПИ — особенно в спорных подпунктах.</p>
    </div>
  )
})

function Mark({ ok, small }: { ok: boolean; small?: boolean }) {
  return (
    <span className={`shrink-0 rounded-full flex items-center justify-center text-white ${small ? 'w-4 h-4 text-[10px] mt-0.5' : 'w-5 h-5 text-xs mt-0.5'} ${ok ? 'bg-good' : 'bg-bad'}`}>
      {ok ? '✓' : '✗'}
    </span>
  )
}

function Stats({ attempts }: { attempts: ReturnType<typeof getAttempts> }) {
  if (!attempts.length) return null
  const n = attempts.length
  const avg = (f: (a: (typeof attempts)[number]) => number) => attempts.reduce((s, a) => s + f(a), 0) / n
  const issues: Record<string, number> = {}
  for (const a of attempts) for (const [k, v] of Object.entries(a.issues)) issues[k] = (issues[k] ?? 0) + v
  const top = Object.entries(issues).sort((a, b) => b[1] - a[1]).slice(0, 4)
  const missing: Record<string, number> = {}
  for (const a of attempts) for (const m of a.missing) missing[m] = (missing[m] ?? 0) + 1
  const topMissing = Object.entries(missing).sort((a, b) => b[1] - a[1]).slice(0, 4)
  return (
    <div className="card p-4 md:p-5 space-y-4">
      <p className="font-semibold">Где я отстаю</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="Попыток" value={String(n)} />
        <Stat label="Средний К1" value={`${avg((a) => a.k1).toFixed(1)} / 3`} />
        <Stat label="К2 получен" value={`${Math.round(avg((a) => a.k2) * 100)}%`} />
        <Stat label="Подсказок в среднем" value={avg((a) => a.hints).toFixed(1)} />
      </div>
      {top.length > 0 && (
        <div className="text-sm">
          <p className="text-muted text-xs mb-1.5">Типичные ошибки (за все попытки)</p>
          <div className="flex flex-wrap gap-1.5">
            {top.map(([k, v]) => <span key={k} className="chip !bg-warn/15 !text-warn !border-warn/30">{ISSUE_LABEL[k] ?? k} · {v}</span>)}
          </div>
        </div>
      )}
      {topMissing.length > 0 && (
        <div className="text-sm">
          <p className="text-muted text-xs mb-1.5">Аспекты, которые ИИ чаще всего не находил в планах</p>
          <div className="flex flex-wrap gap-1.5">{topMissing.map(([k, v]) => <span key={k} className="chip">{k}{v > 1 && ` · ${v}`}</span>)}</div>
        </div>
      )}
      <div>
        <p className="text-muted text-xs mb-1.5">Последние попытки</p>
        <ul className="divide-y divide-border-soft text-sm">
          {attempts.slice(0, 6).map((a) => (
            <li key={a.ts} className="py-1.5 flex items-center gap-3">
              <span className="flex-1 min-w-0 truncate">{a.topic}</span>
              {a.hints > 0 && <span className="text-xs text-muted shrink-0">подсказок {a.hints}</span>}
              <span className="font-bold shrink-0">{a.k1 + a.k2}<span className="text-muted font-normal">/4</span></span>
              <span className="text-xs text-muted shrink-0">{a.date.slice(5).split('-').reverse().join('.')}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-panel2 px-3 py-2"><p className="text-xs text-muted">{label}</p><p className="font-bold">{value}</p></div>
}
