import { useState, useEffect, useRef, CSSProperties } from 'react'
import { drawFairy, drawHouse, PixelCanvas } from './sprites'
import type { Character } from './sprites'
import type { Phase, HouseShape, BubbleStyle, Schedule, AppSize } from './types'

// 캔버스의 (x,y) 클라이언트 좌표가 실제로 그려진 픽셀(알파>임계값) 위인지 판정.
// 36×36 백킹 스토어를 표시 크기에 맞춰 역매핑해 1px 알파를 샘플링한다.
const HIT_ALPHA = 16
function hitCanvas(cv: HTMLCanvasElement, x: number, y: number): boolean {
  const r = cv.getBoundingClientRect()
  if (x < r.left || x >= r.right || y < r.top || y >= r.bottom) return false
  const gx = Math.floor(((x - r.left) / r.width) * cv.width)
  const gy = Math.floor(((y - r.top) / r.height) * cv.height)
  try {
    return cv.getContext('2d')!.getImageData(gx, gy, 1, 1).data[3] > HIT_ALPHA
  } catch {
    return true // 혹시 읽기 실패 시 안전하게 캡처
  }
}

const pad2 = (n: number) => String(n).padStart(2, '0')
export function hhmm(min: number) { return `${pad2(Math.floor(min / 60) % 24)}:${pad2(Math.floor(min) % 60)}` }
export function mmss(sec: number) {
  sec = Math.max(0, Math.floor(sec))
  return `${pad2(Math.floor(sec / 60))}:${pad2(sec % 60)}`
}

export function getPhase(simSec: number, s: Schedule): Phase {
  const m = simSec / 60
  if (m < s.arrive - 10) return 'off_pre'
  if (m < s.arrive + 12) return 'cheer'
  if (m < s.lunchStart) return 'work'
  if (m < s.lunchEnd) return 'lunch'
  if (m < s.leave - 30) return 'work'
  if (m < s.leave) return 'countdown'
  if (m < s.leave + 5) return 'leave'
  return 'off_post'
}

interface PhaseInfo { pose: string | null; house: 'closed' | 'open' | 'off'; label: string; tag: string }

export const PHASE_INFO: Record<Phase, PhaseInfo> = {
  off_pre:   { pose: null,        house: 'off',    label: '출근 전',       tag: '불 꺼짐'    },
  cheer:     { pose: 'cheer',     house: 'open',   label: '출근 응원',     tag: '문 열림'    },
  work:      { pose: null,        house: 'closed', label: '근무 중',       tag: '문 닫힘'    },
  lunch:     { pose: 'eat',       house: 'open',   label: '점심시간',      tag: '문 열림'    },
  countdown: { pose: 'countdown', house: 'open',   label: '퇴근 카운트다운', tag: '전광판 ON'  },
  leave:     { pose: 'leave',     house: 'open',   label: '칼퇴 중',       tag: '먼저 갑니다' },
  off_post:  { pose: null,        house: 'off',    label: '퇴근 후',       tag: 'CLOSED'    },
}

