# 《工友》桌面 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可在 Windows 10/11 运行的 Electron Demo，完整演示工友陪伴、AI 树洞、跨启动记忆、实时工钱、发薪日、番茄钟、打卡、备忘录、身体提醒和打工列车广播。

**Architecture:** 使用 Electron 主进程管理窗口、托盘、快捷键、调度、本地 JSON 和 AI HTTP；预加载层暴露类型化 IPC；React 渲染工位主窗、悬浮工友和广播窗。薪资、发薪日、计时、提醒、记忆和工友状态保持为无 Electron 依赖的纯 TypeScript 领域模块。

**Tech Stack:** Node.js 24, npm 11, Electron, electron-vite, React, TypeScript, Zod, Vitest, Testing Library, Playwright, electron-builder.

**Spec:** `docs/superpowers/specs/2026-08-20-gongyou-demo-design.md`

## Global Constraints

- 目标平台是 Windows 10/11 x64，首版不承诺 macOS。
- 仅支持月薪；发薪日是 1–31 的自然日，周末不移动，无该日期的月份取月末。
- 工钱通过当前绝对时间重算，不依赖计时器累加，午休时停止增长。
- 用户数据使用本地 JSON 原子替换写入；不使用 SQLite、云同步、账号和遥测。
- AI 使用 OpenAI-compatible HTTP 接口，8 秒超时，失败必须返回本地共情模板。
- API 密钥不写盘；倾诉时最多发送当前内容和一条相关记忆。
- 首版不做局域网、聊天、对战、复杂养成、多薪资模式和节假日调休。
- 视觉使用深蓝、米白、珊瑚橙；像素角色为项目自有资产，不复制 PayDance 的代码、图标、品牌和布局。
- 每个任务完成后运行其定向测试和 `npm test -- --run`，再提交。

## File Map

| Path | Responsibility |
|---|---|
| `package.json` | 开发、测试、构建和打包脚本与依赖 |
| `electron.vite.config.ts` | 主进程、预加载层和渲染器构建配置 |
| `src/shared/contracts.ts` | 共享数据类型、IPC 通道名与 `window.gongyou` API |
| `src/shared/domain/*.ts` | 薪资、发薪日、番茄钟、提醒、记忆、工友状态纯函数 |
| `src/main/index.ts` | Electron 生命周期、单实例和服务装配 |
| `src/main/windows.ts` | 三类窗口的创建、显隐、位置恢复 |
| `src/main/storage.ts` | JSON 校验、迁移、原子写入 |
| `src/main/ipc.ts` | IPC 处理器与输入校验 |
| `src/main/scheduler.ts` | 绝对时间重算和到期事件调度 |
| `src/main/ai-client.ts` | OpenAI-compatible 请求、超时、输出清洗和兜底 |
| `src/preload/index.ts` | 通过 `contextBridge` 暴露最小 API |
| `src/renderer/src/app-state.tsx` | 渲染器统一状态、事件和重新同步 |
| `src/renderer/src/windows/*.tsx` | 工位、悬浮工友、广播三个窗口根组件 |
| `src/renderer/src/components/*.tsx` | 树洞、工资袋、番茄钟、打卡、备忘、设置等聚焦组件 |
| `src/renderer/src/styles/*.css` | 设计 token、像素工友、窗口和动画 |
| `tests/unit/*.test.ts` | 领域逻辑和主进程服务测试 |
| `tests/renderer/*.test.tsx` | 组件交互测试 |
| `tests/e2e/demo.spec.ts` | Electron 启动、窗口与五分钟剧本冒烟 |

---

