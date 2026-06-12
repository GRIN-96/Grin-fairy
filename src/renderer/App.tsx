import { useState, useEffect, useCallback } from 'react'
import { Widget } from './widget'
import { TimeSettingsPage } from './settings'
import { CHARACTERS } from './sprites'
import type { AppSettings } from './types'
import './app.css'

const DEFAULT_SETTINGS: AppSettings = {
  schedule: { arrive: 540, lunchStart: 720, lunchEnd: 780, leave: 1080 },
  charId: 'young_m',
  accent: '#C3B1E1',
  houseShape: 'mushroom',
  bubbleStyle: 'rounded',
  size: 's',
}

// 시간 설정 전용 창인지 확인
const isTimePage = new URLSearchParams(window.location.search).get('page') === 'time'

export function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [simSec, setSimSec] = useState(0)

  // store에서 설정 로드 — 완료 후 settingsLoaded=true
  useEffect(() => {
    window.electronAPI?.getSettings().then((s) => {
      if (s) setSettings(s)
      setSettingsLoaded(true)
    })
  }, [])

  // 컨텍스트 메뉴 직접 변경 수신
  useEffect(() => {
    const unsub = window.electronAPI?.onSettingsUpdate((s) => setSettings(s))
    return () => unsub?.()
  }, [])

  // 실시간 시계
  useEffect(() => {
    if (isTimePage) return
    const tick = () => {
      const now = new Date()
      setSimSec(now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds())
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const character = CHARACTERS.find((c) => c.id === settings.charId) ?? CHARACTERS[0]

  const handleSaveSettings = useCallback((s: AppSettings) => {
    setSettings(s)
    window.electronAPI?.saveSettings(s)
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    window.electronAPI?.showContextMenu(settings)
  }, [settings])

  // 시간 설정 전용 창 — store 로드 완료 후에만 렌더링 (기본값으로 덮어쓰기 방지)
  if (isTimePage) {
    if (!settingsLoaded) return null
    return <TimeSettingsPage settings={settings} onSave={handleSaveSettings} />
  }

  return (
    <div className="widget-root"
      style={{ '--accent': settings.accent } as React.CSSProperties}
      onContextMenu={handleContextMenu}>
      <Widget
        simSec={simSec}
        schedule={settings.schedule}
        character={character}
        houseShape={settings.houseShape}
        bubbleStyle={settings.bubbleStyle}
        accent={settings.accent}
        size={settings.size}
      />
    </div>
  )
}