const MESSAGES: Record<string, string[]> = {
  cheer: [
    '출근... 인정합니다. 오늘도 살아남아요.',
    '눈 떴으면 절반은 성공이에요. 가시죠.',
    '월급이 저 안에서 기다려요.',
    '커피 한 잔의 힘을 믿어봅시다.',
    '힘내세요. 퇴근은 반드시 옵니다.',
    '어차피 왔으면 최선을 다해봐요.',
    '오늘 하루만 버티면 돼요.',
    '오전만 버텨요. 나머진 알아서 돼요.',
    '이번 주도 시작됐습니다. 파이팅.',
    '일단 앉읍시다. 그게 오늘의 목표예요.',
  ],
  work: [
    '지금 바빠요. 용건은 6시 이후에.',
    '부르지 마세요. 일하는 척 중입니다.',
    '문 닫혀 있으면 그런 줄 아세요.',
    '회의 또 잡혔어요? 모르는 척합시다.',
    '저도 힘들어요. 나중에 얘기해요.',
    '바빠 보이죠? 그 착각 유지해줘요.',
  ],
  lunch: [
    '밥이 일보다 중요합니다. 천천히요.',
    '점심시간에 회의 잡는 거 아닙니다.',
    '후식까지가 점심이에요.',
    '오후는 밥심으로 버티는 겁니다.',
    '이 시간만큼은 누구에게도 뺏기지 말아요.',
    '맛있게 드세요. 그게 오늘의 권리입니다.',
  ],
  countdown: [
    '{t} 뒤 칼퇴. 가방 미리 챙기세요.',
    '마우스 흔들 시간에 짐 싸요. {t} 남음.',
    '거의 다 왔어요. {t} 만 버텨요.',
    '엘리베이터 동선 점검할 시간, {t}.',
    '눈치 보지 마요. {t} 남았으니까.',
    '칼퇴 예행연습. {t} 카운트다운 중.',
  ],
  leave: [
    '칼퇴는 권리입니다. 먼저 갈게요.',
    '정시 퇴근. 이게 맞습니다.',
    '내일 봐요. 야근은 모르는 일이에요.',
    '저는 갑니다. 불은 마지막에 끄세요.',
    '수고했어요. 오늘 하루 잘 버텼어요.',
    '퇴근길은 항상 아름답습니다.',
  ],
  off_pre:  ['아직 출근 전이에요. 더 자도 됩니다.', '요정도 준비 중. 곧 문 열어요.'],
  off_post: ['요정도 퇴근했습니다. 내일 9시에 봐요.', '불 꺼졌으면 칼퇴 신호입니다.', '연락은 근무시간에 부탁드려요.'],
}

function pickMessage(phase: string, idx: number, remainSec: number): string {
  const arr = MESSAGES[phase] || ['']
  return arr[idx % arr.length].replace('{t}', mmss(remainSec))
}

interface BubbleProps { text: string; style: BubbleStyle; accent: string; visible: boolean }

export function Bubble({ text, style, accent, visible }: BubbleProps) {
  const base: CSSProperties = {
    // 아래(꼬리) 기준 고정 — 메시지가 짧아도 집 위에 붙고, 길어지면 위로 자란다
    position: 'absolute', left: '50%', bottom: 100, transform: 'translateX(-50%)',
    maxWidth: 155, minWidth: 100, textAlign: 'center',
    padding: '7px 10px', fontSize: 12, lineHeight: 1.4, color: '#3B3550',
    zIndex: 30, opacity: visible ? 1 : 0, pointerEvents: 'none',
    transition: 'opacity .25s, transform .25s',
  }
  const tint = `color-mix(in srgb, ${accent} 28%, white)`

  if (style === 'pixel') {
    return (
      <div style={{ ...base, fontFamily: "'Galmuri11',monospace", background: tint,
        border: '2px solid #3B3550', borderRadius: 0, boxShadow: '4px 4px 0 rgba(59,53,80,.25)',
        transform: `translateX(-50%) translateY(${visible ? 0 : -4}px)` }}>
        {text}
        <span style={{ position: 'absolute', left: '50%', bottom: -9, transform: 'translateX(-50%)',
          width: 12, height: 7, background: tint, borderLeft: '2px solid #3B3550',
          borderRight: '2px solid #3B3550', clipPath: 'polygon(0 0,100% 0,50% 100%)' }} />
      </div>
    )
  }
  if (style === 'sticky') {
    return (
      <div style={{ ...base, background: '#FFF1A8', borderRadius: 3,
        fontFamily: "'Galmuri11',monospace", color: '#5b5326',
        boxShadow: '0 4px 10px rgba(0,0,0,.18)',
        transform: `translateX(-50%) rotate(-2.5deg) translateY(${visible ? 0 : -4}px)` }}>
        <span style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
          width: 38, height: 12, background: 'rgba(255,255,255,.55)', borderRadius: 2 }} />
        {text}
      </div>
    )
  }
  return (
    <div style={{ ...base, background: tint, borderRadius: 14,
      boxShadow: '0 6px 16px rgba(80,64,120,.18)',
      transform: `translateX(-50%) translateY(${visible ? 0 : -4}px)` }}>
      {text}
      <span style={{ position: 'absolute', left: '50%', bottom: -7, transform: 'translateX(-50%)',
        width: 14, height: 9, background: tint, clipPath: 'polygon(50% 100%,0 0,100% 0)' }} />
    </div>
  )
}

