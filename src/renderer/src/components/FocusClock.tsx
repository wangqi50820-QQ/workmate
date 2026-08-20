import { useEffect, useState } from 'react'
import { useAppState } from '../app-state'
import {
  focusRemainingSeconds,
  type FocusEvent,
} from '../../../shared/domain/focus'

const clockText = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function FocusClock() {
  const { api, snapshot, setSnapshot } = useAppState()
  if (!snapshot) return null
  const focus = snapshot.focus
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    focusRemainingSeconds(focus, new Date()),
  )

  useEffect(() => {
    setRemainingSeconds(focusRemainingSeconds(focus, new Date()))
    if (
      (focus.phase !== 'focus' && focus.phase !== 'break') ||
      !focus.endsAt
    ) {
      return
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds(focusRemainingSeconds(focus, new Date()))
    }, 1_000)
    return () => window.clearInterval(timer)
  }, [focus])

  const dispatch = async (event: FocusEvent): Promise<void> => {
    setSnapshot(await api.dispatchFocus(event))
  }

  const primary =
    focus.phase === 'paused'
      ? { label: '继续专注', event: { type: 'resume' } as FocusEvent }
      : focus.phase === 'focus' || focus.phase === 'break'
        ? { label: '暂停专注', event: { type: 'pause' } as FocusEvent }
        : { label: '开始专注', event: { type: 'start' } as FocusEvent }

  return (
    <section className="desk-widget focus-clock" aria-labelledby="focus-title">
      <div className="widget-label" id="focus-title">桌面钟</div>
      <strong>{clockText(remainingSeconds)}</strong>
      <span>{focus.phase === 'focus' ? '工友陪你专心' : '25 分钟只做一件事'}</span>
      <div className="widget-actions">
        <button onClick={() => void dispatch(primary.event)}>{primary.label}</button>
        {focus.phase !== 'idle' ? (
          <button onClick={() => void dispatch({ type: 'reset' })}>重置</button>
        ) : null}
      </div>
    </section>
  )
}
