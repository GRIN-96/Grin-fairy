// Tauri 백엔드 연동 레이어 — 기존 Electron preload(window.electronAPI)를 대체한다.
import { getCurrentWindow } from '@tauri-apps/api/window'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emit, listen } from '@tauri-apps/api/event'
import { Menu, Submenu, MenuItem, CheckMenuItem, PredefinedMenuItem } from '@tauri-apps/api/menu'
import { load, type Store } from '@tauri-apps/plugin-store'
import { exit } from '@tauri-apps/plugin-process'
import type { AppSettings } from './types'

const DEFAULT_SETTINGS: AppSettings = {
  schedule: { arrive: 540, lunchStart: 720, lunchEnd: 780, leave: 1080 },
  charId: 'young_m',
  accent: '#C3B1E1',
  houseShape: 'mushroom',
  bubbleStyle: 'rounded',
}

let storePromise: Promise<Store> | null = null
function getStore(): Promise<Store> {
  storePromise ??= load('store.json', { autoSave: true, defaults: { settings: DEFAULT_SETTINGS } })
  return storePromise
}

// ── 설정 ─────────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  try {
    const store = await getStore()
    const s = await store.get<AppSettings>('settings')
    return s ?? DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const store = await getStore()
  await store.set('settings', settings)
  // 모든 창(위젯·시간 설정)에 변경 사항 전파
  await emit('settings-updated', settings)
}

export function onSettingsUpdate(cb: (s: AppSettings) => void): () => void {
  return subscribe<AppSettings>('settings-updated', cb)
}

// listen()이 비동기라서, 등록 완료 전에 해제돼도 누수가 없도록 감싼다
function subscribe<T>(event: string, cb: (payload: T) => void): () => void {
  let unlisten: (() => void) | undefined
  let cancelled = false
  listen<T>(event, (e) => cb(e.payload)).then((u) => {
    if (cancelled) u()
    else unlisten = u
  })
  return () => {
    cancelled = true
    unlisten?.()
  }
}

// ── 드래그 ───────────────────────────────────────────────────────────────────

export function startWindowDrag(): void {
  void getCurrentWindow().startDragging()
}

// ── 메인 창 초기화: 이동 시 위치 저장 + 트레이 메뉴 이벤트 ─────────────────────

export function initMainWindow(): () => void {
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  const win = getCurrentWindow()

  const unsubMoved = (() => {
    let unlisten: (() => void) | undefined
    let cancelled = false
    win.onMoved(({ payload }) => {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(async () => {
        const store = await getStore()
        await store.set('position', { x: payload.x, y: payload.y })
      }, 400)
    }).then((u) => {
      if (cancelled) u()
      else unlisten = u
    })
    return () => {
      cancelled = true
      unlisten?.()
    }
  })()

  const unsubTray = subscribe('open-time-settings', () => {
    void openTimeSettings()
  })

  return () => {
    clearTimeout(saveTimer)
    unsubMoved()
    unsubTray()
  }
}

// ── 시간 설정 창 ─────────────────────────────────────────────────────────────

export async function openTimeSettings(): Promise<void> {
  const existing = await WebviewWindow.getByLabel('time-settings')
  if (existing) {
    await existing.setFocus()
    return
  }
  const main = getCurrentWindow()
  const pos = (await main.outerPosition()).toLogical(await main.scaleFactor())
  new WebviewWindow('time-settings', {
    url: 'index.html?page=time',
    title: '시간 설정',
    width: 320,
    height: 430,
    x: Math.max(0, pos.x - 160),
    y: Math.max(0, pos.y),
    resizable: false,
    maximizable: false,
    minimizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#FBFAFE',
  })
}

// ── 우클릭 컨텍스트 메뉴 ─────────────────────────────────────────────────────

export async function showContextMenu(cur: AppSettings): Promise<void> {
  const apply = (patch: Partial<AppSettings>) => void saveSettings({ ...cur, ...patch })
  const radio = (text: string, checked: boolean, action: () => void) =>
    CheckMenuItem.new({ text, checked, action })

  const menu = await Menu.new({
    items: [
      await Submenu.new({
        text: '요정 선택',
        items: await Promise.all([
          radio('청년 남', cur.charId === 'young_m', () => apply({ charId: 'young_m' })),
          radio('청년 여', cur.charId === 'young_f', () => apply({ charId: 'young_f' })),
          radio('중년 남', cur.charId === 'mid_m', () => apply({ charId: 'mid_m' })),
          radio('중년 여', cur.charId === 'mid_f', () => apply({ charId: 'mid_f' })),
        ]),
      }),
      await MenuItem.new({ text: '시간 설정', action: () => void openTimeSettings() }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await Submenu.new({
        text: '집 선택',
        items: await Promise.all([
          radio('버섯집', cur.houseShape === 'mushroom', () => apply({ houseShape: 'mushroom' })),
          radio('통나무집', cur.houseShape === 'cabin', () => apply({ houseShape: 'cabin' })),
          radio('텐트', cur.houseShape === 'tent', () => apply({ houseShape: 'tent' })),
        ]),
      }),
      await Submenu.new({
        text: '말풍선 선택',
        items: await Promise.all([
          radio('둥근 말풍선', cur.bubbleStyle === 'rounded', () => apply({ bubbleStyle: 'rounded' })),
          radio('픽셀 말풍선', cur.bubbleStyle === 'pixel', () => apply({ bubbleStyle: 'pixel' })),
          radio('메모지', cur.bubbleStyle === 'sticky', () => apply({ bubbleStyle: 'sticky' })),
        ]),
      }),
      await Submenu.new({
        text: '색상 선택',
        items: await Promise.all([
          radio('라벤더', cur.accent === '#C3B1E1', () => apply({ accent: '#C3B1E1' })),
          radio('로즈', cur.accent === '#F4B8C8', () => apply({ accent: '#F4B8C8' })),
          radio('민트', cur.accent === '#A8DBC5', () => apply({ accent: '#A8DBC5' })),
          radio('피치', cur.accent === '#F4C9A0', () => apply({ accent: '#F4C9A0' })),
          radio('스카이', cur.accent === '#A8C8F4', () => apply({ accent: '#A8C8F4' })),
          radio('선플라워', cur.accent === '#F4E4A0', () => apply({ accent: '#F4E4A0' })),
        ]),
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({ text: '종료', action: () => void exit(0) }),
    ],
  })

  await menu.popup()
}
