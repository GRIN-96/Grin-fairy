export interface Schedule {
  arrive: number
  lunchStart: number
  lunchEnd: number
  leave: number
}

export type AppSize = 's' | 'm' | 'l'

export interface AppSettings {
  schedule: Schedule
  charId: string
  accent: string
  houseShape: HouseShape
  bubbleStyle: BubbleStyle
  size: AppSize
}

export type Phase =
  | 'off_pre'
  | 'cheer'
  | 'work'
  | 'lunch'
  | 'countdown'
  | 'leave'
  | 'off_post'

export type Pose = 'idle' | 'talk' | 'annoyed' | 'cheer' | 'eat' | 'countdown' | 'leave'
export type HouseState = 'closed' | 'open' | 'off'
export type HouseShape = 'mushroom' | 'cabin' | 'tent'
export type BubbleStyle = 'rounded' | 'pixel' | 'sticky'

export interface ElectronAPI {
  getSettings: () => Promise<AppSettings>
  saveSettings: (s: AppSettings) => Promise<void>
  setIgnoreMouseEvents: (ignore: boolean) => void
  startDrag: (x: number, y: number) => void
  moveDrag: (x: number, y: number) => void
  stopDrag: () => void
  onOpenSettings: (cb: () => void) => () => void
  showContextMenu: (settings: AppSettings) => void
  onSettingsUpdate: (cb: (settings: AppSettings) => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
