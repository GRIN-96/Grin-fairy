import { useRef, useEffect, CSSProperties } from 'react'
import type { HouseShape, HouseState } from './types'

export const GRID = 36

interface Pal {
  out: string; white: string; black: string; blush: string; spark: string
  led: string; ledOff: string; leddark: string
  skin: string; skinSh: string; hair: string; hairSh: string
  cloth: string; clothSh: string; cloth2: string; wing: string
}

interface CharFeat {
  hair: 'short' | 'bob' | 'bald' | 'perm'
  glasses: boolean
  earbud: boolean
  accessory: string
}

export interface Character {
  id: string
  name: string
  sub: string
  blurb: string
  feat: CharFeat
  pal: Pal
}

type PxFn = (x: number, y: number, w?: number, h?: number, c?: string) => void

function pal(o: Partial<Pal> & Pick<Pal, 'skin' | 'skinSh' | 'hair' | 'hairSh' | 'cloth' | 'clothSh' | 'cloth2' | 'wing'>): Pal {
  return Object.assign({
    out: '#3B3550', white: '#FFFFFF', black: '#2B2738',
    blush: '#F4A6B8', spark: '#FFE08A',
    led: '#FF5D5D', ledOff: '#5A1F1F', leddark: '#2A0B0B',
  }, o) as Pal
}

export const CHARACTERS: Character[] = [
  {
    id: 'young_m', name: '청년요정', sub: '남 · 후드티 & 에어팟',
    blurb: '아침엔 에어팟 끼고 출근, 6시 땡 치면 누구보다 빠르게 사라짐.',
    feat: { hair: 'short', glasses: false, earbud: true, accessory: 'none' },
    pal: pal({ skin: '#F2C7A6', skinSh: '#E0AC85', hair: '#7A4B2B', hairSh: '#5E3820',
      cloth: '#A0C4E8', clothSh: '#7FA6D2', cloth2: '#C9DCF2', wing: '#DCE9FA' }),
  },
  {
    id: 'young_f', name: '청년요정', sub: '여 · 카디건 & 텀블러',
    blurb: '손에서 텀블러를 놓지 않는다. 카페인은 요정의 마나.',
    feat: { hair: 'bob', glasses: false, earbud: false, accessory: 'tumbler' },
    pal: pal({ skin: '#F6CDB2', skinSh: '#E8B292', hair: '#4E3326', hairSh: '#382418',
      cloth: '#F2A9C4', clothSh: '#D984A6', cloth2: '#FBD2E2', wing: '#FBDDE9' }),
  },
  {
    id: 'mid_m', name: '중년요정', sub: '남 · 셔츠 & 조끼 & 돋보기',
    blurb: '"라떼는"을 시전하려다 퇴근시간이라 참는다. 워라밸은 안다.',
    feat: { hair: 'bald', glasses: true, earbud: false, accessory: 'none' },
    pal: pal({ skin: '#E9BD9A', skinSh: '#D4A481', hair: '#B9BDC4', hairSh: '#969BA4',
      cloth: '#9AA7B5', clothSh: '#73808F', cloth2: '#6E7A8A', wing: '#DDE3EA' }),
  },
  {
    id: 'mid_f', name: '중년요정', sub: '여 · 블라우스 & 보온병',
    blurb: '보온병에 든 건 결코 식지 않는다. 정시 퇴근도 결코 식지 않는다.',
    feat: { hair: 'perm', glasses: false, earbud: false, accessory: 'thermos' },
    pal: pal({ skin: '#F0C5A6', skinSh: '#DDAC8A', hair: '#8C7A6A', hairSh: '#6E5E50',
      cloth: '#C3B1E1', clothSh: '#9E89C4', cloth2: '#E0D6F0', wing: '#E7DEF4' }),
  },
]

function makePx(ctx: CanvasRenderingContext2D): PxFn {
  return (x, y, w = 1, h = 1, c) => {
    if (!c) return
    ctx.fillStyle = c
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0)
  }
}

function drawWings(P: PxFn, p: Pal, frame: number): void {
  const f = frame ? 1 : 0
  P(6, 13 - f, 5, 9, p.wing); P(5, 15 - f, 2, 5, p.wing)
  P(6, 13 - f, 5, 1, p.out); P(5, 15 - f, 1, 5, p.out)
  P(25, 13 - f, 5, 9, p.wing); P(29, 15 - f, 2, 5, p.wing)
  P(25, 13 - f, 5, 1, p.out); P(30, 15 - f, 1, 5, p.out)
}

