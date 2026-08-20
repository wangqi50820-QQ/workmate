import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WorkstationWindow } from '../../src/renderer/src/windows/WorkstationWindow'
import { createSnapshot, createTestApi } from './fixtures'

describe('first-run onboarding', () => {
  it('normalizes work and salary settings before opening the workstation', async () => {
    const initial = createSnapshot({ onboardingComplete: false })
    const { api, spies } = createTestApi(initial)
    render(<WorkstationWindow api={api} initialSnapshot={initial} />)

    fireEvent.change(screen.getByLabelText('月薪'), {
      target: { value: '12000' },
    })
    fireEvent.change(screen.getByLabelText('发薪日'), {
      target: { value: '15' },
    })
    fireEvent.click(screen.getByLabelText('星期五'))
    fireEvent.click(screen.getByLabelText('星期六'))
    fireEvent.change(screen.getByLabelText('上班时间'), {
      target: { value: '08:30' },
    })
    fireEvent.change(screen.getByLabelText('午休开始'), {
      target: { value: '12:00' },
    })
    fireEvent.change(screen.getByLabelText('午休结束'), {
      target: { value: '13:00' },
    })
    fireEvent.change(screen.getByLabelText('下班时间'), {
      target: { value: '17:30' },
    })
    fireEvent.change(screen.getByLabelText('久坐提醒（分钟）'), {
      target: { value: '90' },
    })
    fireEvent.change(screen.getByLabelText('喝水提醒（分钟）'), {
      target: { value: '30' },
    })
    fireEvent.change(screen.getByLabelText('广播间隔（分钟）'), {
      target: { value: '120' },
    })
    fireEvent.click(screen.getByRole('button', { name: '开始和工友上班' }))

    await waitFor(() =>
      expect(spies.updateConfig).toHaveBeenCalledWith({
        onboardingComplete: true,
        monthlySalary: 12000,
        payday: 15,
        weekdays: [1, 2, 3, 4, 6],
        workStart: '08:30',
        lunchStart: '12:00',
        lunchEnd: '13:00',
        workEnd: '17:30',
        sedentaryMinutes: 90,
        waterMinutes: 30,
        broadcastMinutes: 120,
        alwaysOnTop: true,
        meetingMode: false,
        globalShortcut: 'CommandOrControl+Shift+H',
      }),
    )
    expect(
      await screen.findByRole('heading', { name: '工友的工位' }),
    ).toBeInTheDocument()
  })
})
