import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'
import { pullAndMerge, startAutoSync } from './sync'

interface AuthState {
  user: User | null
  loading: boolean
  configured: boolean
  syncing: boolean
  signUp: (email: string, password: string) => Promise<{ error?: string }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const stopSync = useRef<(() => void) | null>(null)

  // Запуск синхронизации при появлении пользователя
  async function onLogin(u: User) {
    setUser(u)
    setSyncing(true)
    try {
      await pullAndMerge(u.id)
    } finally {
      setSyncing(false)
    }
    stopSync.current?.()
    stopSync.current = startAutoSync(u.id)
  }

  function onLogout() {
    setUser(null)
    stopSync.current?.()
    stopSync.current = null
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) onLogin(data.session.user)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) onLogin(session.user)
      else onLogout()
    })
    return () => {
      sub.subscription.unsubscribe()
      stopSync.current?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function signUp(email: string, password: string) {
    if (!supabase) return { error: 'Авторизация не настроена' }
    const { error } = await supabase.auth.signUp({ email, password })
    return error ? { error: translateError(error.message) } : {}
  }

  async function signIn(email: string, password: string) {
    if (!supabase) return { error: 'Авторизация не настроена' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? { error: translateError(error.message) } : {}
  }

  async function signOut() {
    await supabase?.auth.signOut()
    onLogout()
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, configured: isSupabaseConfigured, syncing, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider')
  return ctx
}

function translateError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'Неверный email или пароль'
  if (m.includes('already registered')) return 'Этот email уже зарегистрирован'
  if (m.includes('password should be at least')) return 'Пароль должен быть не короче 6 символов'
  if (m.includes('unable to validate email')) return 'Некорректный email'
  if (m.includes('email not confirmed')) return 'Подтвердите email по ссылке из письма'
  return msg
}