function drawHead(P: PxFn, p: Pal, feat: CharFeat, expr: string, blink: boolean): void {
  P(13, 8, 10, 9, p.skin); P(12, 9, 1, 7, p.skin); P(23, 9, 1, 7, p.skin)
  P(13, 7, 10, 1, p.out); P(12, 8, 1, 9, p.out)
  P(23, 8, 1, 9, p.out); P(13, 17, 10, 1, p.out)
  P(13, 14, 2, 1, p.blush); P(21, 14, 2, 1, p.blush)

  if (feat.hair === 'short') {
    P(12, 6, 12, 3, p.hair); P(12, 6, 12, 1, p.hairSh)
    P(12, 9, 1, 2, p.hair); P(23, 9, 1, 2, p.hair)
  } else if (feat.hair === 'bob') {
    P(11, 6, 14, 3, p.hair); P(11, 9, 2, 6, p.hair)
    P(23, 9, 2, 6, p.hair); P(11, 6, 14, 1, p.hairSh)
    P(14, 8, 8, 1, p.skin)
  } else if (feat.hair === 'bald') {
    P(12, 9, 1, 4, p.hair); P(23, 9, 1, 4, p.hair)
    P(13, 8, 2, 1, p.hair); P(21, 8, 2, 1, p.hair)
    P(17, 7, 2, 1, p.skinSh)
  } else if (feat.hair === 'perm') {
    P(11, 5, 14, 4, p.hair); P(10, 7, 2, 5, p.hair); P(24, 7, 2, 5, p.hair)
    P(12, 5, 1, 1, p.hairSh); P(15, 4, 1, 1, p.hair)
    P(18, 4, 1, 1, p.hair); P(21, 4, 1, 1, p.hair); P(23, 5, 1, 1, p.hairSh)
  }

  const eyeY = 12
  if (expr === 'annoyed') {
    P(14, eyeY, 3, 1, p.black); P(19, eyeY, 3, 1, p.black)
  } else if (expr === 'happy' || expr === 'cheer') {
    P(15, eyeY, 1, 1, p.black); P(14, eyeY + 1, 1, 1, p.black); P(16, eyeY + 1, 1, 1, p.black)
    P(20, eyeY, 1, 1, p.black); P(19, eyeY + 1, 1, 1, p.black); P(21, eyeY + 1, 1, 1, p.black)
  } else if (blink) {
    P(14, eyeY + 1, 2, 1, p.black); P(20, eyeY + 1, 2, 1, p.black)
  } else {
    P(14, eyeY, 2, 2, p.black); P(20, eyeY, 2, 2, p.black)
    P(15, eyeY, 1, 1, p.white); P(21, eyeY, 1, 1, p.white)
  }

  if (feat.glasses) {
    P(13, 11, 4, 4, p.out); P(19, 11, 4, 4, p.out); P(17, 12, 2, 1, p.out)
    P(14, 12, 2, 2, '#ffffff'); P(20, 12, 2, 2, '#ffffff')
    P(15, 13, 1, 1, p.black); P(21, 13, 1, 1, p.black)
  }

  if (expr === 'cheer' || expr === 'happy') {
    P(16, 15, 4, 1, p.out); P(17, 16, 2, 1, p.out)
  } else if (expr === 'annoyed') {
    P(16, 15, 4, 1, p.out)
  } else {
    P(17, 15, 2, 1, p.out)
  }

  if (feat.earbud) {
    P(11, 12, 1, 2, p.white); P(11, 14, 1, 2, p.white); P(24, 12, 1, 2, p.white)
  }
}

function drawLanyard(P: PxFn, p: Pal): void {
  P(16, 17, 1, 3, p.cloth2); P(19, 17, 1, 3, p.cloth2)
  P(15, 20, 6, 4, p.white)
  P(15, 20, 6, 1, p.out); P(15, 23, 6, 1, p.out)
  P(15, 20, 1, 4, p.out); P(20, 20, 1, 4, p.out)
  P(16, 21, 2, 2, p.skinSh); P(18, 21, 2, 1, p.cloth)
}

