import type { FocusState } from './config'

export type FocusEvent =
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset' }
  | { type: 'tick' }
  | { type: 'start-break' }

const endAfter = (now: Date, seconds: number): string =>
  new Date(now.getTime() + seconds * 1000).toISOString()

export function focusRemainingSeconds(
  state: FocusState,
  now: Date,
): number {
  if (
    (state.phase === 'focus' || state.phase === 'break') &&
    state.endsAt
  ) {
    return Math.max(
      0,
      Math.ceil((Date.parse(state.endsAt) - now.getTime()) / 1000),
    )
  }

  return state.remainingSeconds
}

export function reduceFocus(
  state: FocusState,
  event: FocusEvent,
  now: Date,
): FocusState {
  switch (event.type) {
    case 'start': {
      if (state.phase !== 'idle' && state.phase !== 'complete') {
        return state
      }

      return {
        ...state,
        phase: 'focus',
        pausedFrom: null,
        remainingSeconds: state.sessionSeconds,
        endsAt: endAfter(now, state.sessionSeconds),
      }
    }

    case 'start-break': {
      if (state.phase !== 'complete') {
        return state
      }

      return {
        ...state,
        phase: 'break',
        pausedFrom: null,
        remainingSeconds: state.breakSeconds,
        endsAt: endAfter(now, state.breakSeconds),
      }
    }

    case 'pause': {
      if (state.phase !== 'focus' && state.phase !== 'break') {
        return state
      }

      const remainingSeconds = focusRemainingSeconds(state, now)
      if (remainingSeconds === 0) {
        return reduceFocus(state, { type: 'tick' }, now)
      }

      return {
        ...state,
        phase: 'paused',
        pausedFrom: state.phase,
        remainingSeconds,
        endsAt: null,
      }
    }

    case 'resume': {
      if (state.phase !== 'paused' || state.pausedFrom === null) {
        return state
      }

      return {
        ...state,
        phase: state.pausedFrom,
        pausedFrom: null,
        endsAt: endAfter(now, state.remainingSeconds),
      }
    }

    case 'tick': {
      if (state.phase !== 'focus' && state.phase !== 'break') {
        return state
      }

      if (focusRemainingSeconds(state, now) > 0) {
        return state
      }

      if (state.phase === 'break') {
        return {
          ...state,
          phase: 'idle',
          pausedFrom: null,
          remainingSeconds: state.sessionSeconds,
          endsAt: null,
        }
      }

      return {
        ...state,
        phase: 'complete',
        pausedFrom: null,
        remainingSeconds: 0,
        endsAt: null,
        completedSessions: state.completedSessions + 1,
      }
    }

    case 'reset':
      return {
        ...state,
        phase: 'idle',
        pausedFrom: null,
        remainingSeconds: state.sessionSeconds,
        endsAt: null,
      }
  }
}
