import { useState } from 'react'
import { theory, terms } from '../lib/data'
import { getLearned, setLearned } from '../lib/storage'

export default function Theory() {
  const [open, setOpen] = useState<string | null>(null)
  const [learned, setL] = useState(getLearned())
  const [popup, setPopup] = useState<{ term: string; def: string } | null>(null)

  function termDef(term: string): string {
    const t = terms.find((x) => x.term.toLowerCase() === term.toLowerCase())
    return t?.definition ?? 'Определение появится в разделе «Карточки».'
  }

  function toggleLearned(id: string) {
    const v = !learned[id]
    setLearned(id, v)
    setL({ ...learned, [id]: v })
  }

  const totalTopics = theory.reduce((s, sec) => s + sec.topics.length, 0)
  const learnedCount = theory.reduce(
    (s, sec) => s + sec.topics.filter((t) => learned[t.id]).length,
    0
  )
  const pct = totalTopics ? Math.round((learnedCount / totalTopics) * 100) : 0

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Заголовок */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Теория</h1>
          <p className="text-text-soft text-sm mt-1">
            6 разделов кодификатора · {totalTopics} тем
          </p>
        </div>
        <div className="card px-4 py-2 flex items-center gap-3">
          <div>
            <p className="text-xs text-muted">Изучено</p>
            <p className="font-bold text-accent2">
              {learnedCount} <span className="text-muted font-normal">/ {totalTopics}</span>
            </p>
          </div>
          <div className="w-16 h-1.5 rounded-full bg-panel2 overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Разделы */}
      {theory.map((sec) => (
        <div key={sec.code} className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <span className="w-7 h-7 rounded-lg bg-accent-soft text-accent2 font-bold text-sm flex items-center justify-center">
              {sec.code}
            </span>
            <h2 className="font-semibold text-lg">{sec.section}</h2>
          </div>
          {sec.topics.map((t) => {
            const isOpen = open === t.id
            const isLearned = !!learned[t.id]
            return (
              <div
                key={t.id}
                className={`card overflow-hidden transition-all ${isOpen ? 'shadow-soft-md border-accent/30' : ''}`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : t.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-panel2/60 transition-colors"
                >
                  <span className={`transition-transform text-accent2 ${isOpen ? 'rotate-90' : ''}`}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M8 5l8 7-8 7z" />
                    </svg>
                  </span>
                  <span className="flex-1 font-medium">{t.title}</span>
                  {isLearned && (
                    <span className="chip">
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      изучено
                    </span>
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border-soft">
                    <p className="whitespace-pre-line leading-relaxed text-[15px] text-text">
                      {t.text}
                    </p>
                    {t.key_terms.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted mb-2">Ключевые термины</p>
                        <div className="flex flex-wrap gap-2">
                          {t.key_terms.map((kt) => (
                            <button
                              key={kt}
                              onClick={() => setPopup({ term: kt, def: termDef(kt) })}
                              className="px-3 py-1.5 rounded-full text-sm bg-accent-soft text-accent2 border border-accent/30
                                         hover:bg-accent hover:text-white transition-all font-medium"
                            >
                              {kt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer pt-3 border-t border-border-soft">
                      <span className={`relative w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                        ${isLearned ? 'bg-accent border-accent' : 'border-border bg-panel2'}`}>
                        <input
                          type="checkbox"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          checked={isLearned}
                          onChange={() => toggleLearned(t.id)}
                        />
                        {isLearned && (
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className="text-sm select-none">Отметить как изученное</span>
                    </label>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* Попап термина */}
      {popup && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setPopup(null)}
        >
          <div className="card p-6 max-w-md w-full shadow-soft-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent2 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-accent2">{popup.term}</h3>
                <p className="text-xs text-muted">Определение</p>
              </div>
            </div>
            <p className="leading-relaxed text-text">{popup.def}</p>
            <button className="btn-primary mt-5 w-full" onClick={() => setPopup(null)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
