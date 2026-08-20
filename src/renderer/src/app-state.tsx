import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppSnapshot, GongyouApi } from '../../shared/contracts'

interface AppStateContextValue {
  api: GongyouApi
  snapshot: AppSnapshot | null
  setSnapshot(snapshot: AppSnapshot): void
  loading: boolean
  error: string | null
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function AppStateProvider({
  api,
  initialSnapshot,
  children,
}: {
  api: GongyouApi
  initialSnapshot?: AppSnapshot
  children: ReactNode
}) {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(
    initialSnapshot ?? null,
  )
  const [loading, setLoading] = useState(initialSnapshot === undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const unsubscribe = api.subscribe((next) => {
      if (active) setSnapshot(next)
    })

    if (!initialSnapshot) {
      api
        .getSnapshot()
        .then((next) => {
          if (active) {
            setSnapshot(next)
            setError(null)
          }
        })
        .catch(() => {
          if (active) setError('工位状态暂时没读出来，请稍后重试。')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }

    return () => {
      active = false
      unsubscribe()
    }
  }, [api, initialSnapshot])

  const value = useMemo(
    () => ({ api, snapshot, setSnapshot, loading, error }),
    [api, snapshot, loading, error],
  )

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used inside AppStateProvider')
  }
  return context
}
