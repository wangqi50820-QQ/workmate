import { useState } from 'react'
import type { AppSnapshot, GongyouApi } from '../../../shared/contracts'
import { AppStateProvider, useAppState } from '../app-state'
import { CheckInStamp } from '../components/CheckInStamp'
import { FocusClock } from '../components/FocusClock'
import { MemoBoard } from '../components/MemoBoard'
import { Onboarding } from '../components/Onboarding'
import { PixelCompanion } from '../components/PixelCompanion'
import { ReminderControls } from '../components/ReminderControls'
import { SalaryBag } from '../components/SalaryBag'
import { SettingsPanel } from '../components/SettingsPanel'
import { TreeHole } from '../components/TreeHole'
import '../styles/workstation.css'
import '../styles/pixel-companion.css'

function LoadingWorkstation() {
  return (
    <main className="workstation-shell">
      <section className="workstation-card" aria-labelledby="workstation-title">
        <span className="eyebrow">GONGYOU DESKTOP COMPANION</span>
        <h1 id="workstation-title">工友的工位</h1>
        <p>正在把你的杯子、工资袋和便签摆回来…</p>
      </section>
    </main>
  )
}

function WorkstationScene() {
  const { snapshot, loading, error } = useAppState()
  const [treeHoleOpen, setTreeHoleOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (loading || !snapshot) return <LoadingWorkstation />
  if (error) return <p role="alert">{error}</p>
  if (!snapshot.config.onboardingComplete) {
    return <Onboarding config={snapshot.config} />
  }

  const companionMood =
    snapshot.focus.phase === 'focus'
      ? 'focus'
      : snapshot.focus.phase === 'complete'
        ? 'celebrate'
        : snapshot.salary.phase === 'after-work'
          ? 'sleepy'
          : 'idle'

  return (
    <main className="workstation-scene">
      <header className="workstation-header">
        <div>
          <span className="eyebrow">今日工位 · 一切照常</span>
          <h1 id="workstation-title">工友的工位</h1>
        </div>
        <button className="settings-trigger" aria-label="打开设置" onClick={() => setSettingsOpen(true)}>
          ⚙ 设置
        </button>
      </header>

      <div className="desk-scene">
        <section className="companion-zone" aria-label="你的工友">
          <PixelCompanion
            mood={companionMood}
            message={
              snapshot.focus.phase === 'focus'
                ? '这 25 分钟我替你看着门。'
                : snapshot.salary.phase === 'after-work'
                  ? '到点了，别让工位扣住你。'
                  : '今天也一起，把工作慢慢做完。'
            }
          />
          <button className="memory-bottle" aria-label="打开记忆瓶" onClick={() => setTreeHoleOpen(true)}>
            <span aria-hidden="true" className="bottle-cork" />
            <span aria-hidden="true" className="bottle-glass">记忆</span>
            <b>记忆瓶</b>
          </button>
          <ReminderControls />
        </section>

        <div className="workstation-grid">
          <SalaryBag />
          <FocusClock />
          <CheckInStamp />
          <MemoBoard />
        </div>
      </div>

      {treeHoleOpen ? <TreeHole onClose={() => setTreeHoleOpen(false)} /> : null}
      {settingsOpen ? <SettingsPanel onClose={() => setSettingsOpen(false)} /> : null}
    </main>
  )
}

export function WorkstationWindow({
  api,
  initialSnapshot,
}: {
  api?: GongyouApi
  initialSnapshot?: AppSnapshot
} = {}) {
  const resolvedApi = api ?? window.gongyou

  if (!resolvedApi) return <LoadingWorkstation />

  return (
    <AppStateProvider api={resolvedApi} initialSnapshot={initialSnapshot}>
      <WorkstationScene />
    </AppStateProvider>
  )
}
