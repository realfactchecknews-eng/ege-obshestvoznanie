import { useState } from 'react'
import type { ReactElement } from 'react'
import Dashboard from './pages/Dashboard'
import Theory from './pages/Theory'
import Practice from './pages/Practice'
import Variant from './pages/Variant'
import WeakSpots from './pages/WeakSpots'
import Flashcards from './pages/Flashcards'
import { useTheme } from './lib/theme'

type View = 'dashboard' | 'theory' | 'practice' | 'variant' | 'weak' | 'flash'

const NAV: { id: View; label: string; icon: () => ReactElement }[] = [
  { id: 'dashboard', label: 'Главная',     icon: () => <IconHome /> },
  { id: 'theory',    label: 'Теория',      icon: () => <IconBook /> },
  { id: 'practice',  label: 'Задания',     icon: () => <IconPencil /> },
  { id: 'variant',   label: 'Вариант',     icon: () => <IconTimer /> },
  { id: 'weak',      label: 'Слабые места', icon: () => <IconTarget /> },
  { id: 'flash',     label: 'Карточки',    icon: () => <IconCards /> },
]

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [weakTopics, setWeakTopics] = useState<string[] | undefined>(undefined)
  const { theme, toggle } = useTheme()

  function go(v: string) {
    setWeakTopics(undefined)
    setView(v as View)
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Сайдбар (десктоп) / верхняя навигация (мобайл) */}
      <aside className="md:w-64 md:min-h-screen bg-panel border-b md:border-b-0 md:border-r border-border md:sticky md:top-0 md:h-screen flex md:flex-col">
        {/* Логотип */}
        <div className="p-5 hidden md:flex items-center justify-between gap-2">
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
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>

        {/* Мобильная шапка */}
        <div className="md:hidden flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
                <path d="M12 3 L21 8 L12 13 L3 8 Z" fill="currentColor" />
              </svg>
            </div>
            <span className="font-bold text-sm">ЕГЭ Обществознание</span>
          </div>
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>

        {/* Навигация */}
        <nav className="flex md:flex-col gap-1 p-2 overflow-x-auto md:flex-1">
          {NAV.map((n) => {
            const active = view === n.id
            return (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-all
                  ${active
                    ? 'bg-accent-soft text-accent2 font-semibold border border-accent/30'
                    : 'text-text-soft hover:bg-panel2 hover:text-text border border-transparent'
                  }`}
              >
                <span className={`flex items-center justify-center w-5 h-5 ${active ? 'text-accent2' : 'text-muted'}`}>
                  {n.icon()}
                </span>
                {n.label}
              </button>
            )
          })}
        </nav>

        {/* Низ сайдбара — подпись */}
        <div className="hidden md:block p-4 border-t border-border-soft">
          <p className="text-xs text-muted">Цель: 85+ баллов</p>
          <p className="text-xs text-muted/70 mt-0.5">v2.0 · мятный редизайн</p>
        </div>
      </aside>

      {/* Контент */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full animate-fade-in">
        {view === 'dashboard' && <Dashboard go={go} />}
        {view === 'theory' && <Theory />}
        {view === 'practice' && <Practice initialTopics={weakTopics} />}
        {view === 'variant' && <Variant />}
        {view === 'weak' && (
          <WeakSpots
            practiceWeak={(topics) => {
              setWeakTopics(topics)
              setView('practice')
            }}
          />
        )}
        {view === 'flash' && <Flashcards />}
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
