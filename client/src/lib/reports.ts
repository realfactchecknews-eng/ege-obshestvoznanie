import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export const ADMIN_EMAIL = 'realfactchecknews@gmail.com'

export interface Report {
  id: string
  type: 'task' | 'bug'
  reason: string
  taskId?: number
  taskNumber?: number
  question?: string
  email?: string | null
  createdAt?: { toDate: () => Date } | null
}

/** Отправить жалобу на задание или общий баг-репорт. Тихо падает, если Firebase не настроен. */
export async function sendReport(input: {
  type: 'task' | 'bug'
  reason: string
  taskId?: number
  taskNumber?: number
  question?: string
  email?: string | null
}): Promise<{ error?: string }> {
  if (!db) return { error: 'Жалобы недоступны офлайн — попробуйте позже' }
  try {
    // Firestore не принимает undefined в полях — вырезаем их перед записью
    const data = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
    await addDoc(collection(db, 'reports'), { ...data, createdAt: serverTimestamp() })
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}
