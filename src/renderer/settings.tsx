import { useState } from 'react'
import type { AppSettings, Schedule } from './types'
import { hhmm } from './widget'

const STEPS = [30, 10, 5] as const
type Step = typeof STEPS[number]

function TimeField({ label, min, step, onChange }: {
  label: string; min: number; step: Step; onChange: (v: number) => void
}) {
  const set = (delta: number) => onChange(((min + delta) + 1440) % 1440)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 13, color: '#5b5470', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button className="step" onClick={() => set(-step)}>◀</button>
        <span style={{ fontFamily: "'Galmuri11',monospace", fontSize: 16, width: 58, textAlign: 'center',
          background: '#fff', border: '2px solid #3B3550', padding: '4px 0', color: '#3B3550', display: 'block' }}>
          {hhmm(min)}
        </span>
        <button className="step" onClick={() => set(step)}>▶</button>
      </div>
    </div>
  )
}

export function TimeSettingsPage({ settings, onSave }: { settings: AppSettings; onSave: (s: AppSettings) => void }) {
  const [schedule, setSchedule] = useState<Schedule>(settings.schedule)
  const [step, setStep] = useState<Step>(30)
  const [saved, setSaved] = useState(false)

  const handleChange = (s: Schedule) => {
    setSchedule(s)
    setSaved(false)
  }

  const handleSave = () => {
    onSave({ ...settings, schedule })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, padding: '18px 20px', background: '#FBFAFE',
      fontFamily: '"Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif', overflow: 'hidden' }}>

      {/* 헤더 + 단위 선택 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, paddingBottom: 10, borderBottom: '2px solid #e8e2f2' }}>
        <span style={{ fontFamily: "'Galmuri11',monospace", fontSize: 14, color: '#3B3550' }}>
          ⏰ 근무 시간 설정
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {STEPS.map(s => (
            <button key={s} onClick={() => setStep(s)} style={{
              fontFamily: "'Galmuri11',monospace", fontSize: 11,
              padding: '3px 7px', cursor: 'pointer', borderRadius: 5,
              border: '2px solid #3B3550',
              background: step === s ? '#3B3550' : '#fff',
              color: step === s ? '#fff' : '#3B3550',
              transition: 'background .12s, color .12s',
            }}>
              {s}분
            </button>
          ))}
        </div>
      </div>

      <TimeField label="출근 (응원)" min={schedule.arrive} step={step}
        onChange={(v) => handleChange({ ...schedule, arrive: v })} />
      <TimeField label="점심 시작" min={schedule.lunchStart} step={step}
        onChange={(v) => handleChange({ ...schedule, lunchStart: v })} />
      <TimeField label="점심 종료" min={schedule.lunchEnd} step={step}
        onChange={(v) => handleChange({ ...schedule, lunchEnd: v })} />
      <TimeField label="퇴근 (칼퇴)" min={schedule.leave} step={step}
        onChange={(v) => handleChange({ ...schedule, leave: v })} />

      <div style={{ fontSize: 11, color: '#8a82a0', marginTop: 12, lineHeight: 1.5,
        background: '#f0ecfa', padding: '8px 10px', borderRadius: 8 }}>
        퇴근 30분 전부터 전광판 카운트다운이 켜집니다.
      </div>
      <button onClick={handleSave} style={{
        marginTop: 16, width: '100%', padding: '9px 0',
        fontFamily: "'Galmuri11',monospace", fontSize: 14,
        background: saved ? '#a8d8b9' : '#3B3550',
        color: saved ? '#2a5a3a' : '#fff',
        border: 'none', borderRadius: 8, cursor: 'pointer',
        transition: 'background .2s, color .2s',
      }}>
        {saved ? '✓ 저장됐어요' : '저장'}
      </button>
    </div>
  )
}
