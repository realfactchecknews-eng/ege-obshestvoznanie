import { useState } from 'react'
import { createPortal } from 'react-dom'
import { sendReport } from '../lib/reports'
import { useAuth } from '../lib/auth'

/**
 * Кнопка "Пожаловаться" — открывает мини-форму и шлёт жалобу в Firestore (reports).
 * task — если задание некорректно; без task — общий баг-репорт (плавающая кнопка).
 */
export function ReportButton({
  task,
  compact,
}: {
  task?: { id: number; task_number: number; question: string }
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={task ? 'Сообщить об ошибке в задании' : 'Сообщить о проблеме'}
        className={compact
          ? 'text-muted hover:text-bad transition-colors shrink-0'
          : 'text-xs text-muted hover:text-bad transition-colors flex items-center gap-1 shrink-0'}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        {!compact && 'Пожаловаться'}
      </button>
      {open && <ReportModal task={task} onClose={() => setOpen(false)} />}
    </>
  )
}

function ReportModal({
  task,
  onClose,
}: {
  task?: { id: number; task_number: number; question: string }
  onClose: () => void
}) {
  const { user } = useAuth()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) return
    setBusy(true)
    setErr(null)
    const res = await sendReport({
      type: task ? 'task' : 'bug',
      reason: reason.trim(),
      taskId: task?.id,
      taskNumber: task?.task_number,
      question: task?.question,
      email: user?.email,
    })
    setBusy(false)
    if (res.error) setErr(res.error)
    else setDone(true)
  }

  return createPortal(
    <div className="fixed inset-0 overlay backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
      <div className="card p-6 max-w-sm w-full shadow-soft-lg" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <p className="font-bold text-lg mb-2">Спасибо!</p>
            <p className="text-sm text-text-soft mb-4">Жалоба отправлена, мы посмотрим.</p>
            <button className="btn-primary w-full py-2.5" onClick={onClose}>Закрыть</button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <h3 className="font-bold text-lg">
              {task ? `Ошибка в задании № ${task.task_number}` : 'Сообщить о проблеме'}
            </h3>
            <textarea
              autoFocus
              rows={4}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={task ? 'Что не так с заданием?' : 'Опишите, что сломалось'}
              className="w-full px-3 py-2 rounded-lg bg-panel2 border border-border outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-y"
            />
            {err && <p className="text-sm text-bad bg-bad/10 rounded-lg px-3 py-2">{err}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1 py-2.5" onClick={onClose}>Отмена</button>
              <button type="submit" disabled={busy || !reason.trim()} className="btn-primary flex-1 py-2.5">
                {busy ? 'Отправка…' : 'Отправить'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
