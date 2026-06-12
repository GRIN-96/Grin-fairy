import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, NativeImage } from 'electron'
import { join } from 'path'
import { deflateSync } from 'zlib'
import { store, AppSettings, AppSize } from './store'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let timeSettingsWindow: BrowserWindow | null = null
let isDragging = false // 드래그 중에는 'moved'마다 디스크 저장하지 않기 위한 플래그

// 창은 항상 최대(대) 크기로 고정하고 콘텐츠만 스케일한다. 투명 여백은 클릭 통과.
const WINDOW_W = 238
const WINDOW_H = 281

// 크기 변경: 설정만 저장하고 렌더러가 콘텐츠를 스케일한다.
// 창은 항상 최대 크기로 고정 — 창을 리사이즈/재배치하면 화면 밖으로 나가
// 사라지는 문제가 있어, 투명 여백은 클릭 통과로 두고 콘텐츠만 키운다.
function applySize(size: AppSize): void {
  if (!mainWindow) return
  const next = { ...store.get('settings'), size }
  store.set('settings', next)
  mainWindow.webContents.send('settings-updated', next)
  if (timeSettingsWindow && !timeSettingsWindow.isDestroyed()) {
    timeSettingsWindow.webContents.send('settings-updated', next)
  }
  buildTrayMenu()
}

// 트레이 컨텍스트 메뉴(현재 설정 반영) — 크기 변경 시 라디오 체크 갱신 위해 재구성
function buildTrayMenu(): void {
  if (!tray) return
  const cur = store.get('settings')
  const menu = Menu.buildFromTemplate([
    {
      label: '크기',
      submenu: [
        { label: '소', type: 'radio', checked: cur.size === 's', click: () => applySize('s') },
        { label: '중', type: 'radio', checked: cur.size === 'm', click: () => applySize('m') },
        { label: '대', type: 'radio', checked: cur.size === 'l', click: () => applySize('l') },
      ],
    },
    { type: 'separator' },
    { label: '종료', click: () => app.quit() },
  ])
  tray.setContextMenu(menu)
}

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
    width: WINDOW_W,
    height: WINDOW_H,
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

  // 위치 저장 — 드래그 중에는 건너뛰고(디스크 I/O 폭주로 드래그가 끊김),
  // 드래그가 끝날 때(drag-stop) 한 번만 저장한다.
  mainWindow.on('moved', () => {
    if (!mainWindow || isDragging) return
    const [x, y] = mainWindow.getPosition()
    store.set('position', { x, y })
  })

  // ── 항상 위 강화 ────────────────────────────────────────────────
  // 기본 'floating' 레벨은 전체화면 앱·다른 topmost 창에 z-순서를 뺏긴다.
  // 'screen-saver' 레벨로 올리고, 포커스가 없을 때 주기적으로 재확인한다.
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  const keepOnTop = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isFocused()) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
    }
  }, 2000)

  // ── 클릭 통과 기본값 ────────────────────────────────────────────
  // 투명 창은 사각형 전체로 마우스를 가로채므로, 기본은 통과시키고
  // (forward로 mousemove는 계속 받음) 렌더러가 요정·집 위에서만 캡처를 켠다.
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow?.setIgnoreMouseEvents(true, { forward: true })
  })

  mainWindow.on('closed', () => {
    clearInterval(keepOnTop)
    mainWindow = null
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
  tray.setToolTip('Grin-Fairy')

  buildTrayMenu()

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus()
    }
  })
}

// ── IPC ──────────────────────────────────────────────────────────────────────
function setupIPC(): void {
  ipcMain.handle('get-settings', () => store.get('settings'))

  // 렌더러의 히트 테스트 결과에 따라 클릭 통과를 토글
  ipcMain.on('set-ignore-mouse-events', (_, ignore: boolean) => {
    if (!mainWindow) return
    if (ignore) mainWindow.setIgnoreMouseEvents(true, { forward: true })
    else mainWindow.setIgnoreMouseEvents(false)
  })

  ipcMain.handle('save-settings', (_, settings: AppSettings) => {
    store.set('settings', settings)
    // 다른 창(위젯)에도 변경 사항 전파
    mainWindow?.webContents.send('settings-updated', settings)
  })

  // 드래그: 위치를 pointermove(창이 움직이면 되먹임돼 피드백 루프 발생)로 몰지 않고,
  // main이 자체 타이머로 커서를 폴링해 setPosition 한다. 창 위치가 입력으로 돌아오지
  // 않으므로 루프가 원천 차단된다. 좌표는 setPosition과 같은 DIP인 getCursorScreenPoint 사용.
  // 드래그: 좌표는 렌더러 screenX/Y(원본과 동일, DIP). 분수 배율(예: 175%)에서
  // setPosition이 호출마다 창 크기를 키우는 Electron 버그(#9477)가 있어, 크기를
  // 명시하는 setBounds로 고정한다 → 창이 부풀지 않아 드래그가 안정적이다.
  let dragging = false
  let startX = 0, startY = 0, winX = 0, winY = 0

  ipcMain.on('drag-start', (_, sx: number, sy: number) => {
    if (!mainWindow) return
    dragging = true
    isDragging = true
    startX = sx; startY = sy
    const [wx, wy] = mainWindow.getPosition()
    winX = wx; winY = wy
  })

  ipcMain.on('drag-move', (_, sx: number, sy: number) => {
    if (!dragging || !mainWindow) return
    mainWindow.setBounds({
      x: Math.round(winX + (sx - startX)),
      y: Math.round(winY + (sy - startY)),
      width: WINDOW_W,
      height: WINDOW_H,
    })
  })

  ipcMain.on('drag-stop', () => {
    dragging = false
    isDragging = false
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
      {
        label: '크기',
        submenu: [
          // 크기는 창 리사이즈가 필요해 applySize로 처리(설정+창+트레이 일괄 반영)
          { label: '소', type: 'radio', checked: cur.size === 's', click: () => applySize('s') },
          { label: '중', type: 'radio', checked: cur.size === 'm', click: () => applySize('m') },
          { label: '대', type: 'radio', checked: cur.size === 'l', click: () => applySize('l') },
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
