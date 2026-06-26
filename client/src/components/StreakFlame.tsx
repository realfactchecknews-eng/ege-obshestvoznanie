import { useMemo } from 'react'
import { getAnswers, getStreak, getVariants } from '../lib/storage'

/**
 * Огонёк серии — сколько дней подряд ученик занимается на сайте.
 * Берёт streak из storage и строит полосу активности за последние 7 дней
 * на основе дат ответов и сданных вариантов.
 */

function activeDates(): Set<string> {
  const set = new Set<string>()
  for (const a of getAnswers()) set.add(a.date)
  for (const v of getVariants()) set.add(v.date)
  return set
}

function lastNDays(n: number): { date: string; label: string; active: boolean; today: boolean }[] {
  const active = activeDates()
  const todayStr = new Date().toISOString().slice(0, 10)
  const week = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const out: { date: string; label: string; active: boolean; today: boolean }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const iso = d.toISOString().slice(0, 10)
    out.push({ date: iso, label: week[d.getDay()], active: active.has(iso), today: iso === todayStr })
  }
  return out
}

export function StreakFlame({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const streak = getStreak()
  const days = useMemo(() => lastNDays(7), [])
  const count = streak.count
  const studiedToday = days[days.length - 1]?.active

  if (variant === 'compact') {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-panel2"
        title={`Серия: ${count} дн. подряд`}
      >
        <Flame size={16} lit={count > 0 && studiedToday} />
        <span className="text-sm font-bold tabular-nums">{count}</span>
      </div>
    )
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Flame size={48} lit={count > 0} />
        <div>
          <p className="text-3xl font-bold leading-none">
            {count} <span className="text-base font-medium text-text-soft">{plural(count)}</span>
          </p>
          <p className="text-sm text-text-soft mt-1">
            {count === 0
              ? 'Начни серию — позанимайся сегодня!'
              : studiedToday
              ? 'Серия продолжается. Так держать!'
              : 'Позанимайся сегодня, чтобы не прервать серию.'}
          </p>
        </div>
      </div>

      {/* Полоса активности за неделю */}
      <div className="flex items-end justify-between gap-1.5">
        {days.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1.5 flex-1">
            <div
              className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all
                ${d.active
                  ? 'bg-accent text-white shadow-accent'
                  : 'bg-panel2 border border-border-soft text-muted'}
                ${d.today ? 'ring-2 ring-accent/50' : ''}`}
            >
              {d.active ? (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-[10px]">·</span>
              )}
            </div>
            <span className={`text-[10px] ${d.today ? 'text-accent2 font-semibold' : 'text-muted'}`}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function plural(n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'день подряд'
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'дня подряд'
  return 'дней подряд'
}

/** SVG-огонёк. lit=false — серый (серия прервана). */
function Flame({ size = 32, lit = true }: { size?: number; lit?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={lit ? 'animate-pulse-soft' : ''}
      style={{ filter: lit ? 'drop-shadow(0 2px 6px rgba(251,146,60,0.45))' : 'none' }}
    >
      <defs>
        <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lit ? '#fbbf24' : '#9ca3af'} />
          <stop offset="55%" stopColor={lit ? '#fb923c' : '#9ca3af'} />
          <stop offset="100%" stopColor={lit ? '#ef4444' : '#6b7280'} />
        </linearGradient>
      </defs>
      <path
        d="M12 2c.5 3-2.5 4.5-2.5 7.5 0 1 .6 1.8 1.2 2.2.2-1.4 1-2.4 1.8-3.2.4 2 2.5 3 2.5 5.5A4.8 4.8 0 0 1 12 22a5 5 0 0 1-5-5c0-4 3.5-5.5 3-9 1 .8 1.7 1.7 2 2.7C15.6 4.8 12.8 3.6 12 2z"
        fill="url(#flameGrad)"
      />
    </svg>
  )
}
