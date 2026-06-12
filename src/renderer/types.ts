export interface Schedule {
  arrive: number
  lunchStart: number
  lunchEnd: number
  leave: number
}

export interface AppSettings {
  schedule: Schedule
  charId: string
  accent: string
  houseShape: HouseShape
  bubbleStyle: BubbleStyle
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
