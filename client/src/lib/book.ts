import bookJson from '../data/book_variants.json'

export interface BookTask {
  num: number
  answer: string
  kind: 'ordered' | 'unordered'
  image: boolean
  text: string | null
}
export interface BookVariant {
  variant: number
  tasks: BookTask[]
}

export const bookVariants = bookJson as BookVariant[]

/**
 * Проверка ответа части 1 по ключу из сборника.
 * Ответ — последовательность цифр. Для заданий на соответствие (ordered)
 * сравнение строгое по порядку; для заданий на выбор (unordered) — как множество.
 */
export function checkBookAnswer(task: BookTask, userInput: string): boolean {
  const u = userInput.replace(/\D/g, '')
  const a = task.answer.replace(/\D/g, '')
  if (!u || !a) return false
  if (task.kind === 'ordered') return u === a
  return u.split('').sort().join('') === a.split('').sort().join('')
}

export const kindLabel: Record<BookTask['kind'], string> = {
  ordered: 'Соответствие / порядок',
  unordered: 'Выбор нескольких',
}
