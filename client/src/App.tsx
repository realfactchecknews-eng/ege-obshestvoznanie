import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import Dashboard from './pages/Dashboard'
import Theory from './pages/Theory'
import Practice from './pages/Practice'
import Variant from './pages/Variant'
import BookVariants from './pages/BookVariants'
import WeakSpots from './pages/WeakSpots'
import Flashcards from './pages/Flashcards'
import { useTheme } from './lib/theme'
import { StreakFlame } from './components/StreakFlame'
import { AuthWidget } from './components/AuthWidget'

type View = 'dashboard' | 'theory' | 'practice' | 'variant' | 'book' | 'weak' | 'flash'

const NAV: { id: View; label: string; icon: () => ReactElement }[] = [
  { id: 'dashboard', label: 'Главная',     icon: () => <IconHome /> },
  { id: 'theory',    label: 'Теория',      icon: () => <IconBook /> },
  { id: 'practice',  label: 'Задания',     icon: () => <IconPencil /> },
  { id: 'book',      label: 'Сборник 30',  icon: () => <IconStack /> },
  { id: 'variant',   label: 'Вариант',     icon: () => <IconTimer /> },
  { id: 'weak',      label: 'Слабые места', icon: () => <IconTarget /> },
  { id: 'flash',     label: 'Карточки',    icon: () => <IconCards /> },
]

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [weakTopics, setWeakTopics] = useState<string[] | undefined>(undefined)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const navRef = useRef<HTMLElement>(null)
  const btnRefs = useRef<Map<View, HTMLButtonElement>>(new Map())
  const [indicator, setIndicator] = useState<{ top: number; left: number; width: number; height: number } | null>(null)

  function go(v: string) {
    setWeakTopics(undefined)
    setView(v as View)
    setDrawerOpen(false)
  }

  // Блокируем прокрутку фона, пока открыт мобильный drawer
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  // viewRef всегда содержит АКТУАЛЬНОЕ значение view — обработчик resize/observer
  // ниже создаётся один раз при монтировании и не должен захватывать view в замыкании,
  // иначе при смене вкладки во время ресайза плашка может "уехать" на старую позицию.
  const viewRef = useRef(view)
  viewRef.current = view

  function recalcIndicator() {
    const btn = btnRefs.current.get(viewRef.current)
    if (!btn) return
    setIndicator({ top: btn.offsetTop, left: btn.offsetLeft, width: btn.offsetWidth, height: btn.offsetHeight })
  }

  useLayoutEffect(() => {
    recalcIndicator()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // Пересчитать позицию плашки при ресайзе/переключении мобильной-десктопной раскладки.
  // Подписка живёт один раз за всё время жизни компонента (не пересоздаётся при смене view),
  // поэтому обработчик всегда читает актуальный view через viewRef — гонки исключены.
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const ro = new ResizeObserver(() => recalcIndicator())
    ro.observe(nav)
    window.addEventListener('resize', recalcIndicator)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recalcIndicator)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Мобильная шапка с гамбургером (fixed сверху) */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between p-3 bg-panel/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Открыть меню"
            className="w-9 h-9 rounded-lg border border-border bg-panel2 flex items-center justify-center
                       text-text-soft hover:text-accent2 hover:border-accent/40 transition-all active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
              <path d="M12 3 L21 8 L12 13 L3 8 Z" fill="currentColor" />
            </svg>
          </div>
          <span className="font-bold text-sm">ЕГЭ Обществознание</span>
        </div>
        <ThemeToggle theme={theme} onToggle={toggle} />
      </header>

      {/* Затемнение под мобильным drawer */}
      <div
        onClick={() => setDrawerOpen(false)}
        className={`md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300
          ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Сайдбар: на десктопе — статичный, на мобильном — выезжающий drawer */}
      <aside
        className={`bg-panel border-border flex flex-col
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r shadow-soft-lg
          transition-transform duration-300 ease-smooth
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:w-64 md:min-h-screen md:sticky md:top-0 md:h-screen md:shadow-none`}
      >
        {/* Логотип */}
        <div className="p-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center shadow-accent">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
                <path d="M12 3 L21 8 L12 13 L3 8 Z" fill="currentColor" opacity="0.95" />
                <path d="M3 12 L12 17 L21 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.7" />
                <path d="M3 16 L12 21 L21 16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.45" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-base leading-tight">ЕГЭ</p>
              <p className="text-xs text-accent2 font-medium -mt-0.5">Обществознание</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:block"><ThemeToggle theme={theme} onToggle={toggle} /></span>
            {/* Кнопка закрытия drawer (только мобайл) */}
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Закрыть меню"
              className="md:hidden w-9 h-9 rounded-lg border border-border bg-panel2 flex items-center justify-center
                         text-text-soft hover:text-bad hover:border-bad/40 transition-all active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Навигация */}
        <nav ref={navRef} className="relative flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
          {/* Плавно скользящая плашка активного пункта */}
          {indicator && (
            <div
              className="absolute rounded-lg bg-accent-soft border border-accent/30 pointer-events-none"
              style={{
                top: indicator.top,
                left: indicator.left,
                width: indicator.width,
                height: indicator.height,
                transition: 'top 0.35s var(--ease-spring), left 0.35s var(--ease-spring), width 0.35s var(--ease-spring), height 0.35s var(--ease-spring)',
              }}
            />
          )}
          {NAV.map((n) => {
            const active = view === n.id
            return (
              <button
                key={n.id}
                ref={(el) => {
                  if (el) btnRefs.current.set(n.id, el)
                  else btnRefs.current.delete(n.id)
                }}
                onClick={() => go(n.id)}
                className={`relative z-10 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors duration-200
                  ${active
                    ? 'text-accent2 font-semibold'
                    : 'text-text-soft hover:bg-panel2 hover:text-text'
                  }`}
              >
                <span className={`flex items-center justify-center w-5 h-5 transition-transform duration-300 ${active ? 'text-accent2 scale-110' : 'text-muted'}`}>
                  {n.icon()}
                </span>
                {n.label}
              </button>
            )
          })}
        </nav>

        {/* Низ сайдбара — аккаунт + огонёк серии + подпись */}
        <div className="p-4 border-t border-border-soft space-y-3">
          <AuthWidget />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">Серия</span>
            <StreakFlame variant="compact" />
          </div>
          <div>
            <p className="text-xs text-muted">Цель: 85+ баллов</p>
            <p className="text-xs text-muted/70 mt-0.5">v2.1 · аккаунт + ИИ</p>
          </div>
        </div>
      </aside>

      {/* Контент (отступ сверху на мобильном — под fixed-шапку) */}
      <main className="flex-1 p-4 pt-[72px] md:p-8 md:pt-8 max-w-6xl mx-auto w-full">
        <div key={view} className="animate-slide-up">
          {view === 'dashboard' && <Dashboard go={go} />}
          {view === 'theory' && <Theory />}
          {view === 'practice' && <Practice initialTopics={weakTopics} />}
          {view === 'variant' && <Variant />}
          {view === 'book' && <BookVariants />}
          {view === 'weak' && (
            <WeakSpots
              practiceWeak={(topics) => {
                setWeakTopics(topics)
                setView('practice')
              }}
            />
          )}
          {view === 'flash' && <Flashcards />}
        </div>
      </main>
    </div>
  )
}

/* ============================================================
   Переключатель темы
   ============================================================ */
function ThemeToggle({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      className="w-9 h-9 rounded-lg border border-border bg-panel2 hover:bg-accent-soft hover:border-accent/40
                 flex items-center justify-center transition-all text-text-soft hover:text-accent2"
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}

/* ============================================================
   Иконки навигации (inline SVG, не emoji)
   ============================================================ */
const ICON_PROPS = "w-[18px] h-[18px]"
const STROKE = { strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={ICON_PROPS} {...STROKE}>
      <path d="M3 12 12 4l9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  )
}

function IconBook() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={ICON_PROPS} {...STROKE}>
      <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z" />
      <path d="M4 19a2 2 0 0 0 2 2h12" />
      <path d="M9 7h6M9 11h6" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={ICON_PROPS} {...STROKE}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}

function IconTimer() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={ICON_PROPS} {...STROKE}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2M9 2h6M12 2v3" />
    </svg>
  )
}

function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={ICON_PROPS} {...STROKE}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

function IconCards() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={ICON_PROPS} {...STROKE}>
      <rect x="3" y="6" width="14" height="14" rx="2" />
      <rect x="7" y="3" width="14" height="14" rx="2" />
    </svg>
  )
}

function IconStack() {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" className={ICON_PROPS} {...STROKE}>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  )
}
