import { supabase } from './supabase'
import { PROGRESS_KEYS } from './storage'

/**
 * Облачная синхронизация прогресса.
 *
 * Прогресс хранится в Supabase в таблице user_progress одной строкой на пользователя:
 *   user_id uuid (PK, = auth.uid()), data jsonb, updated_at timestamptz.
 *
 * data — это объект { [localStorageKey]: parsedValue } для всех PROGRESS_KEYS.
 * При входе локальный и удалённый прогресс объединяются (merge), результат
 * пишется и локально, и в облако. Дальнейшие изменения отправляются с debounce.
 */

type Blob = Record<string, unknown>

function collectLocal(): Blob {
  const out: Blob = {}
  for (const key of PROGRESS_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw != null) {
      try {
        out[key] = JSON.parse(raw)
      } catch {
        /* пропускаем повреждённое значение */
      }
    }
  }
  return out
}

function applyToLocal(blob: Blob) {
  for (const key of PROGRESS_KEYS) {
    if (key in blob && blob[key] != null) {
      localStorage.setItem(key, JSON.stringify(blob[key]))
    }
  }
}

// --- Слияние конкретных структур прогресса ---
function mergeBlobs(local: Blob, remote: Blob): Blob {
  const merged: Blob = { ...remote, ...local }

  // ege_answers / ege_variants — массивы: объединяем и убираем дубли
  merged['ege_answers'] = dedupe(
    [...(asArray(remote['ege_answers'])), ...(asArray(local['ege_answers']))],
    (a) => `${a.taskId}:${a.ts}`
  )
  merged['ege_variants'] = dedupe(
    [...(asArray(remote['ege_variants'])), ...(asArray(local['ege_variants']))],
    (v) => String(v.id)
  )

  // ege_learned — объект bool: true побеждает
  merged['ege_learned'] = { ...asObj(remote['ege_learned']), ...asObj(local['ege_learned']) }

  // ege_flash — объект { term: { box, due } }: берём запись с большей коробкой
  const rf = asObj(remote['ege_flash']) as Record<string, { box: number; due: number }>
  const lf = asObj(local['ege_flash']) as Record<string, { box: number; due: number }>
  const flash: Record<string, { box: number; due: number }> = { ...rf }
  for (const [term, v] of Object.entries(lf)) {
    if (!flash[term] || v.box >= flash[term].box) flash[term] = v
  }
  merged['ege_flash'] = flash

  // ege_streak — берём с большим count / более поздней датой
  const rs = asObj(remote['ege_streak']) as { count?: number; last?: string }
  const ls = asObj(local['ege_streak']) as { count?: number; last?: string }
  merged['ege_streak'] = {
    count: Math.max(rs.count ?? 0, ls.count ?? 0),
    last: (rs.last ?? '') > (ls.last ?? '') ? rs.last : ls.last,
  }

  return merged
}

function asArray(v: unknown): any[] {
  return Array.isArray(v) ? v : []
}
function asObj(v: unknown): Record<string, any> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {}
}
function dedupe<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of arr) {
    const k = key(item)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(item)
    }
  }
  return out
}

/** Загрузить удалённый прогресс, слить с локальным, сохранить везде. */
export async function pullAndMerge(userId: string): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase
    .from('user_progress')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.warn('Sync pull error:', error.message)
    return
  }
  const remote = (data?.data as Blob) ?? {}
  const merged = mergeBlobs(collectLocal(), remote)
  applyToLocal(merged)
  await push(userId)
  // оповестим UI, что данные обновились
  window.dispatchEvent(new CustomEvent('ege:progress-synced'))
}

/** Выгрузить локальный прогресс в облако. */
export async function push(userId: string): Promise<void> {
  if (!supabase) return
  const blob = collectLocal()
  const { error } = await supabase
    .from('user_progress')
    .upsert({ user_id: userId, data: blob, updated_at: new Date().toISOString() })
  if (error) console.warn('Sync push error:', error.message)
}

/** Подписка на локальные изменения прогресса с debounce-выгрузкой. */
export function startAutoSync(userId: string): () => void {
  let timer: number | undefined
  const handler = () => {
    if (timer) window.clearTimeout(timer)
    timer = window.setTimeout(() => push(userId), 1500)
  }
  window.addEventListener('ege:progress-changed', handler)
  return () => {
    window.removeEventListener('ege:progress-changed', handler)
    if (timer) window.clearTimeout(timer)
  }
}
