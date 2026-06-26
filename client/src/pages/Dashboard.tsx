import { useMemo } from 'react'
import { getAnswers, solvedToday, getVariants } from '../lib/storage'
import { tasks, TOPICS } from '../lib/data'
import { StreakFlame } from '../components/StreakFlame'

const DAILY_GOAL = 15

export default function Dashboard({ go }: { go: (v: string) => void }) {
  const answers = getAnswers()
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
      return {
        topic: t,
        total: a.length,
        correct: c,
        pct: a.length ? Math.round((c / a.length) * 100) : null,
      }
    })
  }, [answers])

  const goalPct = Math.min(100, Math.round((today / DAILY_GOAL) * 100))
  const goalDone = today >= DAILY_GOAL
  const greeting = greetingByHour()

  return (
    <div className="space-y-6 animate-slide-up">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-hero">
        <div className="relative p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <p className="text-sm text-accent2 font-medium">{greeting}</p>
              <h1 className="text-2xl md:text-3xl font-bold mt-1 text-balance">
                Готовимся к ЕГЭ по обществознанию
              </h1>
              <p className="text-text-soft mt-2 text-sm md:text-base max-w-xl">
                {goalDone
                  ? 'Дневная цель выполнена! Можно повторить сложные темы или пройти ещё вариант.'
                  : `Сегодня решено ${today} из ${DAILY_GOAL} заданий. Осталось ${Math.max(0, DAILY_GOAL - today)} — и цель дня закрыта.`}
              </p>
            </div>

            {/* Большое кольцо прогресса */}
            <div className="flex items-center gap-4">
              <ProgressRing
                value={goalPct}
                size={104}
                stroke={10}
                label={goalDone ? 'Цель!' : `${today}/${DAILY_GOAL}`}
                sublabel="сегодня"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== ОГОНЁК СЕРИИ ===== */}
      <StreakFlame />

      {/* ===== МЕТРИКИ ===== */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <MetricCard
          icon={<IconCheck />}
          label="Всего решено"
          value={stats.total}
          tone="neutral"
        />
        <MetricCard
          icon={<IconPercent />}
          label="Точность"
          value={stats.pct}
          suffix="%"
          tone={stats.pct >= 80 ? 'good' : stats.pct >= 60 ? 'warn' : stats.total > 0 ? 'bad' : 'neutral'}
        />
        <MetricCard
          icon={<IconTrophy />}
          label="Лучший балл"
          value={bestVariantScore(variants)}
          sublabel={bestVariantScore(variants) ? '/ 19 первичных' : 'нет вариантов'}
          tone="neutral"
        />
      </section>

      {/* ===== БЫСТРЫЕ ДЕЙСТВИЯ ===== */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Быстрый старт</h2>
          <p className="text-xs text-muted">выбери режим</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <ActionCard
            icon={<IconPencil />}
            title="Задания"
            desc={`${tasks.length} реальных заданий ФИПИ с проверкой и пояснениями`}
            onClick={() => go('practice')}
            accent
          />
          <ActionCard
            icon={<IconBook />}
            title="Теория"
            desc="6 разделов кодификатора с ключевыми терминами"
            onClick={() => go('theory')}
          />
          <ActionCard
            icon={<IconTimer />}
            title="Вариант целиком"
            desc="Полный экзамен: 3 ч 55 мин, таймер, авто-проверка"
            onClick={() => go('variant')}
          />
          <ActionCard
            icon={<IconTarget />}
            title="Слабые места"
            desc="Аналитика по темам и номерам заданий"
            onClick={() => go('weak')}
          />
          <ActionCard
            icon={<IconCards />}
            title="Карточки"
            desc="Интервальное повторение терминов (Leitner)"
            onClick={() => go('flash')}
          />
          <ActionCard
            icon={<IconReset />}
            title="Сбросить прогресс"
            desc="Очистить всю статистику ответов"
            onClick={() => {
              if (confirm('Удалить всю статистику ответов? Это действие нельзя отменить.')) {
                localStorage.removeItem('ege_answers')
                location.reload()
              }
            }}
            danger
          />
        </div>
      </section>

      {/* ===== ПРОГРЕСС ПО РАЗДЕЛАМ ===== */}
      <section className="card p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-lg">Прогресс по разделам</h2>
            <p className="text-xs text-muted mt-0.5">точность и количество решённых заданий</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {byTopic.map((t) => (
            <TopicRow key={t.topic} topic={t.topic} pct={t.pct} correct={t.correct} total={t.total} />
          ))}
        </div>
      </section>

      {/* ===== ИСТОРИЯ ВАРИАНТОВ ===== */}
      {variants.length > 0 && (
        <section className="card p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">История вариантов</h2>
            <p className="text-xs text-muted">последние {Math.min(5, variants.length)}</p>
          </div>
          <div className="space-y-2">
            {variants.slice(0, 5).map((v) => {
              const pct = v.maxScore ? Math.round((v.totalScore / v.maxScore) * 100) : 0
              const tone = pct >= 80 ? 'good' : pct >= 60 ? 'warn' : 'bad'
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border-soft bg-panel2/50 hover:bg-panel2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm
                      ${tone === 'good' ? 'bg-good/15 text-good' :
                        tone === 'warn' ? 'bg-warn/15 text-warn' :
                        'bg-bad/15 text-bad'}`}>
                      {pct}%
                    </div>
                    <div>
                      <p className="text-sm font-medium">{v.date}</p>
                      <p className="text-xs text-muted">{formatDuration(v.durationSec)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      <span className="text-accent2">{v.totalScore}</span>
                      <span className="text-muted"> / {v.maxScore}</span>
                    </p>
                    <p className="text-xs text-muted">часть 1</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

/* ============================================================
   ХЕЛПЕРЫ
   ============================================================ */
function greetingByHour() {
  const h = new Date().getHours()
  if (h < 6) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return `${m} мин ${s.toString().padStart(2, '0')} сек`
  const h = Math.floor(m / 60)
  return `${h} ч ${m % 60} мин`
}

function bestVariantScore(variants: ReturnType<typeof getVariants>) {
  if (!variants.length) return 0
  return Math.max(...variants.map((v) => v.totalScore))
}

/* ============================================================
   КОМПОНЕНТЫ
   ============================================================ */

/** Кольцо прогресса (SVG, без зависимостей) */
function ProgressRing({
  value,
  size = 100,
  stroke = 8,
  label,
  sublabel,
}: {
  value: number
  size?: number
  stroke?: number
  label: string
  sublabel?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--border)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--accent)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold leading-none">{label}</span>
        {sublabel && <span className="text-[10px] text-muted mt-1 uppercase tracking-wide">{sublabel}</span>}
      </div>
    </div>
  )
}

/** Карточка метрики */
function MetricCard({
  icon, label, value, sublabel, suffix, tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sublabel?: string
  suffix?: string
  tone?: 'accent' | 'good' | 'warn' | 'bad' | 'neutral'
}) {
  const toneCls = {
    accent: 'text-accent2 bg-accent-soft',
    good: 'text-good bg-good/10',
    warn: 'text-warn bg-warn/10',
    bad: 'text-bad bg-bad/10',
    neutral: 'text-accent2 bg-accent-soft',
  }[tone]

  return (
    <div className="card p-4 hover:shadow-soft-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted font-medium uppercase tracking-wide">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${toneCls}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-bold mt-2">
        {value}
        {suffix && <span className="text-base font-medium ml-1">{suffix}</span>}
      </p>
      {sublabel && <p className="text-xs text-muted mt-1">{sublabel}</p>}
    </div>
  )
}

/** Карточка быстрого действия */
function ActionCard({
  icon, title, desc, onClick, accent, danger,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  onClick: () => void
  accent?: boolean
  danger?: boolean
}) {
  const cls = accent
    ? 'border-accent/30 bg-accent-soft/40 hover:bg-accent-soft hover:border-accent hover:shadow-accent'
    : danger
    ? 'border-border hover:border-bad/40 hover:bg-bad/5'
    : 'hover:border-accent/40 hover:shadow-soft-md'

  return (
    <button
      onClick={onClick}
      className={`card p-5 text-left transition-all group ${cls}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
          ${accent ? 'bg-accent text-white' :
            danger ? 'bg-bad/10 text-bad group-hover:bg-bad group-hover:text-white' :
            'bg-accent-soft text-accent2 group-hover:bg-accent group-hover:text-white'}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${danger ? 'text-text' : ''} group-hover:text-accent2 transition-colors`}>
            {title}
          </p>
          <p className="text-sm text-text-soft mt-1 leading-snug">{desc}</p>
        </div>
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-muted group-hover:text-accent2 group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
             fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </button>
  )
}

/** Строка прогресса по разделу */
function TopicRow({ topic, pct, correct, total }: { topic: string; pct: number | null; correct: number; total: number }) {
  const color = pct === null ? 'bg-muted/40' : pct < 60 ? 'bg-bad' : pct < 80 ? 'bg-warn' : 'bg-good'
  const textColor = pct === null ? 'text-muted' : pct < 60 ? 'text-bad' : pct < 80 ? 'text-warn' : 'text-good'

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm font-medium">{topic}</span>
        <span className={`text-sm font-semibold ${textColor}`}>
          {pct === null ? <span className="text-muted font-normal">нет данных</span> : `${pct}%`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-panel2 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
      {total > 0 && (
        <p className="text-xs text-muted mt-1">{correct} из {total} верно</p>
      )}
    </div>
  )
}

/* ============================================================
   ИКОНКИ (inline SVG)
   ============================================================ */
const IC = "w-4 h-4"
const IC_LG = "w-5 h-5"
const STROKE = { strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={IC} {...STROKE}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}
function IconPercent() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={IC} {...STROKE}>
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  )
}
function IconTrophy() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={IC} {...STROKE}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3" />
      <path d="M9 14h6l-1 4h-4l-1-4zM8 22h8" />
    </svg>
  )
}
function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={IC_LG} {...STROKE}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}
function IconBook() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={IC_LG} {...STROKE}>
      <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z" />
      <path d="M4 19a2 2 0 0 0 2 2h12" />
      <path d="M9 7h6M9 11h6" />
    </svg>
  )
}
function IconTimer() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={IC_LG} {...STROKE}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2M9 2h6M12 2v3" />
    </svg>
  )
}
function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={IC_LG} {...STROKE}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}
function IconCards() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={IC_LG} {...STROKE}>
      <rect x="3" y="6" width="14" height="14" rx="2" />
      <rect x="7" y="3" width="14" height="14" rx="2" />
    </svg>
  )
}
function IconReset() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={IC_LG} {...STROKE}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}