### Task 1: Bootstrap the typed Electron shell

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/shared/contracts.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.tsx`
- Create: `src/renderer/src/windows/WorkstationWindow.tsx`
- Create: `src/renderer/src/styles/tokens.css`
- Create: `tests/renderer/app-shell.test.tsx`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `GongyouApi`, `AppSnapshot`, `AppConfig`, `AppData`, `WindowKind`, and the `window.gongyou` preload contract used by every later task.

- [ ] **Step 1: Create the project manifest and tool configuration**

Use scripts with these exact names:

```json
{
  "name": "gongyou-demo",
  "version": "0.1.0",
  "private": true,
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test",
    "dist:win": "npm run build && electron-builder --win portable"
  },
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "zod": "^4.1.5"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^24.3.0",
    "@types/react": "^19.1.10",
    "@types/react-dom": "^19.1.7",
    "@vitejs/plugin-react": "^5.0.2",
    "electron": "^37.3.1",
    "electron-builder": "^26.0.12",
    "electron-vite": "^4.0.0",
    "jsdom": "^26.1.0",
    "typescript": "^5.9.2",
    "vite": "^7.1.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Install the locked dependencies**

Run: `npm install`

Expected: exit 0 and a new `package-lock.json`.

- [ ] **Step 3: Write the failing shell test**

```tsx
import { render, screen } from '@testing-library/react'
import { WorkstationWindow } from '../../src/renderer/src/windows/WorkstationWindow'

it('renders the companion workstation identity', () => {
  render(<WorkstationWindow />)
  expect(screen.getByRole('heading', { name: '工友的工位' })).toBeInTheDocument()
})
```

- [ ] **Step 4: Run the shell test and observe the failure**

Run: `npm test -- --run tests/renderer/app-shell.test.tsx`

Expected: FAIL because `WorkstationWindow` and the test environment are not implemented.

- [ ] **Step 5: Implement the minimum secure shell**

Define `GongyouApi` without exposing `ipcRenderer`:

```ts
export interface GongyouApi {
  getSnapshot(): Promise<AppSnapshot>
  updateConfig(patch: Partial<AppConfig>): Promise<AppSnapshot>
  hideAll(): Promise<void>
  showWorkstation(): Promise<void>
  subscribe(listener: (snapshot: AppSnapshot) => void): () => void
}
```

Create a single workstation `BrowserWindow` with `contextIsolation: true`, `nodeIntegration: false`, and the compiled preload path. Route renderers using `?window=workstation` even though only one window exists in this task.

- [ ] **Step 6: Run baseline verification**

Run: `npm test -- --run tests/renderer/app-shell.test.tsx && npm run typecheck && npm run build`

Expected: one passing test, TypeScript exit 0, electron-vite build exit 0.

- [ ] **Step 7: Commit the shell**

```bash
git add package.json package-lock.json electron.vite.config.ts tsconfig.json vitest.config.ts src tests/renderer/app-shell.test.tsx
git commit -m "feat: bootstrap typed Electron shell"
```

### Task 2: Versioned local state and validated configuration

**Files:**
- Create: `src/shared/domain/config.ts`
- Create: `src/main/storage.ts`
- Modify: `src/shared/contracts.ts`
- Test: `tests/unit/config.test.ts`
- Test: `tests/unit/storage.test.ts`

**Interfaces:**
- Produces: `AppStateSchema`, `defaultAppState(now: Date): AppState`, `validateConfig(input: unknown): AppConfig`, and `createJsonStore(filePath: string, defaults: AppState): JsonStore`.
- `JsonStore` exposes `read(): Promise<AppState>` and `update(mutator: (draft: AppState) => AppState): Promise<AppState>`.

- [ ] **Step 1: Write failing configuration tests**

```ts
it('rejects a payday outside 1 through 31', () => {
  expect(() => validateConfig({ ...validConfig, payday: 32 })).toThrow()
})

it('rejects a schedule whose lunch consumes the workday', () => {
  expect(() => validateConfig({
    ...validConfig,
    workStart: '09:00', lunchStart: '09:30', lunchEnd: '18:00', workEnd: '18:00'
  })).toThrow()
})
```

- [ ] **Step 2: Run tests and observe missing exports**

Run: `npm test -- --run tests/unit/config.test.ts`

Expected: FAIL with missing `validateConfig`.

- [ ] **Step 3: Implement schemas and stable defaults**

Use these core shapes:

```ts
export interface AppConfig {
  onboardingComplete: boolean
  monthlySalary: number
  payday: number
  weekdays: number[]
  workStart: string
  lunchStart: string
  lunchEnd: string
  workEnd: string
  sedentaryMinutes: number
  waterMinutes: number
  broadcastMinutes: number
  alwaysOnTop: boolean
  meetingMode: boolean
  globalShortcut: string
}

export interface AppState {
  schemaVersion: 1
  config: AppConfig
  memories: MemoryEntry[]
  checkIns: CheckIn[]
  memos: Memo[]
  focus: FocusState
  acknowledged: ReminderAcknowledgements
}
```

Default to `onboardingComplete: false`, weekdays Monday–Friday, `09:00/12:00/13:30/18:30`, salary `10000`, payday `10`, sedentary `60`, water `45`, broadcast `60`, shortcut `CommandOrControl+Shift+H`.

- [ ] **Step 4: Write failing atomic-storage tests**

Create a temporary directory, update salary from 10000 to 12000, reopen the store, and assert 12000. Write invalid JSON, reopen, and assert the defaults are restored while the corrupt file is renamed with `.corrupt-<timestamp>`.

- [ ] **Step 5: Implement atomic storage**

Write JSON to `${filePath}.tmp`, close the handle, then call `rename(tmpPath, filePath)`. Serialize updates through a promise queue so two IPC writes cannot interleave. Parse with `AppStateSchema`; quarantine invalid files before returning defaults.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- --run tests/unit/config.test.ts tests/unit/storage.test.ts && npm test -- --run && npm run typecheck`

```bash
git add src/shared/contracts.ts src/shared/domain/config.ts src/main/storage.ts tests/unit/config.test.ts tests/unit/storage.test.ts
git commit -m "feat: add validated local state"
```

### Task 3: Real-time salary, off-work time, and payday calculations

**Files:**
- Create: `src/shared/domain/salary.ts`
- Create: `src/shared/domain/payday.ts`
- Test: `tests/unit/salary.test.ts`
- Test: `tests/unit/payday.test.ts`

**Interfaces:**
- Produces: `calculateSalarySnapshot(config: AppConfig, now: Date): SalarySnapshot`.
- Produces: `resolveNextPayday(payday: number, now: Date): Date` and `daysUntilPayday(payday: number, now: Date): number`.
- `SalarySnapshot` contains `earnedToday`, `expectedToday`, `workingProgress`, `secondsUntilWorkEnd`, and `phase: 'before-work' | 'working' | 'lunch' | 'after-work' | 'rest-day'`.

- [ ] **Step 1: Write salary edge-case tests**

Use a deterministic May 2026 schedule and verify: before work is zero; 10:00 has exactly one effective hour; lunch does not add income; after work equals `expectedToday`; Saturday is zero. Use `toBeCloseTo(value, 6)` for money calculations and never test timer tick counts.

- [ ] **Step 2: Run the salary tests and observe failure**

Run: `npm test -- --run tests/unit/salary.test.ts`

Expected: FAIL because `calculateSalarySnapshot` is missing.

- [ ] **Step 3: Implement calendar and working-second calculations**

```ts
const dailyPay = config.monthlySalary / countScheduledWorkdays(now.getFullYear(), now.getMonth(), config.weekdays)
const expectedSeconds = secondsBetween(config.workStart, config.lunchStart)
  + secondsBetween(config.lunchEnd, config.workEnd)
const earnedToday = roundMoney(dailyPay * elapsedEffectiveSeconds(now, config) / expectedSeconds)
```

Clamp elapsed seconds to `[0, expectedSeconds]`; `roundMoney` returns `Math.round(value * 100) / 100` only for display snapshots, while internal ratios remain unrounded.

- [ ] **Step 4: Write payday tests**

Verify August 9 with payday 10 resolves August 10; August 11 resolves September 10; February 2027 with payday 31 resolves February 28; February 2028 resolves February 29; Saturday payday remains Saturday.

- [ ] **Step 5: Implement payday resolution with local-midnight dates**

Construct dates with `new Date(year, month, Math.min(payday, daysInMonth))`. Compare local calendar dates, not milliseconds from the current clock time. `daysUntilPayday` returns whole calendar boundaries and returns zero on payday.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- --run tests/unit/salary.test.ts tests/unit/payday.test.ts && npm test -- --run && npm run typecheck`