interface WidgetProps {
  simSec: number; schedule: Schedule; character: Character
  houseShape: HouseShape; bubbleStyle: BubbleStyle; accent: string; size: AppSize
}

// 크기 프리셋: 소=현재 기준(1), 중·대로 갈수록 요정·집·말풍선이 비율 그대로 커진다.
// 메인의 WINDOW_SIZES와 같은 배율을 유지해야 창과 콘텐츠가 함께 커진다.
const SIZE_MULT: Record<AppSize, number> = { s: 1, m: 1.12, l: 1.25 }

export function Widget({ simSec, schedule, character, houseShape, bubbleStyle, accent, size }: WidgetProps) {
  const phase = getPhase(simSec, schedule)
  const info = PHASE_INFO[phase]
  const remainSec = Math.max(0, schedule.leave * 60 - simSec)

  const [frame, setFrame] = useState(0)
  const [blink, setBlink] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const [poke, setPoke] = useState<{ pose: string | null; house: 'open'|'closed'|'off'; msg: string } | null>(null)

  // 히트 테스트용 캔버스 참조 + 상태 플래그
  const houseCanvas = useRef<HTMLCanvasElement | null>(null)
  const fairyCanvas = useRef<HTMLCanvasElement | null>(null)
  const fairyVisibleRef = useRef(false)
  const ignoringRef = useRef(true)   // 시작 시 메인은 클릭 통과 상태
  const draggingRef = useRef(false)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 2), 430)
    return () => clearInterval(id)
  }, [])

  // 마우스 위치가 요정·집 픽셀 위인지에 따라 클릭 통과를 토글.
  // 기본 ignore=true(+forward)라 통과 중에도 mousemove는 계속 들어온다.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) return // 드래그 중에는 캡처 유지
      const over =
        (!!houseCanvas.current && hitCanvas(houseCanvas.current, e.clientX, e.clientY)) ||
        (fairyVisibleRef.current && !!fairyCanvas.current && hitCanvas(fairyCanvas.current, e.clientX, e.clientY))
      const shouldIgnore = !over
      if (shouldIgnore !== ignoringRef.current) {
        ignoringRef.current = shouldIgnore
        window.electronAPI?.setIgnoreMouseEvents(shouldIgnore)
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const loop = () => {
      setBlink(true); setTimeout(() => setBlink(false), 140)
      t = setTimeout(loop, 2600 + Math.random() * 2200)
    }
    t = setTimeout(loop, 1800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => { setMsgIdx(0) }, [phase, character.id])
  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => i + 1), 6500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!poke) return
    const id = setTimeout(() => setPoke(null), 4200)
    return () => clearTimeout(id)
  }, [poke])

  const handlePoke = () => {
    if (phase === 'work') {
      setPoke({ pose: 'annoyed', house: 'open', msg: pickMessage('work', Math.floor(Math.random() * 6), 0) })
    } else if (phase === 'off_pre' || phase === 'off_post') {
      setPoke({ pose: null, house: 'off', msg: pickMessage(phase, Math.floor(Math.random() * 2), 0) })
    } else {
      setPoke({ pose: 'talk', house: 'open', msg: '네? 부르셨어요?' })
    }
  }

  // 드래그(3px 이상 이동)와 클릭(poke)을 구분. 위치 이동은 pointermove가 있는 동안만
  // moveDrag로 main에 알린다(손 떼면 멈춤). 드래그 종료는 pointerup/cancel/
  // lostpointercapture/window pointerup 등 여러 경로로 보장해 "안 멈추는" 문제를 막는다.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    const el = e.currentTarget
    const pointerId = e.pointerId
    try { el.setPointerCapture(pointerId) } catch { /* noop */ }
    draggingRef.current = true

    const startX = e.screenX, startY = e.screenY
    let didDrag = false
    let ended = false
    window.electronAPI?.startDrag(startX, startY)

    const onMove = (ev: PointerEvent) => {
      if (!didDrag && (Math.abs(ev.screenX - startX) > 3 || Math.abs(ev.screenY - startY) > 3)) {
        didDrag = true
      }
      if (didDrag) window.electronAPI?.moveDrag(ev.screenX, ev.screenY)
    }
    const end = () => {
      if (ended) return
      ended = true
      window.electronAPI?.stopDrag()
      draggingRef.current = false
      try { el.releasePointerCapture?.(pointerId) } catch { /* noop */ }
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
      el.removeEventListener('lostpointercapture', end)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('blur', end)
      if (!didDrag) handlePoke()
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    el.addEventListener('lostpointercapture', end)
    window.addEventListener('pointerup', end)
    window.addEventListener('blur', end)
  }

  const showPose = (poke ? poke.pose : info.pose) as any
  const houseState = (poke ? poke.house : info.house) as any
  const fairyVisible = !!showPose
  fairyVisibleRef.current = fairyVisible // 히트 테스트에서 보이지 않는 요정은 통과시키도록

  let bubbleText = '', bubbleVisible = false
  if (poke) { bubbleText = poke.msg; bubbleVisible = true }
  else if (info.pose) { bubbleText = pickMessage(phase, msgIdx, remainSec); bubbleVisible = true }

  // 소 기준 스프라이트 크기 (말풍선 대비 비율). 크기 프리셋은 아래 transform으로 전체에 곱해진다.
  const SPRITE_SCALE = 0.8
  const HOUSE_SCALE = 3.5 * SPRITE_SCALE, FAIRY_SCALE = 2.3 * SPRITE_SCALE
  const mult = SIZE_MULT[size] ?? 1

  return (
    <div
      onPointerDown={handlePointerDown}
      style={{ position: 'relative', width: 185, height: 200, cursor: 'grab', userSelect: 'none', touchAction: 'none',
        transform: `scale(${mult})`, transformOrigin: 'center bottom' }}>
      <Bubble text={bubbleText} style={bubbleStyle} accent={accent} visible={bubbleVisible} />

      <div style={{ position: 'absolute', left: '50%', bottom: 12, transform: 'translateX(-50%)',
        width: 118, height: 14,
        background: 'radial-gradient(ellipse at center, rgba(80,64,120,.18), transparent 70%)' }} />

      <div style={{ position: 'absolute', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 10 }}>
        <PixelCanvas scale={HOUSE_SCALE}
          canvasRef={(el) => { houseCanvas.current = el }}
          draw={(ctx) => drawHouse(ctx, { shape: houseShape, state: houseState, frame, accent })} />
      </div>

      <div style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)',
        zIndex: 20, opacity: fairyVisible ? 1 : 0, transition: 'opacity .3s ease',
        filter: 'drop-shadow(2px 3px 2px rgba(40,30,60,.25))', pointerEvents: 'none' }}>
        <PixelCanvas scale={FAIRY_SCALE}
          canvasRef={(el) => { fairyCanvas.current = el }}
          draw={(ctx) => drawFairy(ctx, { pose: showPose || 'idle', frame, blink, character, remain: mmss(remainSec) })} />
      </div>
    </div>
  )
}
