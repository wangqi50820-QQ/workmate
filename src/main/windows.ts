import {
  BrowserWindow,
  screen,
  type Display,
  type Rectangle,
} from 'electron'
import {
  IPC_CHANNELS,
  type AppSnapshot,
  type BroadcastPayload,
} from '../shared/contracts'
import type { ReminderEvent } from '../shared/domain/reminders'
import type { JsonStore } from './storage'

type WindowName = 'workstation' | 'floating' | 'broadcast'
type PersistedWindowName = Exclude<WindowName, 'broadcast'>

export interface WindowController {
  createAll(): Promise<void>
  publish(snapshot: AppSnapshot): void
  showBroadcast(event: ReminderEvent): void
  showWorkstation(): void
  showFloating(): void
  toggleFloating(): void
  hideAll(): void
  toggleAll(): void
  setAlwaysOnTop(enabled: boolean): void
  setQuitting(): void
  destroyAll(): void
}

export interface WindowControllerOptions {
  store: JsonStore
  preloadPath: string
  rendererFile: string
  rendererUrl?: string
}

const intersects = (left: Rectangle, right: Rectangle): boolean =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y

export function isRestorableBounds(
  bounds: Rectangle | null,
  displays: Display[],
): bounds is Rectangle {
  if (!bounds) {
    return false
  }

  const values = [bounds.x, bounds.y, bounds.width, bounds.height]
  if (
    values.some((value) => !Number.isFinite(value)) ||
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    bounds.x <= -32000 ||
    bounds.y <= -32000
  ) {
    return false
  }

  return displays.some((display) => intersects(bounds, display.workArea))
}

export function createWindowController(
  options: WindowControllerOptions,
): WindowController {
  const windows = new Map<WindowName, BrowserWindow>()
  const saveTimers = new Map<PersistedWindowName, ReturnType<typeof setTimeout>>()
  const visibleBeforeHide = new Set<WindowName>()
  let quitting = false
  let broadcastTimer: ReturnType<typeof setTimeout> | null = null

  const loadWindow = (window: BrowserWindow, name: WindowName): void => {
    if (options.rendererUrl) {
      void window.loadURL(`${options.rendererUrl}?window=${name}`)
      return
    }

    void window.loadFile(options.rendererFile, { search: `window=${name}` })
  }

  const persistBounds = (
    name: PersistedWindowName,
    window: BrowserWindow,
  ): void => {
    const existing = saveTimers.get(name)
    if (existing) {
      clearTimeout(existing)
    }

    saveTimers.set(
      name,
      setTimeout(() => {
        if (window.isDestroyed() || window.isMinimized()) {
          return
        }
        const bounds = window.getBounds()
        void options.store.update((draft) => {
          draft.windowBounds[name] = bounds
          return draft
        })
      }, 250),
    )
  }

  const protectWindow = (name: WindowName, window: BrowserWindow): void => {
    window.on('close', (event) => {
      if (!quitting) {
        event.preventDefault()
        window.hide()
      }
    })
    window.on('closed', () => windows.delete(name))
  }

  const createAll = async (): Promise<void> => {
    if (windows.size > 0) {
      return
    }

    const state = await options.store.read()
    const displays = screen.getAllDisplays()
    const primaryArea = screen.getPrimaryDisplay().workArea
    const workstationBounds = isRestorableBounds(
      state.windowBounds.workstation,
      displays,
    )
      ? state.windowBounds.workstation
      : undefined
    const floatingBounds = isRestorableBounds(
      state.windowBounds.floating,
      displays,
    )
      ? state.windowBounds.floating
      : {
          x: primaryArea.x + primaryArea.width - 300,
          y: primaryArea.y + primaryArea.height - 200,
          width: 280,
          height: 180,
        }

    const workstation = new BrowserWindow({
      width: 960,
      height: 700,
      minWidth: 900,
      minHeight: 620,
      ...(workstationBounds ?? {}),
      title: '工友',
      backgroundColor: '#f5efe4',
      show: false,
      webPreferences: {
        preload: options.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    const floating = new BrowserWindow({
      ...floatingBounds,
      transparent: true,
      frame: false,
      resizable: false,
      hasShadow: false,
      alwaysOnTop: state.config.alwaysOnTop,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        preload: options.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    const broadcast = new BrowserWindow({
      ...primaryArea,
      transparent: true,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      show: false,
      webPreferences: {
        preload: options.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    windows.set('workstation', workstation)
    windows.set('floating', floating)
    windows.set('broadcast', broadcast)
    protectWindow('workstation', workstation)
    protectWindow('floating', floating)
    protectWindow('broadcast', broadcast)
    workstation.on('move', () => persistBounds('workstation', workstation))
    workstation.on('resize', () => persistBounds('workstation', workstation))
    floating.on('move', () => persistBounds('floating', floating))
    loadWindow(workstation, 'workstation')
    loadWindow(floating, 'floating')
    loadWindow(broadcast, 'broadcast')
    workstation.once('ready-to-show', () => workstation.show())
    floating.once('ready-to-show', () => floating.showInactive())
  }

  const hideAll = (): void => {
    visibleBeforeHide.clear()
    for (const [name, window] of windows) {
      if (!window.isDestroyed() && window.isVisible()) {
        visibleBeforeHide.add(name)
        window.hide()
      }
    }
  }

  return {
    createAll,
    publish: (snapshot) => {
      for (const window of windows.values()) {
        if (!window.isDestroyed()) {
          window.webContents.send(IPC_CHANNELS.snapshot, snapshot)
        }
      }
    },
    showBroadcast: (event) => {
      const window = windows.get('broadcast')
      if (!window || window.isDestroyed()) {
        return
      }
      const payload: BroadcastPayload = {
        event,
        shownAt: new Date().toISOString(),
      }
      window.webContents.send(IPC_CHANNELS.reminder, payload)
      window.showInactive()
      if (broadcastTimer) {
        clearTimeout(broadcastTimer)
      }
      broadcastTimer = setTimeout(() => window.hide(), 8000)
    },
    showWorkstation: () => {
      const window = windows.get('workstation')
      if (window && !window.isDestroyed()) {
        window.show()
        window.focus()
      }
    },
    showFloating: () => {
      const window = windows.get('floating')
      if (window && !window.isDestroyed()) {
        window.showInactive()
      }
    },
    toggleFloating: () => {
      const window = windows.get('floating')
      if (window && !window.isDestroyed()) {
        window.isVisible() ? window.hide() : window.showInactive()
      }
    },
    hideAll,
    toggleAll: () => {
      const hasVisibleWindow = [...windows.values()].some(
        (window) => !window.isDestroyed() && window.isVisible(),
      )
      if (hasVisibleWindow) {
        hideAll()
        return
      }

      const names = visibleBeforeHide.size
        ? [...visibleBeforeHide]
        : (['workstation', 'floating'] as WindowName[])
      for (const name of names) {
        const window = windows.get(name)
        if (window && !window.isDestroyed()) {
          name === 'workstation' ? window.show() : window.showInactive()
        }
      }
    },
    setAlwaysOnTop: (enabled) => {
      windows.get('floating')?.setAlwaysOnTop(enabled)
    },
    setQuitting: () => {
      quitting = true
    },
    destroyAll: () => {
      quitting = true
      if (broadcastTimer) {
        clearTimeout(broadcastTimer)
      }
      for (const timer of saveTimers.values()) {
        clearTimeout(timer)
      }
      for (const window of windows.values()) {
        if (!window.isDestroyed()) {
          window.destroy()
        }
      }
      windows.clear()
    },
  }
}
