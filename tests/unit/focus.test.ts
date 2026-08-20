import { describe, expect, it } from 'vitest'
import { defaultAppState } from '../../src/shared/domain/config'
import {
  focusRemainingSeconds,
  reduceFocus,
} from '../../src/shared/domain/focus'

const idleFocus = () =>
  defaultAppState(new Date('2026-08-20T00:00:00.000Z')).focus

describe('absolute-time Pomodoro state', () => {
  it('starts a 25 minute focus session with an absolute end', () => {
    const started = reduceFocus(
      idleFocus(),
      { type: 'start' },
      new Date('2026-08-20T09:00:00.000Z'),
    )

    expect(started.phase).toBe('focus')
    expect(started.endsAt).toBe('2026-08-20T09:25:00.000Z')
    expect(
      focusRemainingSeconds(
        started,
        new Date('2026-08-20T09:05:00.000Z'),
      ),
    ).toBe(20 * 60)
  })

  it('pauses the remaining time and resumes from the current clock', () => {
    const started = reduceFocus(
      idleFocus(),
      { type: 'start' },
      new Date('2026-08-20T09:00:00.000Z'),
    )
    const paused = reduceFocus(
      started,
      { type: 'pause' },
      new Date('2026-08-20T09:05:00.000Z'),
    )
    const resumed = reduceFocus(
      paused,
      { type: 'resume' },
      new Date('2026-08-20T10:00:00.000Z'),
    )

    expect(paused.phase).toBe('paused')
    expect(paused.remainingSeconds).toBe(20 * 60)
    expect(paused.endsAt).toBeNull()
    expect(resumed.phase).toBe('focus')
    expect(resumed.endsAt).toBe('2026-08-20T10:20:00.000Z')
  })

  it('completes a clock-jumped session exactly once', () => {
    const started = reduceFocus(
      idleFocus(),
      { type: 'start' },
      new Date('2026-08-20T09:00:00.000Z'),
    )
    const completed = reduceFocus(
      started,
      { type: 'tick' },
      new Date('2026-08-20T10:00:00.000Z'),
    )
    const tickedAgain = reduceFocus(
      completed,
      { type: 'tick' },
      new Date('2026-08-20T10:01:00.000Z'),
    )

    expect(completed.phase).toBe('complete')
    expect(completed.completedSessions).toBe(1)
    expect(tickedAgain.completedSessions).toBe(1)
  })

  it('resets to an idle 25 minute session', () => {
    const started = reduceFocus(
      idleFocus(),
      { type: 'start' },
      new Date('2026-08-20T09:00:00.000Z'),
    )
    const reset = reduceFocus(
      started,
      { type: 'reset' },
      new Date('2026-08-20T09:10:00.000Z'),
    )

    expect(reset.phase).toBe('idle')
    expect(reset.remainingSeconds).toBe(25 * 60)
    expect(reset.endsAt).toBeNull()
  })
})
