import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Клиент Supabase. Конфигурируется через переменные окружения Vite:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * Если переменные не заданы (например, до настройки проекта), клиент = null,
 * и приложение работает в офлайн-режиме на localStorage. Авторизация и ИИ-проверка
 * включаются автоматически, как только ключи появятся в сборке.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anon)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anon!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