function drawBody(P: PxFn, p: Pal): void {
  P(13, 17, 10, 10, p.cloth); P(13, 17, 10, 1, p.cloth2)
  P(12, 18, 1, 8, p.cloth); P(23, 18, 1, 8, p.cloth)
  P(12, 18, 1, 9, p.out); P(23, 18, 1, 9, p.out)
  P(13, 27, 10, 1, p.out); P(13, 24, 10, 2, p.clothSh)
  P(15, 27, 2, 3, p.skinSh); P(19, 27, 2, 3, p.skinSh)
  P(15, 30, 3, 1, p.out); P(19, 30, 3, 1, p.out)
}

const LED_FONT: Record<string, string[]> = {
  '0': ['111','101','101','101','111'], '1': ['010','110','010','010','111'],
  '2': ['111','001','111','100','111'], '3': ['111','001','111','001','111'],
  '4': ['101','101','111','001','001'], '5': ['111','100','111','001','111'],
  '6': ['111','100','111','101','111'], '7': ['111','001','010','010','010'],
  '8': ['111','101','111','101','111'], '9': ['111','101','111','001','111'],
  ':': ['0','1','0','1','0'],
}

function drawLEDBoard(P: PxFn, p: Pal, x: number, y: number, remain: string): void {
  const w = 20, h = 9
  P(x - 1, y - 1, w + 2, h + 2, p.out)
  P(x, y, w, h, p.leddark)
  P(x, y, w, 1, '#444')
  let cx = x + 1
  const str = (remain || '00:00').slice(0, 5)
  for (const ch of str) {
    const glyph = LED_FONT[ch]
    if (!glyph) { cx += 2; continue }
    const gw = glyph[0].length
    for (let ry = 0; ry < 5; ry++) {
      for (let rx = 0; rx < gw; rx++) {
        if (glyph[ry][rx] === '1') P(cx + rx, y + 2 + ry, 1, 1, p.led)
      }
    }
    cx += gw + 1
  }
}

export type FairyPose = 'idle' | 'talk' | 'annoyed' | 'cheer' | 'eat' | 'countdown' | 'leave'

export function drawFairy(
  ctx: CanvasRenderingContext2D,
  opts: { pose: FairyPose; frame: number; blink: boolean; character: Character; remain?: string }
): void {
  const { pose, frame, blink, character, remain = '00:00' } = opts
  const P = makePx(ctx)
  const p = character.pal
  const feat = character.feat
  ctx.clearRect(0, 0, GRID, GRID)

  if (pose === 'leave') { drawLeave(P, p, feat, frame); return }

  drawWings(P, p, frame)

  let expr = 'normal'
  if (pose === 'cheer') expr = 'cheer'
  else if (pose === 'annoyed') expr = 'annoyed'
  else if (pose === 'eat' || pose === 'talk') expr = 'happy'

  drawBody(P, p)
  drawLanyard(P, p)
  drawHead(P, p, feat, expr, blink && pose === 'idle')

  if (pose === 'idle') {
    P(11, 19, 2, 5, p.cloth); P(11, 23, 2, 1, p.skin)
    P(23, 19, 2, 5, p.cloth); P(23, 23, 2, 1, p.skin)
  }
  if (pose === 'talk') {
    P(24, 14, 2, 5, p.cloth); P(25, 12, 2, 3, p.skin); P(27, 12, 1, 1, p.skin)
    P(11, 20, 2, 4, p.cloth)
  }
  if (pose === 'annoyed') {
    P(24, 13, 2, 4, p.cloth); P(25, 11, 2, 2, p.skin); P(24, 10, 1, 1, p.skin)
    P(28, 11, 1, 1, '#A0C4E8'); P(28, 12, 2, 1, '#A0C4E8'); P(28, 13, 1, 1, '#A0C4E8')
    P(11, 20, 2, 4, p.cloth)
  }
  if (pose === 'cheer') {
    P(11, 12, 2, 6, p.cloth); P(11, 10, 2, 2, p.skin)
    P(23, 12, 2, 6, p.cloth); P(23, 10, 2, 2, p.skin)
    const tw = frame ? 1 : 0
    P(8 + tw, 9, 1, 1, p.spark); P(7 + tw, 8, 1, 1, p.spark)
    P(9 + tw, 8, 1, 1, p.spark); P(8 + tw, 7, 1, 1, p.spark)
    P(27 - tw, 7, 1, 1, p.spark); P(26 - tw, 6, 1, 1, p.spark)
    P(28 - tw, 6, 1, 1, p.spark); P(27 - tw, 5, 1, 1, p.spark)
    P(17, 4 + tw, 1, 1, p.spark); P(16, 5 + tw, 1, 1, p.spark); P(18, 5 + tw, 1, 1, p.spark)
  }
  if (pose === 'eat') {
    P(11, 20, 2, 3, p.cloth); P(23, 20, 2, 3, p.cloth)
    if (!frame) {
      P(14, 24, 8, 3, '#E8DCC0'); P(14, 24, 8, 1, '#CFC0A0')
      P(15, 22, 1, 2, p.skin)
      P(16, 20, 1, 4, '#9A6B3F'); P(17, 20, 1, 4, '#9A6B3F')
      P(18, 25, 1, 1, '#E5765B'); P(20, 25, 1, 1, '#7FB069')
    } else {
      P(20, 22, 4, 4, p.cloth2); P(20, 22, 4, 1, p.white); P(24, 23, 1, 2, p.cloth2)
      P(21, 19, 1, 2, '#D8D0E8'); P(22, 18, 1, 2, '#D8D0E8')
    }
  }
  if (pose === 'countdown') {
    P(11, 21, 2, 4, p.cloth); P(11, 24, 2, 1, p.skin)
    P(23, 21, 2, 4, p.cloth); P(23, 24, 2, 1, p.skin)
    drawLEDBoard(P, p, 8, 20, remain)
  }
}

