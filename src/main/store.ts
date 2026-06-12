import Store from 'electron-store'

export interface Schedule {
  arrive: number      // minutes since midnight (default 540 = 09:00)
  lunchStart: number  // default 720 = 12:00
  lunchEnd: number    // default 780 = 13:00
  leave: number       // default 1080 = 18:00
}

export type AppSize = 's' | 'm' | 'l'

export interface AppSettings {
  schedule: Schedule
  charId: string
  accent: string
  houseShape: string
  bubbleStyle: string
  size: AppSize
}

interface StoreSchema {
  settings: AppSettings
  position: { x: number; y: number }
}

const DEFAULT_SETTINGS: AppSettings = {
  schedule: { arrive: 540, lunchStart: 720, lunchEnd: 780, leave: 1080 },
  charId: 'young_m',
  accent: '#C3B1E1',
  houseShape: 'mushroom',
  bubbleStyle: 'rounded',
  size: 's',
}

export const store = new Store<StoreSchema>({
  defaults: {
    settings: DEFAULT_SETTINGS,
    position: { x: -1, y: -1 },
  },
})