```bash
git add src/shared/domain/salary.ts src/shared/domain/payday.ts tests/unit/salary.test.ts tests/unit/payday.test.ts
git commit -m "feat: calculate live pay and payday"
```

### Task 4: Pomodoro, check-ins, memos, and reminder priority

**Files:**
- Create: `src/shared/domain/focus.ts`
- Create: `src/shared/domain/tasks.ts`
- Create: `src/shared/domain/reminders.ts`
- Test: `tests/unit/focus.test.ts`
- Test: `tests/unit/tasks.test.ts`
- Test: `tests/unit/reminders.test.ts`

**Interfaces:**
- Produces: `reduceFocus(state: FocusState, event: FocusEvent, now: Date): FocusState` and `focusRemainingSeconds(state: FocusState, now: Date): number`.
- Produces: `createCheckIn(text: string, now: Date): CheckIn`, `createMemo(input: MemoInput, now: Date): Memo`, and `updateMemo`.
- Produces: `selectReminderEvent(context: ReminderContext): ReminderEvent | null` with priority memo > payday/off-work > body > memory > salary.

- [ ] **Step 1: Write failing focus tests**

Verify start creates an absolute `endsAt`; pause stores the remaining seconds; resume produces a new `endsAt`; a clock jump beyond `endsAt` completes exactly once; reset returns idle 25 minutes.

- [ ] **Step 2: Implement the pure focus reducer**

Represent time with ISO timestamps and calculate remaining time from `Date.parse(endsAt) - now.getTime()`. Never decrement a stored counter every second.

- [ ] **Step 3: Write and implement task validation tests**

Check-ins accept trimmed text of 1–80 characters. Memos accept trimmed text of 1–200 characters and an optional valid ISO reminder. Reject invalid input before it reaches storage.

- [ ] **Step 4: Write the reminder collision tests**

Build a context with an overdue memo, a sedentary reminder, and an unmentioned memory; assert the memo is selected. Mark the memo emitted and assert the sedentary event wins next. Re-running the same timestamp must not emit the same event twice.

- [ ] **Step 5: Implement reminder selection and acknowledgement keys**

Use stable keys such as `memo:<id>`, `sedentary:<startedAt>`, `water:<startedAt>`, `payday:2026-08-10`, and `off-work:2026-08-20`. Return one event per scheduler cycle.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- --run tests/unit/focus.test.ts tests/unit/tasks.test.ts tests/unit/reminders.test.ts && npm test -- --run && npm run typecheck`

```bash
git add src/shared/domain/focus.ts src/shared/domain/tasks.ts src/shared/domain/reminders.ts tests/unit/focus.test.ts tests/unit/tasks.test.ts tests/unit/reminders.test.ts
git commit -m "feat: add office assistance domain logic"
```

### Task 5: AI empathy and persistent memory bottle

**Files:**
- Create: `src/shared/domain/memory.ts`
- Create: `src/main/ai-client.ts`
- Test: `tests/unit/memory.test.ts`
- Test: `tests/unit/ai-client.test.ts`

**Interfaces:**
- Produces: `createMemory(userText: string, reply: string, now: Date): MemoryEntry`.
- Produces: `selectProactiveMemory(memories: MemoryEntry[], now: Date): MemoryEntry | null`.
- Produces: `createAiClient(options: AiClientOptions): { respond(request: EmpathyRequest): Promise<EmpathyResult> }`.
- `EmpathyResult` contains `text`, `source: 'remote' | 'fallback'`, and `memoryId?: string`.

- [ ] **Step 1: Write memory selection tests**

Verify selection chooses the newest unmentioned memory within seven days, ignores already-mentioned and older memories, and returns `null` when none qualify. Verify marking a memory mentioned persists `mentionedAt`.

- [ ] **Step 2: Implement memory creation and selection**

Normalize whitespace, enforce 1–1000 user characters and 1–500 reply characters, generate IDs with `crypto.randomUUID()`, and store local ISO timestamps.

- [ ] **Step 3: Write AI client tests with an injected fetch**

Cover a successful OpenAI-compatible response, an HTTP 429, an empty `choices[0].message.content`, an abort after eight seconds, and no API key. Assert all failure cases return `source: 'fallback'` and non-empty text.

- [ ] **Step 4: Implement the remote request and deterministic fallback**

Send a system message fixing the “嘴硬心软的老友” persona and a user message containing only the current statement and optional single memory. Limit response rendering to three non-empty sentences and 240 Chinese characters. Choose fallback copy by stable keyword groups (`改稿`, `加班`, `疲惫`, `生气`, default) so tests are deterministic.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --run tests/unit/memory.test.ts tests/unit/ai-client.test.ts && npm test -- --run && npm run typecheck`

