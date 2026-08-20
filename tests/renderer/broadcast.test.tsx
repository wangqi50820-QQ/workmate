import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routeReminderDelivery } from '../../src/main/ipc'
import { BroadcastWindow } from '../../src/renderer/src/windows/BroadcastWindow'
import type { BroadcastPayload } from '../../src/shared/contracts'
import type { ReminderEvent } from '../../src/shared/domain/reminders'
import { createSnapshot, createTestApi } from './fixtures'

const salaryEvent: ReminderEvent = {
  key: 'salary:2026-08-20T10:00',
  kind: 'salary',
  title: '今日工钱进度',
  message: '今天已经稳稳挣到 ¥126.38。',
}

const payload = (event: ReminderEvent): BroadcastPayload => ({
  event,
  shownAt: '2026-08-20T10:00:00.000Z',
})

const renderBroadcast = (
  event: ReminderEvent,
  onClose: () => void = vi.fn(),
) => {
  const initial = createSnapshot({ onboardingComplete: true })
  const testApi = createTestApi(initial)
  render(
    <BroadcastWindow
      api={testApi.api}
      initialSnapshot={initial}
      initialReminder={payload(event)}
      onClose={onClose}
    />,
  )
  return { initial, ...testApi }
}

describe('workday broadcast window', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the live amount and off-work countdown for a salary event', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T10:00:00.000Z'))
    renderBroadcast(salaryEvent)

    expect(screen.getByRole('heading', { name: '今日工钱进度' })).toBeInTheDocument()
    expect(screen.getByText('¥126.38')).toBeInTheDocument()
    expect(screen.getByText('距下班 08:30:00')).toBeInTheDocument()
  })

  it('shows the memo text as the primary event', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T10:00:00.000Z'))
    renderBroadcast({
      key: 'memo:memo-1',
      kind: 'memo',
      title: '便签到点了',
      message: '给客户回电话',
    })

    expect(screen.getByText('给客户回电话')).toBeInTheDocument()
  })

  it('uses only a system notification for full-screen-silent meeting mode', () => {
    const showBroadcast = vi.fn()
    const showNotification = vi.fn()

    routeReminderDelivery(salaryEvent, true, {
      showBroadcast,
      showNotification,
    })

    expect(showBroadcast).not.toHaveBeenCalled()
    expect(showNotification).toHaveBeenCalledWith(salaryEvent)
  })

  it('closes against the original eight-second deadline and on Escape', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T10:00:00.000Z'))
    const onClose = vi.fn()
    renderBroadcast(salaryEvent, onClose)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_999)
    })
    expect(onClose).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
