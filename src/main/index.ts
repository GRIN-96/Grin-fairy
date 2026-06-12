import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, NativeImage } from 'electron'
import { join } from 'path'
import { deflateSync } from 'zlib'
import { store, AppSettings } from './store'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let timeSettingsWindow: BrowserWindow | null = null

// ── PNG 아이콘 생성 (외부 파일 없이 코드로 생성) ──────────────────────────
function crc32(buf: Buffer): number {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = (t[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function makePNG(
  size: number,
  getPixel: (x: number, y: number) => [number, number, number, number]
): Buffer {
  const bpp = 4
  const raw = Buffer.allocUnsafe(size * (1 + size * bpp))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * bpp)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = getPixel(x, y)
      const off = y * (1 + size * bpp) + 1 + x * bpp
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a
    }
  }
  const compressed = deflateSync(raw)
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function createTrayIcon(size = 22): NativeImage {
  const buf = makePNG(size, (x, y) => {
    const cx = size / 2
    // mushroom cap (ellipse top half)
    const nx = (x - cx) / (size * 0.46)
    const ny = (y - size * 0.32) / (size * 0.30)
    if (nx * nx + ny * ny <= 1 && y < size * 0.55) {
      return [195, 177, 225, 255] // lavender cap
    }
    // body
    if (y >= size * 0.50 && x >= size * 0.22 && x <= size * 0.78) {
      // door
      if (y >= size * 0.66 && x >= size * 0.38 && x <= size * 0.62) {
        return [138, 90, 52, 255] // brown door
      }
      return [240, 228, 208, 255] // cream body
    }
    return [0, 0, 0, 0]
  })
  return nativeImage.createFromBuffer(buf)
}

// ── Window ──────────────────────────────────────────────────────────────────
function createWindow(): void {
  const pos = store.get('position')

  mainWindow = new BrowserWindow({
    width: 190,
    height: 225,
    x: pos.x >= 0 ? pos.x : undefined,
    y: pos.y >= 0 ? pos.y : undefined,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  // 위치 저장
  mainWindow.on('moved', () => {
    if (!mainWindow) return
    const [x, y] = mainWindow.getPosition()
    store.set('position', { x, y })
  })

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── Tray ─────────────────────────────────────────────────────────────────────
function createTray(): void {
  const icon = createTrayIcon(22)
  tray = new Tray(icon)
  tray.setToolTip('퇴근요정')

  const menu = Menu.buildFromTemplate([
    {
      label: '⚙ 설정',
      click: () => mainWindow?.webContents.send('open-settings'),
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => app.quit(),
    },
  ])
  tray.setContextMenu(menu)

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus()
    }
  })
}

// ── IPC ──────────────────────────────────────────────────────────────────────
function setupIPC(): void {
  ipcMain.handle('get-settings', () => store.get('settings'))

  ipcMain.handle('save-settings', (_, settings: AppSettings) => {
    store.set('settings', settings)
    // 다른 창(위젯)에도 변경 사항 전파
    mainWindow?.webContents.send('settings-updated', settings)
  })

  // 드래그: renderer에서 screenX/Y 전달, main에서 setPosition으로 이동
  let dragging = false
  let startScreenX = 0, startScreenY = 0
  let winStartX = 0, winStartY = 0

  ipcMain.on('drag-start', (_, sx: number, sy: number) => {
    if (!mainWindow) return
    dragging = true
    startScreenX = sx; startScreenY = sy
    const [wx, wy] = mainWindow.getPosition()
    winStartX = wx; winStartY = wy
  })

  ipcMain.on('drag-move', (_, sx: number, sy: number) => {
    if (!dragging || !mainWindow) return
    mainWindow.setPosition(
      winStartX + (sx - startScreenX),
      winStartY + (sy - startScreenY)
    )
  })

  ipcMain.on('drag-stop', () => {
    dragging = false
    if (!mainWindow) return
    const [x, y] = mainWindow.getPosition()
    store.set('position', { x, y })
  })

  // ── 우클릭 컨텍스트 메뉴 ────────────────────────────────────────
  ipcMain.on('show-context-menu', (_, cur: AppSettings) => {
    const apply = (patch: Partial<AppSettings>) => {
      const next = { ...cur, ...patch }
      store.set('settings', next)
      mainWindow?.webContents.send('settings-updated', next)
      cur = next
    }

    const openTimeSettings = () => {
      if (timeSettingsWindow && !timeSettingsWindow.isDestroyed()) {
        timeSettingsWindow.focus(); return
      }
      const [wx, wy] = mainWindow?.getPosition() ?? [100, 100]
      timeSettingsWindow = new BrowserWindow({
        width: 320, height: 430,
        x: Math.max(0, wx - 160), y: wy,
        title: '시간 설정',
        resizable: false, maximizable: false, minimizable: false,
        alwaysOnTop: true, skipTaskbar: true,
        backgroundColor: '#FBFAFE',
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          nodeIntegration: false, contextIsolation: true, sandbox: false,
        },
      })
      timeSettingsWindow.setMenu(null)
      const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
      if (isDev && process.env['ELECTRON_RENDERER_URL']) {
        timeSettingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?page=time`)
      } else {
        timeSettingsWindow.loadFile(join(__dirname, '../renderer/index.html'), { search: '?page=time' })
      }
      timeSettingsWindow.on('closed', () => { timeSettingsWindow = null })
    }

    const menu = Menu.buildFromTemplate([
      {
        label: '요정 선택',
        submenu: [
          { label: '청년 남', type: 'radio', checked: cur.charId === 'young_m', click: () => apply({ charId: 'young_m' }) },
          { label: '청년 여', type: 'radio', checked: cur.charId === 'young_f', click: () => apply({ charId: 'young_f' }) },
          { label: '중년 남', type: 'radio', checked: cur.charId === 'mid_m',   click: () => apply({ charId: 'mid_m' }) },
          { label: '중년 여', type: 'radio', checked: cur.charId === 'mid_f',   click: () => apply({ charId: 'mid_f' }) },
        ],
      },
      { label: '시간 설정', click: openTimeSettings },
      { type: 'separator' },
      {
        label: '집 선택',
        submenu: [
          { label: '버섯집',    type: 'radio', checked: cur.houseShape === 'mushroom', click: () => apply({ houseShape: 'mushroom' }) },
          { label: '통나무집',  type: 'radio', checked: cur.houseShape === 'cabin',    click: () => apply({ houseShape: 'cabin' }) },
          { label: '텐트',      type: 'radio', checked: cur.houseShape === 'tent',     click: () => apply({ houseShape: 'tent' }) },
        ],
      },
      {
        label: '말풍선 선택',
        submenu: [
          { label: '둥근 말풍선', type: 'radio', checked: cur.bubbleStyle === 'rounded', click: () => apply({ bubbleStyle: 'rounded' }) },
          { label: '픽셀 말풍선', type: 'radio', checked: cur.bubbleStyle === 'pixel',   click: () => apply({ bubbleStyle: 'pixel' }) },
          { label: '메모지',      type: 'radio', checked: cur.bubbleStyle === 'sticky',  click: () => apply({ bubbleStyle: 'sticky' }) },
        ],
      },
      {
        label: '색상 선택',
        submenu: [
          { label: '라벤더',  type: 'radio', checked: cur.accent === '#C3B1E1', click: () => apply({ accent: '#C3B1E1' }) },
          { label: '로즈',    type: 'radio', checked: cur.accent === '#F4B8C8', click: () => apply({ accent: '#F4B8C8' }) },
          { label: '민트',    type: 'radio', checked: cur.accent === '#A8DBC5', click: () => apply({ accent: '#A8DBC5' }) },
          { label: '피치',    type: 'radio', checked: cur.accent === '#F4C9A0', click: () => apply({ accent: '#F4C9A0' }) },
          { label: '스카이',  type: 'radio', checked: cur.accent === '#A8C8F4', click: () => apply({ accent: '#A8C8F4' }) },
          { label: '선플라워', type: 'radio', checked: cur.accent === '#F4E4A0', click: () => apply({ accent: '#F4E4A0' }) },
        ],
      },
      { type: 'separator' },
      { label: '종료', click: () => app.quit() },
    ])

    menu.popup({ window: mainWindow! })
  })
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  app.setAppUserModelId('com.grinfairy.app')
  createWindow()
  createTray()
  setupIPC()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