```bash
git add src/shared/domain/memory.ts src/main/ai-client.ts tests/unit/memory.test.ts tests/unit/ai-client.test.ts
git commit -m "feat: add empathetic AI memory flow"
```

### Task 6: Electron windows, scheduler, IPC, tray, and global hide

**Files:**
- Create: `src/main/windows.ts`
- Create: `src/main/scheduler.ts`
- Create: `src/main/ipc.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/shared/contracts.ts`
- Test: `tests/unit/scheduler.test.ts`
- Test: `tests/unit/ipc-contract.test.ts`

**Interfaces:**
- Consumes: storage, salary, payday, focus, reminders, memory, and AI interfaces from Tasks 2–5.
- Produces: `WindowController`, `Scheduler`, and the complete `GongyouApi` used by renderer windows.

- [ ] **Step 1: Write scheduler recovery tests**

Inject a fake clock and verify a tick after a two-hour system sleep recalculates salary from wall time, completes an expired focus session once, and emits only the highest-priority due reminder.

- [ ] **Step 2: Implement scheduler as a one-second reconciliation loop**

Each tick reads current absolute time, derives a fresh `AppSnapshot`, persists only state transitions, broadcasts snapshot changes to all windows, and routes one reminder event. Do not persist salary snapshots every second.

- [ ] **Step 3: Write IPC contract tests**

Assert every channel exposed by preload is included in a shared allowlist and has a registered main-process handler. Include snapshot read, config update, tree-hole submit, focus event, check-in create, memo mutate, acknowledgement, demo trigger, window action, and subscription.

The completed preload surface must use these signatures:

```ts
export interface AiSessionConfig {
  baseUrl: string
  model: string
  apiKey: string
}

export interface GongyouApi {
  getSnapshot(): Promise<AppSnapshot>
  updateConfig(patch: Partial<AppConfig>): Promise<AppSnapshot>
  setAiSession(config: AiSessionConfig | null): Promise<void>
  submitTreeHole(text: string): Promise<EmpathyResult>
  deleteMemory(id: string): Promise<AppSnapshot>
  clearMemories(): Promise<AppSnapshot>
  dispatchFocus(event: FocusEvent): Promise<AppSnapshot>
  createCheckIn(text: string): Promise<AppSnapshot>
  createMemo(input: MemoInput): Promise<AppSnapshot>
  updateMemo(id: string, patch: MemoPatch): Promise<AppSnapshot>
  deleteMemo(id: string): Promise<AppSnapshot>
  acknowledge(key: string): Promise<AppSnapshot>
  triggerDemo(kind: DemoEventKind): Promise<void>
  hideAll(): Promise<void>
  showWorkstation(): Promise<void>
  subscribe(listener: (snapshot: AppSnapshot) => void): () => void
}
```

- [ ] **Step 4: Implement three windows and recovery behavior**

Create `workstation` (960x700), `floating` (280x180 transparent/frame-less), and `broadcast` (screen work-area size, hidden initially). Save workstation/floating bounds separately; reject minimized sentinel coordinates, non-finite bounds, and rectangles not intersecting any display work area before restore.

- [ ] **Step 5: Add tray, singleton, and global shortcut**

