// Заполнение SQLite базы данными из JSON-файлов.
// Запуск: npm run seed
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'data')

const db = new Database(join(__dirname, 'ege.db'))
db.pragma('journal_mode = WAL')

db.exec(`
  DROP TABLE IF EXISTS tasks;
  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    year INTEGER,
    task_number INTEGER,
    type TEXT,
    topic TEXT,
    subtopic TEXT,
    question TEXT,
    options TEXT,
    correct_answer TEXT,
    explanation TEXT,
    source TEXT,
    extra TEXT
  );

  CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    task_number INTEGER,
    topic TEXT,
    correct INTEGER,
    date TEXT,
    ts INTEGER
  );
`)

const tasks = JSON.parse(readFileSync(join(dataDir, 'tasks.json'), 'utf-8'))
const insert = db.prepare(`
  INSERT INTO tasks (id, year, task_number, type, topic, subtopic, question, options, correct_answer, explanation, source, extra)
  VALUES (@id, @year, @task_number, @type, @topic, @subtopic, @question, @options, @correct_answer, @explanation, @source, @extra)
`)

const tx = db.transaction((rows) => {
  for (const t of rows) {
    insert.run({
      id: t.id,
      year: t.year,
      task_number: t.task_number,
      type: t.type,
      topic: t.topic,
      subtopic: t.subtopic,
      question: t.question,
      options: JSON.stringify(t.options || []),
      correct_answer: t.correct_answer,
      explanation: t.explanation,
      source: t.source,
      extra: JSON.stringify({
        match_left: t.match_left,
        match_right: t.match_right,
        criteria: t.criteria,
        options_letters: t.options_letters,
      }),
    })
  }
})

tx(tasks)
console.log(`Загружено заданий: ${tasks.length}`)
db.close()
