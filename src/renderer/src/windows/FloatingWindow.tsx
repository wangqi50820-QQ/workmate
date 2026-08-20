import { useState } from 'react'
import type { AppSnapshot, GongyouApi } from '../../../shared/contracts'
import { AppStateProvider, useAppState } from '../app-state'
import { PixelCompanion, type CompanionMood } from '../components/PixelCompanion'
import '../styles/pixel-companion.css'
import '../styles/floating.css'

const currency = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
})

const durationText = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainder = safeSeconds % 60
  return [hours, minutes, remainder]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

function FloatingScene() {
  const { api, snapshot, loading } = useAppState()
  const [mode, setMode] = useState<'salary' | 'off-work'>('salary')

  if (loading || !snapshot) {
    return <main className="floating-shell floating-shell--loading">工友正在过来…</main>
  }

  const configured =
    snapshot.config.onboardingComplete &&
    Number.isFinite(snapshot.salary.earnedToday) &&
    Number.isFinite(snapshot.salary.secondsUntilWorkEnd)
  const mood: CompanionMood =
    snapshot.focus.phase === 'focus'
      ? 'focus'
      : snapshot.focus.phase === 'complete'
        ? 'celebrate'
        : snapshot.salary.phase === 'after-work'
          ? 'sleepy'
          : 'idle'

  return (
    <main className="floating-shell" aria-label="桌面悬浮工友">
      <div className="floating-drag" aria-hidden="true">工友</div>
      <button
        className="floating-companion"
        aria-label="打开工友的工位"
        onClick={() => void api.showWorkstation()}
      >
        <PixelCompanion mood={mood} message={mood === 'focus' ? '我帮你守住这段时间。' : '我在这儿陪你。'} />
      </button>
      {configured ? (
        <button
          className="floating-metric"
          aria-label={mode === 'salary' ? '切换为下班倒计时' : '切换为实时工钱'}
          onClick={() => setMode((current) => current === 'salary' ? 'off-work' : 'salary')}
        >
          <small>{mode === 'salary' ? '今日已挣' : '再坚持一会儿'}</small>
          <strong>
            {mode === 'salary'
              ? currency.format(snapshot.salary.earnedToday)
              : `距下班 ${durationText(snapshot.salary.secondsUntilWorkEnd)}`}
          </strong>
        </button>
      ) : (
        <button className="floating-metric" onClick={() => void api.showWorkstation()}>
          先去工位完成薪资设置
        </button>
      )}
    </main>
  )
}

export function FloatingWindow({
  api,
  initialSnapshot,
}: {
  api?: GongyouApi
  initialSnapshot?: AppSnapshot
} = {}) {
  const resolvedApi = api ?? window.gongyou
  if (!resolvedApi) return null

  return (
    <AppStateProvider api={resolvedApi} initialSnapshot={initialSnapshot}>
      <FloatingScene />
    </AppStateProvider>
  )
}