Acquire `app.requestSingleInstanceLock()`. Tray actions are “打开工位”, “显示/隐藏工友”, and “退出”. Register configured shortcut and make it toggle all non-destroyed app windows; tray always remains the recovery path.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- --run tests/unit/scheduler.test.ts tests/unit/ipc-contract.test.ts && npm test -- --run && npm run typecheck && npm run build`

```bash
git add src/main src/preload src/shared/contracts.ts tests/unit/scheduler.test.ts tests/unit/ipc-contract.test.ts
git commit -m "feat: add desktop system services"
```

### Task 7: Onboarding and companion-centered workstation UI

**Files:**
- Create: `src/renderer/src/app-state.tsx`
- Create: `src/renderer/src/components/Onboarding.tsx`
- Create: `src/renderer/src/components/PixelCompanion.tsx`
- Create: `src/renderer/src/components/TreeHole.tsx`
- Create: `src/renderer/src/components/SalaryBag.tsx`
- Create: `src/renderer/src/components/FocusClock.tsx`
- Create: `src/renderer/src/components/CheckInStamp.tsx`
- Create: `src/renderer/src/components/MemoBoard.tsx`
- Create: `src/renderer/src/components/ReminderControls.tsx`
- Create: `src/renderer/src/components/SettingsPanel.tsx`
- Modify: `src/renderer/src/windows/WorkstationWindow.tsx`
- Create: `src/renderer/src/styles/workstation.css`
- Create: `src/renderer/src/styles/pixel-companion.css`
- Test: `tests/renderer/onboarding.test.tsx`
- Test: `tests/renderer/workstation.test.tsx`

**Interfaces:**
- Consumes: complete `GongyouApi` and `AppSnapshot` from Task 6.
- Produces: user-visible workstation interactions and reusable `PixelCompanion` states.

- [ ] **Step 1: Write the failing onboarding flow test**

Render with `onboardingComplete: false`; fill monthly salary `12000`, payday `15`, weekday schedule, work/lunch times, and reminder intervals; submit; assert `updateConfig` receives normalized numbers and the workstation appears.

- [ ] **Step 2: Implement onboarding with inline validation**

Use one compact sequence with sections “你的工作时间”, “今天怎么算工钱”, and “工友怎么提醒你”. Keep the submit button disabled until the shared config schema accepts the form.

- [ ] **Step 3: Write workstation interaction tests**

Assert clicking the memory bottle opens TreeHole; salary bag shows `¥126.38` and `距发薪 12 天`; starting focus calls the correct event; adding a check-in and memo calls the preload API; deleting one memory calls `deleteMemory`; clearing all memories requires confirmation and calls `clearMemories`; settings remain in a separate panel.

- [ ] **Step 4: Implement the workstation scene**

Build an accessible scene with real buttons whose visual forms are memory bottle, clock, stamp, memo board, salary bag, water cup, chair, and companion. Use CSS pixel blocks/SVG authored in this repository, no external character art. All animated elements honor `prefers-reduced-motion`.

- [ ] **Step 5: Implement tree-hole consent and source labeling**

Before the first remote call, show that text is sent to the configured AI endpoint. During request show the companion listening state. Render the reply without technical tokens and label fallback subtly as “本地回应”.

Settings must accept `baseUrl`, `model`, and `apiKey`, call `setAiSession`, and explicitly state that the key remains in memory for the current run. Closing settings clears the controlled API-key input value after the call; re-opening never reveals the key.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- --run tests/renderer/onboarding.test.tsx tests/renderer/workstation.test.tsx && npm test -- --run && npm run typecheck && npm run build`

```bash
git add src/renderer tests/renderer/onboarding.test.tsx tests/renderer/workstation.test.tsx
git commit -m "feat: build companion workstation UI"
```

### Task 8: Floating companion, broadcast, notifications, and demo controls

**Files:**
- Create: `src/renderer/src/windows/FloatingWindow.tsx`
- Create: `src/renderer/src/windows/BroadcastWindow.tsx`
- Create: `src/renderer/src/components/DemoControls.tsx`
- Create: `src/renderer/src/styles/floating.css`
- Create: `src/renderer/src/styles/broadcast.css`
- Modify: `src/renderer/src/main.tsx`
- Modify: `src/main/ipc.ts`
- Test: `tests/renderer/floating.test.tsx`
- Test: `tests/renderer/broadcast.test.tsx`

**Interfaces:**
- Consumes: snapshots and event payloads from Task 6 plus `PixelCompanion` from Task 7.
- Produces: complete multi-window visual flow and immediate demo triggers.

- [ ] **Step 1: Write floating window tests**

