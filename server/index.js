// Express API для тренажёра ЕГЭ по обществознанию.
// Перед запуском выполните: npm install && npm run seed && npm start
import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'db', 'ege.db'))
const dataDir = join(__dirname, 'data')

const app = express()
app.use(cors())
app.use(express.json())

function parseTask(row) {
  const extra = JSON.parse(row.extra || '{}')
  return {
    id: row.id,
    year: row.year,
    task_number: row.task_number,
    type: row.type,
    topic: row.topic,
    subtopic: row.subtopic,
    question: row.question,
    options: JSON.parse(row.options || '[]'),
    correct_answer: row.correct_answer,
    explanation: row.explanation,
    source: row.source,
    ...extra,
  }
}

// GET /api/tasks?topic=&task_number=&limit=
app.get('/api/tasks', (req, res) => {
  const { topic, task_number, limit } = req.query
  let sql = 'SELECT * FROM tasks WHERE 1=1'
  const params = []
  if (topic) {
    sql += ' AND topic = ?'
    params.push(topic)
  }
  if (task_number) {
    sql += ' AND task_number = ?'
    params.push(Number(task_number))
  }
  sql += ' ORDER BY task_number'
  if (limit) {
    sql += ' LIMIT ?'
    params.push(Number(limit))
  }
  const rows = db.prepare(sql).all(...params)
  res.json(rows.map(parseTask))
})

// GET /api/tasks/variant — случайный вариант (по одному заданию на номер)
app.get('/api/tasks/variant', (_req, res) => {
  const variant = []
  for (let n = 1; n <= 25; n++) {
    const row = db
      .prepare('SELECT * FROM tasks WHERE task_number = ? ORDER BY RANDOM() LIMIT 1')
      .get(n)
    if (row) variant.push(parseTask(row))
  }
  res.json(variant)
})

// POST /api/progress — сохранить результат ответа
app.post('/api/progress', (req, res) => {
  const { task_id, task_number, topic, correct, date, ts } = req.body
  db.prepare(
    'INSERT INTO progress (task_id, task_number, topic, correct, date, ts) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(task_id, task_number, topic, correct ? 1 : 0, date, ts || Date.now())
  res.json({ ok: true })
})

// GET /api/progress/stats — статистика по темам и номерам
app.get('/api/progress/stats', (_req, res) => {
  const byTopic = db
    .prepare(
      'SELECT topic, COUNT(*) total, SUM(correct) correct FROM progress GROUP BY topic'
    )
    .all()
  const byNumber = db
    .prepare(
      'SELECT task_number, COUNT(*) total, SUM(correct) correct FROM progress GROUP BY task_number ORDER BY task_number'
    )
    .all()
  res.json({ byTopic, byNumber })
})

// GET /api/theory
app.get('/api/theory', (_req, res) => {
  res.json(JSON.parse(readFileSync(join(dataDir, 'theory.json'), 'utf-8')))
})

// GET /api/terms
app.get('/api/terms', (_req, res) => {
  res.json(JSON.parse(readFileSync(join(dataDir, 'terms.json'), 'utf-8')))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`API запущен: http://localhost:${PORT}`))
