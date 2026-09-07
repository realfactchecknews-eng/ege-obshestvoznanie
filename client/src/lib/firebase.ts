import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * Firebase (Auth + Firestore). Конфигурируется через переменные окружения Vite
 * (VITE_FIREBASE_*, см. .env.example). Бесплатный тариф Firebase не ставит
 * проект на паузу от простоя — в отличие от Supabase free tier, который отсюда съехал.
 *
 * Если переменные не заданы, всё ниже = null, и приложение работает офлайн на localStorage.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
}

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId)

let app: FirebaseApp | null = null
export let firebaseAuth: Auth | null = null
export let db: Firestore | null = null

if (isFirebaseConfigured) {
  app = initializeApp(config)
  firebaseAuth = getAuth(app)
  db = getFirestore(app)
}