Verify salary mode updates from 126.38 to 126.39 without remounting; clicking the mode button switches to off-work countdown; clicking the companion calls `showWorkstation`; focus state changes the companion pose.

- [ ] **Step 2: Implement the compact transparent window**

Keep drag regions separate from interactive buttons using `-webkit-app-region`. Format money with `Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })`. Display a fallback message when configuration is incomplete instead of `NaN`.

- [ ] **Step 3: Write broadcast tests**

Given a salary event, assert amount and countdown are visible. Given a memo event, assert memo text is visible. In meeting mode, assert the broadcast window is not shown and the main process sends a system notification instead.

- [ ] **Step 4: Implement broadcast composition and auto-close**

Render one primary event, current salary, and off-work progress. Start an eight-second close deadline from the payload timestamp and recalculate remaining display time after renderer throttling. Escape closes immediately.

- [ ] **Step 5: Add explicit demo triggers**

Settings includes buttons for `broadcast`, `sedentary`, `water`, `off-work`, and `payday`. These call the same event-routing path as real schedules; they do not mutate the system clock or persisted payday.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- --run tests/renderer/floating.test.tsx tests/renderer/broadcast.test.tsx && npm test -- --run && npm run typecheck && npm run build`

```bash
git add src/renderer/src/windows src/renderer/src/components/DemoControls.tsx src/renderer/src/styles src/main/ipc.ts tests/renderer/floating.test.tsx tests/renderer/broadcast.test.tsx
git commit -m "feat: add floating companion and broadcasts"
```

### Task 9: End-to-end demo, portable build, and acceptance verification

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/demo.spec.ts`
- Modify: `package.json`
- Create: `build/icon.ico`
- Create: `README.md`

**Interfaces:**
- Consumes: the complete application.
- Produces: repeatable acceptance evidence and `dist/工友-0.1.0-portable.exe`.

- [ ] **Step 1: Write the failing Electron smoke test**

Launch Electron with a temporary user-data directory and demo environment. Verify workstation title, floating window existence, a salary change across two sampled snapshots, one check-in, one memo, a fallback tree-hole response, an immediate broadcast, hide/show IPC, and state restoration after relaunch.

- [ ] **Step 2: Run smoke test and capture the first failure**

Run: `npm run build && npm run test:e2e -- tests/e2e/demo.spec.ts`

Expected: FAIL at the first missing stable test selector or relaunch behavior; do not weaken the assertion.

- [ ] **Step 3: Add stable test hooks and deterministic demo environment**

Use semantic roles first and `data-testid` only for window/snapshot boundaries. `GONGYOU_DEMO_NOW`, `GONGYOU_DATA_DIR`, and `GONGYOU_FORCE_AI_FALLBACK=1` are accepted only outside production mode and make smoke results deterministic.

- [ ] **Step 4: Configure the portable Windows artifact**

Add electron-builder settings for `appId: com.aipin.gongyou`, `productName: 工友`, portable target, x64, Chinese artifact name, bundled `out/**`, and repository-owned icon. Exclude tests, docs, raw source maps, and environment files.

- [ ] **Step 5: Document run and privacy behavior**

README must show `npm install`, `npm run dev`, `npm test -- --run`, `npm run test:e2e`, `npm run dist:win`, AI environment variables, local data path, what text leaves the machine, the global shortcut, and how to clear memories.

- [ ] **Step 6: Run the complete verification matrix**

Run:

```bash
npm test -- --run
npm run typecheck
npm run build
npm run test:e2e
npm run dist:win
```

Expected: all commands exit 0; the portable EXE exists and is non-empty.

- [ ] **Step 7: Perform visual and manual Windows checks**

Open the built portable EXE and execute the eight-step demo script from the spec. Inspect all three windows at 100% scaling and at 150% scaling. Confirm no clipping, transparent-window black backgrounds, off-screen restore failures, stuck broadcasts, duplicate notifications, visible API keys, or broken Chinese glyphs.

- [ ] **Step 8: Commit the release-ready Demo**

```bash
git add package.json package-lock.json playwright.config.ts tests/e2e build/icon.ico README.md
git commit -m "test: verify portable gongyou demo"
```
