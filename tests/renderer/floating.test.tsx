import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FloatingWindow } from '../../src/renderer/src/windows/FloatingWindow'
import { createSnapshot, createTestApi } from './fixtures'

const renderFloating = () => {
  const initial = createSnapshot({ onboardingComplete: true })
  const testApi = createTestApi(initial)
  render(<FloatingWindow api={testApi.api} initialSnapshot={initial} />)
  return { initial, ...testApi }
}

describe('floating companion window', () => {
  it('updates the live salary without remounting the companion', async () => {
    const { initial, publish } = renderFloating()
    const companion = screen.getByRole('img', { name: '工友状态：陪着你' })
    expect(screen.getByText('¥126.38')).toBeInTheDocument()

    await act(async () => {
      publish({
        ...initial,
        generatedAt: '2026-08-20T10:00:01.000Z',
        salary: { ...initial.salary, earnedToday: 126.39 },
      })
    })

    expect(screen.getByText('¥126.39')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '工友状态：陪着你' })).toBe(
      companion,
    )
  })

  it('switches from salary to the off-work countdown', () => {
    renderFloating()

    fireEvent.click(
      screen.getByRole('button', { name: '切换为下班倒计时' }),
    )
    expect(screen.getByText('距下班 08:30:00')).toBeInTheDocument()
  })

  it('opens the workstation and follows the focus pose', async () => {
    const { initial, publish, spies } = renderFloating()

    fireEvent.click(screen.getByRole('button', { name: '打开工友的工位' }))
    await waitFor(() =>
      expect(spies.showWorkstation).toHaveBeenCalledTimes(1),
    )

    await act(async () => {
      publish({
        ...initial,
        focus: { ...initial.focus, phase: 'focus' },
      })
    })
    expect(
      screen.getByRole('img', { name: '工友状态：陪你专注' }),
    ).toBeInTheDocument()
  })
})
