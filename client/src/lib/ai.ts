import { supabase, isSupabaseConfigured } from './supabase'
import type { Task } from '../types'

export interface EssayCheck {
  perCriterion: { criterion: string; met: boolean; comment: string }[]
  score: number
  maxScore: number
  overall: string
}

export const aiAvailable = isSupabaseConfigured

/** Проверка письменного ответа через Edge Function check-essay (OpenAI на сервере). */
export async function checkEssay(task: Task, answer: string): Promise<EssayCheck> {
  if (!supabase) throw new Error('ИИ-проверка недоступна: не настроен Supabase')

  const { data, error } = await supabase.functions.invoke('check-essay', {
    body: {
      taskNumber: task.task_number,
      question: task.question,
      answer,
      criteria: task.criteria ?? [],
      modelAnswer: task.correct_answer,
    },
  })

  if (error) throw new Error(error.message)
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)
  return data as EssayCheck
}
