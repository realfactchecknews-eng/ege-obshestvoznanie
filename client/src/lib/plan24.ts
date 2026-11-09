import plans from '../data/plans24.json'
import { aiPost } from './ai'
import { todayStr } from './storage'
import { scorePlan, type AiPlanResult, type Score } from './plan24score'

export { scorePlan }
export type { AiPlanResult, Score }

export interface PlanPoint { title: string; subs: string[] }

export const PLAN_KEY = 'ege2_plan24'
const DRAFT_KEY = 'ege2_plan24_draft'

export const REFERENCE = plans as unknown as Record<string, [string, string[]][]>
export const PLAN_TOPICS = Object.keys(REFERENCE)
export const referenceFor = (topic: string): PlanPoint[] | null =>
  REFERENCE[topic]?.map(([title, subs]) => ({ title, subs })) ?? null

export const taskText = (topic: string) =>
  `Используя обществоведческие знания, составьте сложный план, позволяющий раскрыть по существу тему «${topic}». Сложный план должен содержать не менее трёх непосредственно раскрывающих тему по существу пунктов, детализированных в подпунктах.\n(Количество подпунктов каждого детализированного пункта должно быть не менее трёх, за исключением случаев, когда с точки зрения общественных наук возможны только два подпункта.)`

export const emptyPlan = (): PlanPoint[] => [0, 1, 2].map(() => ({ title: '', subs: ['', '', ''] }))

/** Убираем пустые поля; пункт без названия отбрасываем вместе с подпунктами. */
export function cleanPlan(plan: PlanPoint[]): PlanPoint[] {
  return plan
    .map((p) => ({ title: p.title.trim(), subs: p.subs.map((s) => s.trim()).filter(Boolean) }))
    .filter((p) => p.title)
}

export const ISSUE_LABEL: Record<string, string> = {
  abstract: 'Абстрактные формулировки',
  offtopic: 'Не по теме',
  duplicate: 'Повторы',
  wrong: 'Фактические ошибки',
  general: 'Слишком общо',
  weakPoint: 'Пункт не раскрывает тему',
  fewSubs: 'Не хватает подпунктов',
}

export interface Attempt {
  ts: number
  date: string
  topic: string
  plan: PlanPoint[]
  k1: number
  k2: number
  hints: number
  issues: Record<string, number>
  missing: string[]
}

export function getAttempts(): Attempt[] {
  try {
    return JSON.parse(localStorage.getItem(PLAN_KEY) ?? '[]') as Attempt[]
  } catch {
    return []
  }
}

export function saveAttempt(topic: string, plan: PlanPoint[], r: AiPlanResult, s: Score, hints: number) {
  const issues: Record<string, number> = {}
  const bump = (k: string) => (issues[k] = (issues[k] ?? 0) + 1)
  r.points.forEach((p, i) => {
    if (!p.reveals) bump('weakPoint')
    else if (!s.perPoint[i].full) bump('fewSubs')
    p.subs.forEach((x) => {
      if (!x.ok && x.issue && x.issue !== 'none') bump(x.issue)
    })
  })
  const all = getAttempts()
  all.unshift({ ts: Date.now(), date: todayStr(), topic, plan, k1: s.k1, k2: s.k2, hints, issues, missing: (r.missing ?? []).slice(0, 3) })
  localStorage.setItem(PLAN_KEY, JSON.stringify(all))
  // тот же сигнал, что шлёт storage.ts, — чтобы прогресс ушёл в облако
  window.dispatchEvent(new CustomEvent('ege:progress-changed', { detail: { key: PLAN_KEY } }))
}

export interface Draft { plan: PlanPoint[]; hints: Record<string, number> }

export function getDraft(topic: string): Draft | null {
  try {
    return (JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Record<string, Draft>)[topic] ?? null
  } catch {
    return null
  }
}
export function saveDraft(topic: string, d: Draft | null) {
  try {
    const all = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Record<string, Draft>
    if (d) all[topic] = d
    else delete all[topic]
    localStorage.setItem(DRAFT_KEY, JSON.stringify(all))
  } catch {
    /* localStorage недоступен — черновик просто не сохранится */
  }
}

export function checkPlan(topic: string, plan: PlanPoint[]): Promise<AiPlanResult> {
  return aiPost<AiPlanResult>({ mode: 'plan24', topic, plan, reference: referenceFor(topic) })
}

/** Самопроверка без ИИ: бесплатные структурные подсказки по тому, что уже набрано. */
export function structureHints(plan: PlanPoint[]): string[] {
  const c = cleanPlan(plan)
  const out: string[] = []
  if (c.length < 3) out.push(`Пунктов ${c.length} — нужно не менее трёх`)
  c.forEach((p, i) => {
    if (p.subs.length < 2) out.push(`Пункт ${i + 1}: подпунктов ${p.subs.length} — нужно минимум три (два — только если больше невозможно)`)
    else if (p.subs.length === 2) out.push(`Пункт ${i + 1}: два подпункта — допустимо, только если по теме возможны лишь два`)
  })
  return out
}
