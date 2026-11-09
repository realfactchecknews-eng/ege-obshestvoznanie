import hintsJson from '../data/task25.json'
import { aiPost } from './ai'
import { bookVariants } from './book'
import { todayStr } from './storage'
import { countSentences, jointRequired, scoreTask25, type AiTask25, type Score25 } from './task25score'

export { countSentences, scoreTask25 }
export type { AiTask25, Score25 }

export const TASK25_KEY = 'ege2_task25'
const DRAFT_KEY = 'ege2_task25_draft'

export interface Hint25 { concepts: string[]; chain: string; items: string[] }
export const HINTS = hintsJson as unknown as Record<string, Hint25>

export interface Task25 {
  variant: number
  topic: string
  /** три части условия: обоснование, вопрос, примеры */
  parts: [string, string, string]
  full: string
  joint: boolean
  /** требования в скобках к примерам (пункт 3) */
  exampleRules: string[]
}

const flat = (s: string) => s.replace(/\s+/g, ' ').trim()

export const TASKS25: Task25[] = bookVariants.flatMap((v) => {
  const t25 = v.part2.find((p) => p.num === 25)?.text
  if (!t25) return []
  const chunks = flat(t25).split(/\s(?=[123]\) [А-ЯЁ])/)
  if (chunks.length !== 4) return []
  const parts = chunks.slice(1).map((c) => c.replace(/^\d\)\s*/, '')) as [string, string, string]
  const topic = flat(v.part2.find((p) => p.num === 24)?.text ?? '').match(/«(.+?)»/)?.[1] ?? `Вариант ${v.variant}`
  const at = parts[2].search(/\((?:Каждый|В каждом)/)
  const rules = at >= 0 ? parts[2].slice(at + 1).replace(/\)\s*$/, '') : ''
  return [{
    variant: v.variant,
    topic,
    parts,
    full: chunks.slice(1).join('\n'),
    joint: jointRequired(parts.join(' ')),
    exampleRules: rules.split(/(?<=\.)\s+/).map((r) => r.trim()).filter(Boolean),
  }]
})

export interface Answer25 { justification: string; items: string[]; examples: string[] }
export const emptyAnswer = (): Answer25 => ({ justification: '', items: ['', '', ''], examples: ['', '', ''] })

export interface Hints25Used { concepts: boolean; chain: boolean; items: number; rules: boolean }
export const noHints = (): Hints25Used => ({ concepts: false, chain: false, items: 0, rules: false })
export const hintsCount = (h: Hints25Used) => Number(h.concepts) + Number(h.chain) + h.items + Number(h.rules)

export interface Attempt25 {
  ts: number
  date: string
  variant: number
  topic: string
  k1: number
  k2: number
  k3: number
  hints: number
  issues: Record<string, number>
  answer: Answer25
}

export const ISSUE25: Record<string, string> = {
  short: 'Обоснование слишком короткое (меньше двух предложений)',
  noKnowledge: 'Обоснование без опоры на обществоведческие знания',
  noLinks: 'Нет причинно-следственных связей',
  partialLinks: 'Связи в обосновании раскрыты не полностью',
  errors: 'Ошибки или неточности в обосновании',
  badItem: 'Неверная позиция в пункте 2',
  not_developed: 'Пример не развёрнут',
  mismatch: 'Пример не соответствует позиции',
  duplicate: 'Примеры повторяют друг друга',
  wrong: 'Фактическая ошибка в примере',
  requirement: 'Не выполнено требование задания к примеру',
  joint: 'Не выполнено «в совокупности» (разные функции/права/принципы)',
}

export function getAttempts25(): Attempt25[] {
  try {
    return JSON.parse(localStorage.getItem(TASK25_KEY) ?? '[]') as Attempt25[]
  } catch {
    return []
  }
}

export function saveAttempt25(t: Task25, a: Answer25, r: AiTask25, s: Score25, hints: number) {
  const issues: Record<string, number> = {}
  const bump = (k: string) => (issues[k] = (issues[k] ?? 0) + 1)
  const j = r.justification
  if (countSentences(a.justification) < 2) bump('short')
  else if (!j.usesKnowledge) bump('noKnowledge')
  else if (j.causalLinks === 'none') bump('noLinks')
  else if (j.causalLinks === 'partial') bump('partialLinks')
  if (j.hasErrors) bump('errors')
  r.items.forEach((x) => !x.ok && bump('badItem'))
  r.examples.forEach((x) => {
    if (!x.ok) bump(x.issue && x.issue !== 'none' && ISSUE25[x.issue] ? x.issue : 'mismatch')
  })
  if (t.joint && r.jointRequirementMet === false) bump('joint')
  const all = getAttempts25()
  all.unshift({ ts: Date.now(), date: todayStr(), variant: t.variant, topic: t.topic, k1: s.k1, k2: s.k2, k3: s.k3, hints, issues, answer: a })
  localStorage.setItem(TASK25_KEY, JSON.stringify(all))
  window.dispatchEvent(new CustomEvent('ege:progress-changed', { detail: { key: TASK25_KEY } }))
}

export interface Draft25 { answer: Answer25; hints: Hints25Used }
export function getDraft25(variant: number): Draft25 | null {
  try {
    return (JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Record<string, Draft25>)[variant] ?? null
  } catch {
    return null
  }
}
export function saveDraft25(variant: number, d: Draft25 | null) {
  try {
    const all = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Record<string, Draft25>
    if (d) all[variant] = d
    else delete all[variant]
    localStorage.setItem(DRAFT_KEY, JSON.stringify(all))
  } catch {
    /* localStorage недоступен — черновик не сохранится */
  }
}

export function checkTask25(t: Task25, a: Answer25): Promise<AiTask25> {
  return aiPost<AiTask25>({ mode: 'task25', taskText: t.full, justification: a.justification, items: a.items, examples: a.examples })
}
