import { useState } from 'react'
import { useAuth } from '../lib/auth'

/**
 * Виджет авторизации в сайдбаре: кнопка «Войти» или email пользователя.
 * Если Supabase не настроен — показывает «офлайн-режим».
 */
export function AuthWidget() {
  const { user, configured, syncing, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  if (!configured) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted" title="Облачный аккаунт не настроен — прогресс хранится только в этом браузере">
        <span className="w-2 h-2 rounded-full bg-muted/60" />
        Офлайн-режим
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-accent-soft text-accent2 flex items-center justify-center text-xs font-bold shrink-0">
          {user.email?.charAt(0).toUpperCase() ?? 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{user.email}</p>
          <p className="text-[10px] text-muted">{syncing ? 'синхронизация…' : 'прогресс в облаке'}</p>
        </div>
        <button onClick={signOut} title="Выйти" className="text-muted hover:text-bad transition-colors shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-2">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
        </svg>
        Войти / Регистрация
      </button>
      {open && <AuthModal onClose={() => setOpen(false)} />}
    </>
  )
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setInfo(null)
    setBusy(true)
    const fn = mode === 'login' ? signIn : signUp
    const { error } = await fn(email.trim(), password)
    setBusy(false)
    if (error) {
      setErr(error)
    } else if (mode === 'register') {
      setInfo('Аккаунт создан. Если включено подтверждение email — проверьте почту, иначе можно войти сразу.')
      setMode('login')
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 overlay backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
      <div className="card p-6 max-w-sm w-full shadow-soft-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">
              {mode === 'login' ? 'Вход в аккаунт' : 'Регистрация'}
            </h3>
            <p className="text-xs text-muted">Прогресс сохранится в облаке на всех устройствах</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-muted font-medium">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-panel2 border border-border outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">Пароль</label>
            <input
              type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="не короче 6 символов"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-panel2 border border-border outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>

          {err && <p className="text-sm text-bad bg-bad/10 rounded-lg px-3 py-2">{err}</p>}
          {info && <p className="text-sm text-good bg-good/10 rounded-lg px-3 py-2">{info}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
            {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-muted">
          {mode === 'login' ? (
            <>Нет аккаунта?{' '}
              <button onClick={() => { setMode('register'); setErr(null) }} className="text-accent2 font-medium hover:underline">
                Создать
              </button>
            </>
          ) : (
            <>Уже есть аккаунт?{' '}
              <button onClick={() => { setMode('login'); setErr(null) }} className="text-accent2 font-medium hover:underline">
                Войти
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
