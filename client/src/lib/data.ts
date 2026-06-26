import tasksJson from '../data/tasks.json'
import theoryJson from '../data/theory.json'
import termsJson from '../data/terms.json'
import type { Task, TheorySection, Term } from '../types'

export const tasks = tasksJson as Task[]
export const theory = theoryJson as TheorySection[]
export const terms = termsJson as Term[]

export const TOPICS = [
  'Человек и общество',
  'Духовная культура',
  'Экономика',
  'Социальные отношения',
  'Политика',
  'Право',
]

export function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ')
}

// Проверка ответа части 1 (single/multiple/matching/fill)
export function checkAnswer(task: Task, userAnswer: string): boolean {
  const correct = task.correct_answer
  if (task.type === 'fill' || (task.type === 'single' && task.options_letters === false)) {
    return normalize(userAnswer) === normalize(correct)
  }
  if (task.type === 'single') {
    // ответ — выбранный текст варианта; сверяем с correct_answer (текст)
    return normalize(userAnswer) === normalize(correct)
  }
  // multiple / matching: строка цифр; сравниваем как множество для multiple, по порядку для matching
  if (task.type === 'multiple') {
    const a = userAnswer.split('').filter((c) => /\d/.test(c)).sort().join('')
    const b = correct.split('').sort().join('')
    return a === b
  }
  // matching: точное совпадение строки по порядку
  return userAnswer.replace(/\D/g, '') === correct.replace(/\D/g, '')
}

export function taskNumberTitle(n: number): string {
  return `Задание ${n}`
}

// Сборка варианта: по одному заданию на каждый номер 1..25, где есть задания
export function buildVariant(): Task[] {
  const byNum = new Map<number, Task[]>()
  for (const t of tasks) {
    if (!byNum.has(t.task_number)) byNum.set(t.task_number, [])
    byNum.get(t.task_number)!.push(t)
  }
  const variant: Task[] = []
  for (let n = 1; n <= 25; n++) {
    const pool = byNum.get(n)
    if (pool && pool.length) {
      variant.push(pool[Math.floor(Math.random() * pool.length)])
    }
  }
  return variant.sort((a, b) => a.task_number - b.task_number)
}

export const LETTERS = ['1', '2', '3', '4', '5', '6', '7', '8']
