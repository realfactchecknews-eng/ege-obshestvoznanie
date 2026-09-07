import type { Task } from '../types'

export interface EssayCheck {
  perCriterion: { criterion: string; met: boolean; comment: string }[]
  score: number
  maxScore: number
  overall: string
}

/**
 * Свой эндпоинт проверки — Cloudflare Worker с ключом OpenRouter (см. cloudflare/check-essay-worker.js).
 * Контракт: POST JSON {taskNumber, question, answer, criteria, modelAnswer}
 * → JSON EssayCheck (или {error: string}).
 */
const AI_ENDPOINT: string = (import.meta.env.VITE_AI_ENDPOINT as string | undefined) ?? ''

export const aiAvailable = Boolean(AI_ENDPOINT)

/** Проверка письменного ответа через ИИ (Cloudflare Worker). */
export async function checkEssay(task: Task, answer: string): Promise<EssayCheck> {
  const body = {
    taskNumber: task.task_number,
    question: task.question,
    answer,
    criteria: task.criteria ?? [],
    modelAnswer: task.correct_answer,
  }

  if (!AI_ENDPOINT) throw new Error('ИИ-проверка недоступна: не настроен VITE_AI_ENDPOINT')

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
