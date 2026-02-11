import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

const RETRY_DELAYS_MS = [120, 250, 400]

let inflightSessionPromise: Promise<Session | null> | null = null
let lastKnownSession: Session | null = null

export const isAbortError = (error: unknown) => {
  if (!error) return false
  const maybe = error as { name?: string; message?: string }
  return maybe.name === 'AbortError' || String(maybe.message || '').toLowerCase().includes('aborted')
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const loadSessionWithRetry = async (): Promise<Session | null> => {
  let lastError: unknown = null

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      lastKnownSession = data.session ?? null
      return data.session ?? null
    } catch (error) {
      lastError = error
      const abortError = isAbortError(error)
      const finalAttempt = attempt >= RETRY_DELAYS_MS.length

      if (!abortError) {
        throw error
      }

      if (finalAttempt) {
        if (lastKnownSession) return lastKnownSession
        throw error
      }

      await sleep(RETRY_DELAYS_MS[attempt])
    }
  }

  if (isAbortError(lastError) && lastKnownSession) {
    return lastKnownSession
  }
  if (lastError) throw lastError
  return null
}

export const setKnownSession = (session: Session | null) => {
  lastKnownSession = session
}

export const getSessionSafe = async () => {
  if (!inflightSessionPromise) {
    inflightSessionPromise = loadSessionWithRetry().finally(() => {
      inflightSessionPromise = null
    })
  }
  return inflightSessionPromise
}

export const getAccessTokenSafe = async () => {
  const session = await getSessionSafe()
  return session?.access_token || null
}
