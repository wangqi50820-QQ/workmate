import { join } from 'node:path'
import {
  app,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  Tray,
} from 'electron'
import type {
  AiSessionConfig,
  AppSnapshot,
  DemoEventKind,
} from '../shared/contracts'
import { defaultAppState, validateConfig } from '../shared/domain/config'
import { reduceFocus } from '../shared/domain/focus'
import {
  createMemory,
  markMemoryMentioned,
  selectProactiveMemory,
} from '../shared/domain/memory'
import type { ReminderEvent } from '../shared/domain/reminders'
import { createCheckIn, createMemo, updateMemo } from '../shared/domain/tasks'
import { createAiClient } from './ai-client'
import {
  registerIpcHandlers,
  routeReminderDelivery,
  type IpcMainLike,
  type IpcServices,
} from './ipc'
import { createScheduler, type Scheduler } from './scheduler'
import { createJsonStore } from './storage'
import {
  createWindowController,
  type WindowController,
} from './windows'

let windows: WindowController | null = null
let scheduler: Scheduler | null = null
let tray: Tray | null = null
let removeIpcHandlers: (() => void) | null = null

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => windows?.showWorkstation())

  app.whenReady().then(async () => {
    const store = createJsonStore(
      join(app.getPath('userData'), 'gongyou-state.json'),
      defaultAppState(new Date()),
    )
    windows = createWindowController({
      store,
      preloadPath: join(__dirname, '../preload/index.js'),
      rendererFile: join(__dirname, '../renderer/index.html'),
      rendererUrl: process.env.ELECTRON_RENDERER_URL,
    })
    await windows.createAll()

    let latestSnapshot: AppSnapshot | null = null
    let aiClient = createAiClient({
      apiKey: process.env.GONGYOU_AI_API_KEY,
      endpoint: process.env.GONGYOU_AI_ENDPOINT,
      model: process.env.GONGYOU_AI_MODEL,
    })

    const showSystemNotification = (event: ReminderEvent): void => {
      if (Notification.isSupported()) {
        new Notification({ title: event.title, body: event.message }).show()
      }
    }

    const deliverReminder = (event: ReminderEvent): void => {
      routeReminderDelivery(
        event,
        latestSnapshot?.config.meetingMode ?? false,
        {
          showBroadcast: (reminder) => windows?.showBroadcast(reminder),
          showNotification: showSystemNotification,
        },
      )
    }

    scheduler = createScheduler({
      store,
      publish: (snapshot) => {
        latestSnapshot = snapshot
        windows?.publish(snapshot)
      },
      routeReminder: (event) => {
        deliverReminder(event)
      },
    })

    const reconcile = async (): Promise<AppSnapshot> => {
      await scheduler?.tick()
      if (!latestSnapshot) {
        throw new Error('应用状态尚未就绪')
      }
      return latestSnapshot
    }

    const registerConfiguredShortcut = async (): Promise<void> => {
      const state = await store.read()
      globalShortcut.unregisterAll()
      globalShortcut.register(state.config.globalShortcut, () =>
        windows?.toggleAll(),
      )
    }

    const services: IpcServices = {
      getSnapshot: reconcile,
      updateConfig: async (patch) => {
        const current = await store.read()
        const config = validateConfig({ ...current.config, ...patch })
        const shortcutChanged =
          config.globalShortcut !== current.config.globalShortcut
        await store.update((draft) => {
          draft.config = config
          return draft
        })
        windows?.setAlwaysOnTop(config.alwaysOnTop)
        if (shortcutChanged) {
          await registerConfiguredShortcut()
        }
        return reconcile()
      },
      setAiSession: async (config: AiSessionConfig | null) => {
        if (!config) {
          aiClient = createAiClient()
          return
        }
        const baseUrl = config.baseUrl.replace(/\/+$/, '')
        const endpoint = baseUrl.endsWith('/chat/completions')
          ? baseUrl
          : `${baseUrl}/chat/completions`
        aiClient = createAiClient({
          apiKey: config.apiKey,
          endpoint,
          model: config.model,
        })
      },
      submitTreeHole: async (text) => {
        const current = await store.read()
        const related = selectProactiveMemory(current.memories, new Date())
        const result = await aiClient.respond({
          statement: text,
          ...(related ? { memory: related } : {}),
        })
        const now = new Date()
        const entry = createMemory(text, result.text, now)
        await store.update((draft) => {
          if (result.memoryId) {
            draft.memories = draft.memories.map((memory) =>
              memory.id === result.memoryId
                ? markMemoryMentioned(memory, now)
                : memory,
            )
          }
          draft.memories.push(entry)
          return draft
        })
        await reconcile()
        return result
      },
      deleteMemory: async (id) => {
        await store.update((draft) => {
          draft.memories = draft.memories.filter((memory) => memory.id !== id)
          return draft
        })
        return reconcile()
      },
      clearMemories: async () => {
        await store.update((draft) => {
          draft.memories = []
          return draft
        })
        return reconcile()
      },
      dispatchFocus: async (event) => {
        await store.update((draft) => {
          draft.focus = reduceFocus(draft.focus, event, new Date())
          return draft
        })
        return reconcile()
      },
      createCheckIn: async (text) => {
        const checkIn = createCheckIn(text, new Date())
        await store.update((draft) => {
          draft.checkIns.push(checkIn)
          return draft
        })
        return reconcile()
      },
      createMemo: async (input) => {
        const memo = createMemo(input, new Date())
        await store.update((draft) => {
          draft.memos.push(memo)
          return draft
        })
        return reconcile()
      },
      updateMemo: async (id, patch) => {
        const now = new Date()
        await store.update((draft) => {
          const index = draft.memos.findIndex((memo) => memo.id === id)
          if (index < 0) {
            throw new Error('没有找到这张便签')
          }
          draft.memos[index] = updateMemo(draft.memos[index], patch, now)
          return draft
        })
        return reconcile()
      },
      deleteMemo: async (id) => {
        await store.update((draft) => {
          draft.memos = draft.memos.filter((memo) => memo.id !== id)
          return draft
        })
        return reconcile()
      },
      acknowledge: async (key) => {
        const acknowledgedAt = new Date().toISOString()
        await store.update((draft) => {
          if (key.startsWith('sedentary:')) {
            draft.acknowledged.sedentaryStartedAt = acknowledgedAt
            draft.acknowledged.emittedKeys =
              draft.acknowledged.emittedKeys.filter(
                (existing) => !existing.startsWith('sedentary:'),
              )
          } else if (key.startsWith('water:')) {
            draft.acknowledged.waterStartedAt = acknowledgedAt
            draft.acknowledged.emittedKeys =
              draft.acknowledged.emittedKeys.filter(
                (existing) => !existing.startsWith('water:'),
              )
          }
          if (!draft.acknowledged.emittedKeys.includes(key)) {
            draft.acknowledged.emittedKeys.push(key)
          }
          return draft
        })
        return reconcile()
      },
      triggerDemo: async (kind: DemoEventKind) => {
        const copy: Record<DemoEventKind, [string, string]> = {
          broadcast: ['打工列车广播', '今天的工钱在涨，离下班也更近了一站。'],
          sedentary: ['起来走两步', '工位不会跑，腰得自己照顾。'],
          water: ['喝口水', '先补一口水，再接着忙。'],
          'off-work': ['到站，下班', '今天的工先打到这里。'],
          payday: ['工资到账日', '辛苦挣来的钱来报到了。'],
        }
        const [title, message] = copy[kind]
        deliverReminder({
          key: `demo:${kind}:${Date.now()}`,
          kind: kind === 'broadcast' ? 'salary' : kind,
          title,
          message,
        })
      },
      hideAll: async () => windows?.hideAll(),
      showWorkstation: async () => windows?.showWorkstation(),
    }

    removeIpcHandlers = registerIpcHandlers(
      ipcMain as unknown as IpcMainLike,
      services,
    )
    await scheduler.tick()
    scheduler.start()
    await registerConfiguredShortcut()

    const trayIcon = nativeImage.createFromPath(process.execPath).resize({
      width: 16,
      height: 16,
    })
    tray = new Tray(trayIcon)
    tray.setToolTip('工友')
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: '打开工位', click: () => windows?.showWorkstation() },
        { label: '显示/隐藏工友', click: () => windows?.toggleFloating() },
        { type: 'separator' },
        {
          label: '退出',
          click: () => {
            windows?.setQuitting()
            app.quit()
          },
        },
      ]),
    )
    tray.on('double-click', () => windows?.showWorkstation())
  })

  app.on('activate', () => windows?.showWorkstation())
  app.on('before-quit', () => {
    scheduler?.stop()
    globalShortcut.unregisterAll()
    removeIpcHandlers?.()
    windows?.setQuitting()
  })
}
