import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkstationWindow } from '../../src/renderer/src/windows/WorkstationWindow'
import { createSnapshot, createTestApi } from './fixtures'

const renderWorkstation = () => {
  const initial = createSnapshot({ onboardingComplete: true })
  initial.memories = [
    {
      id: 'memory-1',
      userText: '方案又被改了',
      reply: '这确实够磨人。',
      createdAt: '2026-08-19T09:00:00.000Z',
      mentionedAt: null,
    },
  ]
  const testApi = createTestApi(initial)
  render(
    <WorkstationWindow api={testApi.api} initialSnapshot={initial} />,
  )
  return testApi
}

describe('companion workstation', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows live salary and opens the memory bottle', () => {
    renderWorkstation()

    expect(screen.getByText('¥126.38')).toBeInTheDocument()
    expect(screen.getByText('距发薪 12 天')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '打开记忆瓶' }))
    expect(
      screen.getByRole('heading', { name: '和工友说说' }),
    ).toBeInTheDocument()
  })

  it('starts focus and records a check-in and memo through the desktop API', async () => {
    const { spies } = renderWorkstation()

    fireEvent.click(screen.getByRole('button', { name: '开始专注' }))
    fireEvent.change(screen.getByLabelText('今天完成的小事'), {
      target: { value: '把日报发出去了' },
    })
    fireEvent.click(screen.getByRole('button', { name: '盖章' }))
    fireEvent.change(screen.getByLabelText('新便签'), {
      target: { value: '下午回客户电话' },
    })
    fireEvent.click(screen.getByRole('button', { name: '贴上便签' }))

    await waitFor(() => {
      expect(spies.dispatchFocus).toHaveBeenCalledWith({ type: 'start' })
      expect(spies.createCheckIn).toHaveBeenCalledWith('把日报发出去了')
      expect(spies.createMemo).toHaveBeenCalledWith({
        text: '下午回客户电话',
        remindAt: null,
      })
    })
  })

  it('counts an active focus session down from its absolute end time', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T10:00:00.000Z'))
    const initial = createSnapshot({ onboardingComplete: true })
    initial.focus = {
      ...initial.focus,
      phase: 'focus',
      endsAt: '2026-08-20T10:25:00.000Z',
      remainingSeconds: 25 * 60,
    }
    const { api } = createTestApi(initial)

    render(<WorkstationWindow api={api} initialSnapshot={initial} />)
    expect(screen.getByText('25:00')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(screen.getByText('24:59')).toBeInTheDocument()
  })

  it('deletes one memory and confirms before clearing the bottle', async () => {
    const { spies } = renderWorkstation()
    fireEvent.click(screen.getByRole('button', { name: '打开记忆瓶' }))

    fireEvent.click(
      screen.getByRole('button', { name: '删除记忆：方案又被改了' }),
    )
    await waitFor(() =>
      expect(spies.deleteMemory).toHaveBeenCalledWith('memory-1'),
    )

    fireEvent.click(screen.getByRole('button', { name: '清空记忆瓶' }))
    expect(spies.clearMemories).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '确认清空' }))
    await waitFor(() => expect(spies.clearMemories).toHaveBeenCalledTimes(1))
  })

  it('keeps settings in a separate panel', () => {
    renderWorkstation()

    expect(
      screen.queryByRole('heading', { name: '工位设置' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
    expect(
      screen.getByRole('heading', { name: '工位设置' }),
    ).toBeInTheDocument()
  })
})
