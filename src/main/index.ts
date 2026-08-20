import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'

let workstationWindow: BrowserWindow | null = null

function createWorkstationWindow(): void {
  workstationWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    title: '工友',
    backgroundColor: '#f5efe4',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  workstationWindow.on('closed', () => {
    workstationWindow = null
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL

  if (rendererUrl) {
    void workstationWindow.loadURL(`${rendererUrl}?window=workstation`)
    return
  }

  void workstationWindow.loadFile(join(__dirname, '../renderer/index.html'), {
    search: 'window=workstation',
  })
}

app.whenReady().then(() => {
  createWorkstationWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWorkstationWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
