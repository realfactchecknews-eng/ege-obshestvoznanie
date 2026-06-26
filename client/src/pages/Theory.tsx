import { useState } from 'react'
import { theory, terms } from '../lib/data'
import { getLearned, setLearned } from '../lib/storage'

export default function Theory() {
  const [open, setOpen] = useState<string | null>(null)
  const [learned, setL] = useState(getLearned())
  const [popup, setPopup] = useState<{ term: string; def: string } | null>(null)

  function termDef(term: string): string {
    const t = terms.find((x) => x.term.toLowerCase() === term.toLowerCase())
    return t?.definition ?? 'Определение появится в разделе «Термины».'
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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Теория</h1>
        <p className="text-muted text-sm">
          Изучено тем: <span className="text-good font-semibold">{learnedCount}</span> / {totalTopics}
        </p>
      </div>

      {theory.map((sec) => (
        <div key={sec.code} className="space-y-3">
          <h2 className="font-semibold text-accent2">
            {sec.code}. {sec.section}
          </h2>
          {sec.topics.map((t) => {
            const isOpen = open === t.id
            return (
              <div key={t.id} className="card overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : t.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-panel2 transition-colors"
                >
                  <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                  <span className="flex-1 font-medium">{t.title}</span>
                  {learned[t.id] && <span className="text-good text-sm">✓ изучено</span>}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 space-y-4">
                    <p className="whitespace-pre-line leading-relaxed text-[15px]">{t.text}</p>
                    <div className="flex flex-wrap gap-2">
                      {t.key_terms.map((kt) => (
                        <button
                          key={kt}
                          onClick={() => setPopup({ term: kt, def: termDef(kt) })}
                          className="px-3 py-1 rounded-full text-sm bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
                        >
                          {kt}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-border">
                      <input
                        type="checkbox"
                        className="accent-[#34d399] w-4 h-4"
                        checked={!!learned[t.id]}
                        onChange={() => toggleLearned(t.id)}
                      />
                      <span className="text-sm">Отметить как изученное</span>
                    </label>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {popup && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setPopup(null)}
        >
          <div className="card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-accent mb-2">{popup.term}</h3>
            <p className="leading-relaxed">{popup.def}</p>
            <button className="btn-ghost mt-4" onClick={() => setPopup(null)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
