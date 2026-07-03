import { useEffect, useMemo, useState } from 'react'

/**
 * Заставка при загрузке: розовый слон мотает хоботом, затем лопается
 * как шарик (разлетаются розовые брызги) — и открывается сайт.
 * Клик в любом месте — пропустить.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<'swing' | 'pop' | 'out'>('swing')

  useEffect(() => {
    const t1 = setTimeout(() => setStage('pop'), 2100)
    const t2 = setTimeout(() => setStage('out'), 2750)
    const t3 = setTimeout(onDone, 3150)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  // брызги: 14 частиц с заранее посчитанными направлениями разлёта
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2
        const dist = 120 + (i % 3) * 60
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          size: 8 + (i % 4) * 5,
          color: ['#f9a8d4', '#f472b6', '#ec4899', '#fbcfe8'][i % 4],
          delay: (i % 5) * 30,
        }
      }),
    []
  )

  return (
    <div
      onClick={onDone}
      className={`fixed inset-0 z-[100] bg-bg flex flex-col items-center justify-center cursor-pointer select-none
        ${stage === 'out' ? 'splash-fade-out' : ''}`}
      title="Нажми, чтобы пропустить"
    >
      <div className="relative w-[240px] h-[220px] flex items-center justify-center">
        {/* Слон */}
        {stage !== 'out' && (
          <svg
            viewBox="0 0 240 200"
            className={`w-[220px] ${stage === 'pop' ? 'elephant-pop' : 'animate-float'}`}
          >
            {/* хвост */}
            <path d="M212 118 q14 2 10 16" stroke="#f472b6" strokeWidth="6" fill="none" strokeLinecap="round" />
            {/* задние ноги */}
            <rect x="168" y="140" width="22" height="44" rx="10" fill="#f472b6" />
            <rect x="128" y="146" width="22" height="40" rx="10" fill="#f9a8d4" />
            {/* тело */}
            <ellipse cx="150" cy="112" rx="68" ry="54" fill="#f9a8d4" />
            {/* передние ноги */}
            <rect x="96" y="142" width="22" height="44" rx="10" fill="#f472b6" />
            <rect x="66" y="138" width="22" height="46" rx="10" fill="#f9a8d4" />
            {/* голова */}
            <circle cx="66" cy="86" r="44" fill="#f9a8d4" />
            {/* ухо */}
            <ellipse cx="92" cy="80" rx="26" ry="32" fill="#f472b6" />
            <ellipse cx="94" cy="82" rx="16" ry="21" fill="#fbcfe8" />
            {/* глаз */}
            <circle cx="48" cy="76" r="5" fill="#831843" />
            <circle cx="46.5" cy="74.5" r="1.8" fill="#fff" />
            {/* щёчка */}
            <circle cx="42" cy="94" r="7" fill="#f472b6" opacity="0.55" />
            {/* хобот — качается */}
            <g className="trunk-swing">
              <path
                d="M38 96 q-26 10 -22 38 q3 22 22 26 q10 2 12 -6 q1.5 -7 -6 -9 q-11 -3 -12 -13 q-1.5 -16 14 -22 z"
                fill="#f9a8d4"
                stroke="#f472b6"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        )}

        {/* Брызги при лопании */}
        {stage === 'pop' &&
          particles.map((p, i) => (
            <span
              key={i}
              className="splash-particle"
              style={{
                width: p.size,
                height: p.size,
                background: p.color,
                animationDelay: `${p.delay}ms`,
                ['--dx' as string]: `${p.dx}px`,
                ['--dy' as string]: `${p.dy}px`,
              }}
            />
          ))}
      </div>

      <p className={`mt-4 text-sm text-muted transition-opacity duration-300 ${stage === 'swing' ? 'opacity-100' : 'opacity-0'}`}>
        Загружаем задания…
      </p>
    </div>
  )
}