function drawLeave(P: PxFn, p: Pal, feat: CharFeat, frame: number): void {
  drawWings(P, p, frame)
  P(13, 17, 9, 10, p.cloth); P(12, 18, 1, 9, p.out); P(22, 18, 1, 9, p.out)
  P(13, 24, 9, 2, p.clothSh)
  if (!frame) { P(14, 27, 2, 3, p.skinSh); P(19, 27, 2, 4, p.skinSh) }
  else { P(15, 27, 2, 4, p.skinSh); P(18, 27, 2, 3, p.skinSh) }
  P(14, 30, 8, 1, p.out)
  P(21, 20, 4, 5, '#9A6B3F'); P(21, 20, 4, 1, '#7A5230')
  P(15, 18, 8, 1, '#7A5230')
  drawHead(P, p, feat, 'happy', false)
  if (!frame) { P(24, 11, 2, 5, p.cloth); P(25, 9, 2, 2, p.skin) }
  else { P(25, 12, 2, 5, p.cloth); P(26, 10, 2, 2, p.skin) }
  P(28, 8, 1, 1, p.spark); P(29, 9, 1, 1, p.spark)
}

function shade(hex: string, k: number): string {
  const c = hex.replace('#', '')
  let r = parseInt(c.slice(0, 2), 16)
  let g = parseInt(c.slice(2, 4), 16)
  let b = parseInt(c.slice(4, 6), 16)
  r = Math.max(0, Math.min(255, Math.round(r * k)))
  g = Math.max(0, Math.min(255, Math.round(g * k)))
  b = Math.max(0, Math.min(255, Math.round(b * k)))
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

export function drawHouse(
  ctx: CanvasRenderingContext2D,
  opts: { shape: HouseShape; state: HouseState; frame: number; accent: string }
): void {
  const { shape, state, frame, accent } = opts
  const P = makePx(ctx)
  ctx.clearRect(0, 0, GRID, GRID)
  const O = '#3B3550'

  const door = (open: boolean) => {
    if (state === 'off') {
      P(15, 24, 6, 8, '#2A2535')
      P(15, 24, 6, 1, O); P(15, 31, 6, 1, O)
      P(15, 24, 1, 8, O); P(20, 24, 1, 8, O)
      P(13, 20, 10, 4, '#E8DCC0'); P(13, 20, 10, 1, '#CFC0A0')
      P(14, 22, 1, 1, O); P(16, 22, 1, 1, O)
      P(18, 22, 1, 1, O); P(20, 22, 1, 1, O)
      P(17, 18, 1, 2, O)
      return
    }
    if (open) {
      P(14, 22, 8, 10, '#241F30'); P(14, 22, 8, 1, O)
      P(14, 22, 1, 10, O); P(21, 22, 1, 10, O)
      P(22, 22, 2, 9, '#7A5230'); P(22, 22, 1, 9, O)
      P(16, 28, 4, 4, 'rgba(255,224,138,0.5)')
    } else {
      P(15, 23, 6, 9, '#8A5A34'); P(15, 23, 6, 1, '#A06B3F')
      P(15, 23, 1, 9, O); P(20, 23, 1, 9, O)
      P(15, 23, 6, 1, O); P(15, 31, 6, 1, O)
      P(19, 27, 1, 1, '#FFE08A')
      P(16, 24, 4, 2, '#FFE08A'); P(16, 24, 4, 1, O); P(18, 24, 1, 2, O)
    }
  }

  if (shape === 'mushroom') {
    P(11, 18, 14, 14, '#F0E4D0'); P(11, 18, 14, 1, '#FFF7EA')
    P(11, 18, 1, 14, O); P(24, 18, 1, 14, O); P(11, 32, 14, 1, O)
    P(8, 12, 20, 7, accent); P(6, 14, 24, 4, accent)
    P(6, 14, 24, 1, shade(accent, 1.12)); P(8, 12, 20, 1, shade(accent, 1.12))
    P(6, 18, 24, 1, O); P(6, 14, 1, 4, O); P(29, 14, 1, 4, O); P(8, 12, 20, 1, O)
    P(11, 15, 2, 2, '#FFF7EA'); P(17, 14, 2, 2, '#FFF7EA'); P(23, 16, 2, 2, '#FFF7EA')
    if (state !== 'off') { P(12, 21, 3, 3, '#FFE08A'); P(12, 21, 3, 1, O); P(13, 21, 1, 3, O) }
    else { P(12, 21, 3, 3, '#3A3346'); P(12, 21, 3, 1, O) }
    door(state === 'open')
  } else if (shape === 'cabin') {
    P(9, 19, 18, 13, '#C99B6E')
    for (let i = 0; i < 6; i++) P(9, 19 + i * 2, 18, 1, '#A87C50')
    P(9, 19, 1, 13, O); P(26, 19, 1, 13, O); P(9, 32, 18, 1, O)
    for (let i = 0; i < 8; i++) {
      const col = i % 2 ? accent : shade(accent, 0.92)
      P(17 - i, 11 + i, 2 + i * 2, 1, i === 0 ? accent : col)
    }
    P(7, 19, 22, 1, shade(accent, 0.85)); P(7, 19, 22, 1, O)
    for (let i = 0; i < 8; i++) { P(17 - i - 1, 11 + i, 1, 1, O); P(18 + i, 11 + i, 1, 1, O) }
    P(16, 10, 4, 1, O)
    if (state !== 'off') { P(11, 22, 3, 3, '#FFE08A'); P(11, 22, 3, 1, O); P(12, 22, 1, 3, O) }
    else { P(11, 22, 3, 3, '#3A3346'); P(11, 22, 3, 1, O) }
    door(state === 'open')
  } else {
    P(17, 9, 2, 2, O); P(17, 7, 1, 4, '#9A6B3F')
    P(18, 7, 2, 1, accent); P(18, 8, 3, 1, accent)
    for (let i = 0; i < 18; i++) {
      const half = i + 1
      const xL = 18 - half, xR = 18 + half
      const col = (Math.floor(i / 2) % 2 === 0) ? accent : shade(accent, 1.1)
      P(xL, 13 + i, xR - xL, 1, col)
      P(xL, 13 + i, 1, 1, O); P(xR - 1, 13 + i, 1, 1, O)
    }
    P(0, 31, 36, 1, O)
    door(state === 'open')
    P(2, 28, 4, 1, '#A87C50'); P(30, 28, 4, 1, '#A87C50')
  }

  void frame // suppress unused warning (frame kept for API compat)
}

// ── PixelCanvas React component ──────────────────────────────────────────────
interface PixelCanvasProps {
  draw: (ctx: CanvasRenderingContext2D) => void
  scale?: number
  size?: number
  style?: CSSProperties
  className?: string
  // 히트 테스트(클릭 통과 판정)를 위해 캔버스 엘리먼트를 외부로 노출
  canvasRef?: (el: HTMLCanvasElement | null) => void
}

export function PixelCanvas({ draw, scale = 6, size = GRID, style, className, canvasRef }: PixelCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const ctx = cv.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, size, size)
    draw(ctx)
  })
  return (
    <canvas
      ref={(el) => { ref.current = el; canvasRef?.(el) }}
      width={size}
      height={size}
      className={className}
      style={{ width: size * scale, height: size * scale, imageRendering: 'pixelated', display: 'block', ...style }}
    />
  )
}
