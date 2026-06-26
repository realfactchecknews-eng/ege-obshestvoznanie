import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Theory from './pages/Theory'
import Practice from './pages/Practice'
import Variant from './pages/Variant'
import WeakSpots from './pages/WeakSpots'
import Flashcards from './pages/Flashcards'

type View = 'dashboard' | 'theory' | 'practice' | 'variant' | 'weak' | 'flash'

const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Главная', icon: '◈' },
  { id: 'theory', label: 'Теория', icon: '▤' },
  { id: 'practice', label: 'Задания', icon: '✎' },
  { id: 'variant', label: 'Вариант', icon: '⏱' },
  { id: 'weak', label: 'Слабые места', icon: '◔' },
  { id: 'flash', label: 'Карточки', icon: '⚏' },
]

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [weakTopics, setWeakTopics] = useState<string[] | undefined>(undefined)

  function go(v: string) {
    setWeakTopics(undefined)
    setView(v as View)
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* боковая навигация (десктоп) / верхняя (мобайл) */}
      <aside className="md:w-60 md:min-h-screen bg-panel border-b md:border-b-0 md:border-r border-border md:sticky md:top-0 md:h-screen">
        <div className="p-5 hidden md:block">
          <p className="font-bold text-lg leading-tight">
            ЕГЭ <span className="text-accent">Обществознание</span>
          </p>
          <p className="text-xs text-muted mt-1">Цель: 85+ баллов</p>
        </div>
        <nav className="flex md:flex-col gap-1 p-2 overflow-x-auto">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                view === n.id ? 'bg-accent/20 text-accent font-medium' : 'text-gray-300 hover:bg-panel2'
              }`}
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
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
