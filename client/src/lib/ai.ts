import { supabase, isSupabaseConfigured } from './supabase'
import type { Task } from '../types'

export interface EssayCheck {
  perCriterion: { criterion: string; met: boolean; comment: string }[]
  score: number
  maxScore: number
  overall: string
}

/**
 * Свой эндпоинт проверки (например, Cloudflare Worker с ключом OpenRouter).
 * Если задан VITE_AI_ENDPOINT — используется он; иначе Supabase Edge Function.
 * Контракт эндпоинта: POST JSON {taskNumber, question, answer, criteria, modelAnswer}
 * → JSON EssayCheck (или {error: string}).
 */
const AI_ENDPOINT: string = (import.meta.env.VITE_AI_ENDPOINT as string | undefined) ?? ''

export const aiAvailable = Boolean(AI_ENDPOINT) || isSupabaseConfigured

/** Проверка письменного ответа через ИИ (Cloudflare Worker или Supabase Edge Function). */
export async function checkEssay(task: Task, answer: string): Promise<EssayCheck> {
  const body = {
    taskNumber: task.task_number,
    question: task.question,
    answer,
    criteria: task.criteria ?? [],
    modelAnswer: task.correct_answer,
  }

  if (AI_ENDPOINT) {
    const resp = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!resp.ok) throw new Error(`Сервис проверки недоступен (${resp.status})`)
    const data = (await resp.json()) as EssayCheck & { error?: string }
    if (data.error) throw new Error(data.error)
    return data
  }

  if (!supabase) throw new Error('ИИ-проверка недоступна: не настроен Supabase')

  const { data, error } = await supabase.functions.invoke('check-essay', { body })

  if (error) throw new Error(error.message)
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)
  return data as EssayCheck
}
