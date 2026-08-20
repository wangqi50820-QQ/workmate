import { useEffect, useState } from 'react'
import type {
  AppSnapshot,
  BroadcastPayload,
  GongyouApi,
} from '../../../shared/contracts'
import { AppStateProvider, useAppState } from '../app-state'
import '../styles/broadcast.css'

const currency = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
})

const durationText = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  return [
    Math.floor(safeSeconds / 3600),
    Math.floor((safeSeconds % 3600) / 60),
    safeSeconds % 60,
  ]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

const closeNativeWindow = (): void => window.close()

function BroadcastScene({
  initialReminder,
  onClose,
}: {
  initialReminder?: BroadcastPayload
  onClose(): void
}) {
  const { api, snapshot } = useAppState()
  const [reminder, setReminder] = useState<BroadcastPayload | null>(
    initialReminder ?? null,
  )

  useEffect(() => api.subscribeReminder(setReminder), [api])

  useEffect(() => {
    if (!reminder) return
    const deadline = Date.parse(reminder.shownAt) + 8_000
    const delay = Math.max(0, deadline - Date.now())
    const timer = window.setTimeout(onClose, delay)
    return () => window.clearTimeout(timer)
  }, [onClose, reminder])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!snapshot || !reminder) return null
  const { event } = reminder

  return (
    <main className={`broadcast-shell broadcast-shell--${event.kind}`}>
      <section className="broadcast-board" aria-live="assertive">
        <button className="broadcast-close" aria-label="关闭播报" onClick={onClose}>×</button>
        <span className="broadcast-kicker">打工列车 · 即时广播</span>
        <h1>{event.title}</h1>
        <p className="broadcast-message">{event.message}</p>
        <div className="broadcast-metrics">
          <div>
            <small>今天已经挣到</small>
            <strong>{currency.format(snapshot.salary.earnedToday)}</strong>
          </div>
          <div>
            <small>下一站</small>
            <strong>距下班 {durationText(snapshot.salary.secondsUntilWorkEnd)}</strong>
          </div>
        </div>
        <div className="broadcast-line" aria-hidden="true">
          <span />
          <i />
          <i />
          <i />
        </div>
        <small className="broadcast-hint">8 秒后自动收起 · Esc 立即关闭</small>
      </section>
    </main>
  )
}

export function BroadcastWindow({
  api,
  initialSnapshot,
  initialReminder,
  onClose = closeNativeWindow,
}: {
  api?: GongyouApi
  initialSnapshot?: AppSnapshot
  initialReminder?: BroadcastPayload
  onClose?: () => void
} = {}) {
  const resolvedApi = api ?? window.gongyou
  if (!resolvedApi) return null

  return (
    <AppStateProvider api={resolvedApi} initialSnapshot={initialSnapshot}>
      <BroadcastScene initialReminder={initialReminder} onClose={onClose} />
    </AppStateProvider>
  )
}
