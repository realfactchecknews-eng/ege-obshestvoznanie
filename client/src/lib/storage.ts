import type { AnswerResult, VariantResult } from '../types'

const K = {
  answers: 'ege_answers',
  learned: 'ege_learned',
  variants: 'ege_variants',
  flash: 'ege_flash',
  streak: 'ege_streak',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val))
  // уведомляем слой синхронизации, что прогресс изменился
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ege:progress-changed', { detail: { key } }))
  }
}

// Ключи, относящиеся к прогрессу ученика (для облачной синхронизации)
export const PROGRESS_KEYS = [K.answers, K.learned, K.variants, K.flash, K.streak]

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// ---- Answers / progress ----
export function getAnswers(): AnswerResult[] {
  return read<AnswerResult[]>(K.answers, [])
}
export function addAnswer(a: AnswerResult) {
  const all = getAnswers()
  all.push(a)
  write(K.answers, all)
  touchStreak()
}
export function clearAnswers() {
  write(K.answers, [])
}

// ---- Learned topics (theory) ----
export function getLearned(): Record<string, boolean> {
  return read(K.learned, {})
}
export function setLearned(id: string, val: boolean) {
  const l = getLearned()
  l[id] = val
  write(K.learned, l)
}

// ---- Variant history ----
export function getVariants(): VariantResult[] {
  return read<VariantResult[]>(K.variants, [])
}
export function addVariant(v: VariantResult) {
  const all = getVariants()
  all.unshift(v)
  write(K.variants, all)
  touchStreak()
}

// ---- Flashcards SRS (Leitner-lite) ----
export interface FlashState {
  // term -> { box: number, due: number(ts) }
  [term: string]: { box: number; due: number }
}
export function getFlash(): FlashState {
  return read<FlashState>(K.flash, {})
}
export function markFlash(term: string, known: boolean) {
  const f = getFlash()
  const cur = f[term] || { box: 0, due: 0 }
  const box = known ? Math.min(cur.box + 1, 5) : 0
  // интервалы в минутах по «коробкам»: 1м,10м,1д,3д,7д,16д
  const mins = [1, 10, 60 * 24, 60 * 24 * 3, 60 * 24 * 7, 60 * 24 * 16][box]
  f[term] = { box, due: Date.now() + mins * 60 * 1000 }
  write(K.flash, f)
}

// ---- Streak ----
interface Streak {
  count: number
  last: string // YYYY-MM-DD
}
export function getStreak(): Streak {
  return read<Streak>(K.streak, { count: 0, last: '' })
}
function touchStreak() {
  const s = getStreak()
  const today = todayStr()
  if (s.last === today) return
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  s.count = s.last === yesterday ? s.count + 1 : 1
  s.last = today
  write(K.streak, s)
}

export function solvedToday(): number {
  const today = todayStr()
  return getAnswers().filter((a) => a.date === today).length
}
