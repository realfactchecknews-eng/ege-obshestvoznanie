export type TaskType = 'single' | 'multiple' | 'matching' | 'fill' | 'written'

export interface Task {
  id: number
  year: number
  task_number: number
  type: TaskType
  topic: string
  subtopic: string
  question: string
  options: string[]
  options_letters?: boolean
  match_left?: string[]
  match_right?: string[]
  correct_answer: string
  criteria?: string[]
  explanation: string
  source: string
}

export interface TheoryTopic {
  id: string
  title: string
  text: string
  key_terms: string[]
}

export interface TheorySection {
  section: string
  code: string
  topics: TheoryTopic[]
}

export interface Term {
  term: string
  definition: string
  topic: string
}

export interface AnswerResult {
  taskId: number
  taskNumber: number
  topic: string
  correct: boolean
  date: string // ISO date (YYYY-MM-DD)
  ts: number
}

export interface VariantResult {
  id: string
  date: string
  totalScore: number
  maxScore: number
  byTopic: Record<string, { correct: number; total: number }>
  durationSec: number
}
