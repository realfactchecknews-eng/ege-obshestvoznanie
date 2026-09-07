import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { firebaseAuth, isFirebaseConfigured } from './firebase'
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

  async function onLogin(u: User) {
    setUser(u)
    setSyncing(true)
    try {
      await pullAndMerge(u.uid)
    } finally {
      setSyncing(false)
    }
    stopSync.current?.()
    stopSync.current = startAutoSync(u.uid)
  }

  function onLogout() {
    setUser(null)
    stopSync.current?.()
    stopSync.current = null
  }

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false)
      return
    }
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      if (u) onLogin(u)
      else onLogout()
      setLoading(false)
    })
    return () => {
      unsub()
      stopSync.current?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function signUp(email: string, password: string) {
    if (!firebaseAuth) return { error: 'Авторизация не настроена' }
    try {
      await createUserWithEmailAndPassword(firebaseAuth, email, password)
      return {}
    } catch (e) {
      return { error: translateError(e) }
    }
  }

  async function signIn(email: string, password: string) {
    if (!firebaseAuth) return { error: 'Авторизация не настроена' }
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password)
      return {}
    } catch (e) {
      return { error: translateError(e) }
    }
  }

  async function signOut() {
    if (firebaseAuth) await firebaseSignOut(firebaseAuth)
    onLogout()
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, configured: isFirebaseConfigured, syncing, signUp, signIn, signOut }}
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

function translateError(e: unknown): string {
  const code = e instanceof Error ? e.message : String(e)
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) return 'Неверный email или пароль'
  if (code.includes('auth/email-already-in-use')) return 'Этот email уже зарегистрирован'
  if (code.includes('auth/weak-password')) return 'Пароль должен быть не короче 6 символов'
  if (code.includes('auth/invalid-email')) return 'Некорректный email'
  if (code.includes('auth/user-not-found')) return 'Пользователь не найден'
  return code
}
