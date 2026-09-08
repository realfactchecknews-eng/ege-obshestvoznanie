import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Report } from '../lib/reports'

/** Админка: список жалоб на задания и баг-репортов (коллекция reports в Firestore). */
export default function Admin({ onOpenTask }: { onOpenTask: (id: number) => void }) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Report))
      setLoading(false)
    })
    return unsub
  }, [])

  async function remove(id: string) {
    if (!db) return
    await deleteDoc(doc(db, 'reports', id))
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Админка</h1>
        <p className="text-text-soft text-sm mt-1">
          Жалобы на задания и баг-репорты от пользователей ({reports.length})
        </p>
      </div>

      {loading && <p className="text-muted">Загрузка…</p>}
      {!loading && reports.length === 0 && (
        <div className="card p-10 text-center text-muted">Жалоб пока нет.</div>
      )}

      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="card p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`chip ${r.type === 'bug' ? '!bg-warn/15 !text-warn !border-warn/30' : ''}`}>
                {r.type === 'task' ? `Задание № ${r.taskNumber}` : 'Баг-репорт'}
              </span>
              {r.email && <span className="text-xs text-muted">{r.email}</span>}
              {r.createdAt && (
                <span className="text-xs text-muted ml-auto">
                  {r.createdAt.toDate().toLocaleString('ru-RU')}
                </span>
              )}
              {r.type === 'task' && r.taskId != null && (
                <button onClick={() => onOpenTask(r.taskId!)} className="text-xs text-accent2 hover:underline" title="Открыть задание">
                  Открыть задание →
                </button>
              )}
              <button onClick={() => remove(r.id)} className="text-muted hover:text-bad transition-colors" title="Удалить">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {r.question && (
              <p className="text-xs text-muted whitespace-pre-line line-clamp-2">{r.question}</p>
            )}
            <p className="text-sm">{r.reason}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
