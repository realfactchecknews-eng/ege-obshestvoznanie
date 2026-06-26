import { useMemo } from 'react'
import { getAnswers, getStreak, solvedToday, getVariants } from '../lib/storage'
import { tasks, TOPICS } from '../lib/data'

const DAILY_GOAL = 15

export default function Dashboard({ go }: { go: (v: string) => void }) {
  const answers = getAnswers()
  const streak = getStreak()
  const today = solvedToday()
  const variants = getVariants()

  const stats = useMemo(() => {
    const total = answers.length
    const correct = answers.filter((a) => a.correct).length
    const pct = total ? Math.round((correct / total) * 100) : 0
    return { total, correct, pct }
  }, [answers])

  const byTopic = useMemo(() => {
    return TOPICS.map((t) => {
      const a = answers.filter((x) => x.topic === t)
      const c = a.filter((x) => x.correct).length
      return { topic: t, total: a.length, correct: c, pct: a.length ? Math.round((c / a.length) * 100) : null }
    })
  }, [answers])

  const goalPct = Math.min(100, Math.round((today / DAILY_GOAL) * 100))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Подготовка к ЕГЭ по обществознанию</h1>
        <p className="text-muted mt-1">Цель — 85+ баллов. Решай задания, разбирай теорию, закрывай слабые места.</p>
      </div>

      {/* верхние метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Решено сегодня" value={`${today} / ${DAILY_GOAL}`} accent>
          <div className="mt-2 h-2 rounded-full bg-bg overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${goalPct}%` }} />
          </div>
        </Stat>
        <Stat label="Серия дней подряд" value={`🔥 ${streak.count}`} />
        <Stat label="Всего решено" value={String(stats.total)} />
        <Stat label="Средний % верных" value={`${stats.pct}%`} />
      </div>

      {/* быстрые действия */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <ActionCard title="Задания" desc={`${tasks.length} реальных заданий ФИПИ`} onClick={() => go('practice')} />
        <ActionCard title="Теория" desc="6 разделов кодификатора" onClick={() => go('theory')} />
        <ActionCard title="Вариант целиком" desc="Таймер 3 ч 55 мин" onClick={() => go('variant')} />
        <ActionCard title="Слабые места" desc="Аналитика по темам" onClick={() => go('weak')} />
        <ActionCard title="Термины (карточки)" desc="Интервальное повторение" onClick={() => go('flash')} />
        <ActionCard title="Сбросить прогресс" desc="Очистить статистику" onClick={() => {
          if (confirm('Удалить всю статистику ответов?')) {
            localStorage.removeItem('ege_answers')
            location.reload()
          }
        }} />
      </div>

      {/* прогресс по темам */}
      <div className="card p-5">
        <h2 className="font-semibold mb-4">Прогресс по разделам</h2>
        <div className="space-y-3">
          {byTopic.map((t) => (
            <div key={t.topic}>
              <div className="flex justify-between text-sm mb-1">
                <span>{t.topic}</span>
                <span className="text-muted">
                  {t.pct === null ? 'нет данных' : `${t.pct}% (${t.correct}/${t.total})`}
                </span>
              </div>
              <div className="h-2 rounded-full bg-bg overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    t.pct === null ? '' : t.pct < 60 ? 'bg-bad' : t.pct < 80 ? 'bg-warn' : 'bg-good'
                  }`}
                  style={{ width: `${t.pct ?? 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {variants.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3">История вариантов</h2>
          <div className="space-y-2 text-sm">
            {variants.slice(0, 5).map((v) => (
              <div key={v.id} className="flex justify-between border-b border-border pb-2">
                <span className="text-muted">{v.date}</span>
                <span>
                  Часть 1: <span className="font-semibold text-accent">{v.totalScore}</span> / {v.maxScore} первичных
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent, children }: { label: string; value: string; accent?: boolean; children?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? 'text-accent' : ''}`}>{value}</p>
      {children}
    </div>
  )
}

function ActionCard({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card p-5 text-left hover:border-accent transition-colors group"
    >
      <p className="font-semibold group-hover:text-accent transition-colors">{title}</p>
      <p className="text-sm text-muted mt-1">{desc}</p>
    </button>
  )
}
