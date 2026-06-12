/* ============================================================
   app.jsx — Grin-Fairy 데모 앱
   위젯 + 데모 컨트롤(타임 스크러버/상태버튼/실시간) + 설정 창 + Tweaks
   ============================================================ */

const STORE_KEY = 'toigeun_demo_v1';

const DEFAULT_SCHEDULE = { arrive: 540, lunchStart: 720, lunchEnd: 780, leave: 1080 };

const STATE_JUMPS = (s) => ([
  { key: 'cheer', label: '출근', sec: s.arrive * 60 },
  { key: 'work', label: '근무', sec: (s.arrive + 90) * 60 },
  { key: 'lunch', label: '점심', sec: (s.lunchStart + 20) * 60 },
  { key: 'countdown', label: '카운트다운', sec: (s.leave - 2) * 60 - 25 },
  { key: 'leave', label: '칼퇴', sec: s.leave * 60 + 60 },
  { key: 'off', label: '마감', sec: (s.leave + 40) * 60 },
]);

const ACCENTS = { purple: '#C3B1E1', blue: '#A0C4E8', pink: '#F2A9C4', green: '#A8D5AE' };

/* ---------- 시간 입력 (HH:MM 스테퍼) ---------- */
function TimeField({ label, min, onChange }) {
  const set = (delta) => onChange(((min + delta) + 1440) % 1440);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ fontSize: 13, color: '#5b5470' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button className="step" onClick={() => set(-30)}>◀</button>
        <span style={{ fontFamily: "'Galmuri11',monospace", fontSize: 16, width: 56, textAlign: 'center',
          background: '#fff', border: '2px solid #3B3550', padding: '4px 0', color: '#3B3550' }}>{hhmm(min)}</span>
        <button className="step" onClick={() => set(30)}>▶</button>
      </div>
    </div>
  );
}

/* ---------- 설정 창 ---------- */
function SettingsModal({ open, onClose, schedule, setSchedule, charId, setCharId }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-titlebar">
          <span style={{ fontFamily: "'Galmuri11',monospace", fontSize: 16, whiteSpace: 'nowrap' }}>⚙ 퇴근요정 설정</span>
          <button className="x-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="sect-label">요정 선택</div>
          <div className="char-grid">
            {CHARACTERS.map((c) => (
              <button key={c.id} onClick={() => setCharId(c.id)}
                className={'char-card' + (c.id === charId ? ' sel' : '')}>
                <PixelCanvas scale={2.4} draw={(ctx) => drawFairy(ctx, { pose: 'idle', frame: 0, character: c })} />
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontFamily: "'Galmuri11',monospace", fontSize: 15, color: '#3B3550' }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: '#8a82a0', marginTop: 1 }}>{c.sub}</div>
                  <div style={{ fontSize: 11, color: '#a39bba', marginTop: 4, lineHeight: 1.35 }}>{c.blurb}</div>
                </div>
                {c.id === charId && <span className="sel-dot">●</span>}
              </button>
            ))}
          </div>

          <div className="sect-label" style={{ marginTop: 18 }}>근무 시간</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <TimeField label="출근 (응원)" min={schedule.arrive} onChange={(v) => setSchedule({ ...schedule, arrive: v })} />
            <TimeField label="점심 시작" min={schedule.lunchStart} onChange={(v) => setSchedule({ ...schedule, lunchStart: v })} />
            <TimeField label="점심 종료" min={schedule.lunchEnd} onChange={(v) => setSchedule({ ...schedule, lunchEnd: v })} />
            <TimeField label="퇴근 (칼퇴)" min={schedule.leave} onChange={(v) => setSchedule({ ...schedule, leave: v })} />
          </div>
          <div className="hint">퇴근 30분 전부터 전광판 카운트다운이 켜집니다.</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 데모 컨트롤 바 ---------- */
function ControlBar({ simSec, setSimSec, schedule, realtime, setRealtime, playing, setPlaying, speed, setSpeed, onOpenSettings }) {
  const phase = getPhase(simSec, schedule);
  const info = PHASE_INFO[phase];
  const minute = Math.floor(simSec / 60);
  const jumps = STATE_JUMPS(schedule);
  const activeJump = jumps.reduce((a, j) => (simSec >= j.sec ? j.key : a), 'off');

  return (
    <div className="ctrl-wrap">
      <div className="ctrl-card">
        {/* 상단: 현재 시각 + 국면 */}
        <div className="ctrl-top">
          <div className="clock">
            <span className="clock-num">{hhmm(minute)}</span>
            <span className="clock-sec">:{pad2(Math.floor(simSec) % 60)}</span>
          </div>
          <div className="phase-pill" style={{ background: 'color-mix(in srgb, var(--accent) 22%, white)' }}>
            <b>{info.label}</b><span>{info.tag}</span>
          </div>
          <div style={{ flex: 1 }} />
          <button className="gear" onClick={onOpenSettings} title="설정">⚙ 설정</button>
        </div>

        {/* 타임 스크러버 */}
        <div className="scrub-row">
          <span className="t-label">00:00</span>
          <input type="range" min={0} max={1439} value={minute}
            onChange={(e) => { setSimSec(+e.target.value * 60); setRealtime(false); setPlaying(false); }}
            className="scrubber" />
          <span className="t-label">24:00</span>
        </div>

        {/* 상태 점프 버튼 */}
        <div className="jump-row">
          {jumps.map((j) => (
            <button key={j.key}
              className={'jump-btn' + (activeJump === j.key ? ' on' : '')}
              onClick={() => { setSimSec(j.sec); setRealtime(false); setPlaying(false); }}>{j.label}</button>
          ))}
        </div>

        {/* 재생/속도/실시간 */}
        <div className="play-row">
          <button className={'play-btn' + (playing ? ' on' : '')}
            onClick={() => { setPlaying(p => !p); setRealtime(false); }}>
            {playing ? '❚❚ 일시정지' : '▶ 재생'}
          </button>
          <div className="speed-seg">
            {[1, 60, 300].map((sp) => (
              <button key={sp} className={'seg' + (speed === sp ? ' on' : '')}
                onClick={() => setSpeed(sp)}>{sp}×</button>
            ))}
          </div>
          <label className="rt-toggle">
            <input type="checkbox" checked={realtime}
              onChange={(e) => { setRealtime(e.target.checked); if (e.target.checked) setPlaying(false); }} />
            <span>실시간</span>
          </label>
        </div>
      </div>
      <div className="ctrl-foot">데모 컨트롤 · 실제 위젯은 시스템 시계를 따라 자동으로 움직입니다</div>
    </div>
  );
}

/* ============================================================
   App
   ============================================================ */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "houseShape": "mushroom",
  "bubbleStyle": "rounded",
  "accent": "purple"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // 영속 상태 로드
  const saved = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }, []);

  const [schedule, setSchedule] = React.useState(saved.schedule || DEFAULT_SCHEDULE);
  const [charId, setCharId] = React.useState(saved.charId || 'young_m');
  const [simSec, setSimSec] = React.useState(typeof saved.simSec === 'number' ? saved.simSec : DEFAULT_SCHEDULE.leave * 60 - 95);
  const [realtime, setRealtime] = React.useState(saved.realtime || false);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(60);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const character = CHARACTERS.find((c) => c.id === charId) || CHARACTERS[0];
  const accent = ACCENTS[t.accent] || ACCENTS.purple;

  // 시간 진행
  React.useEffect(() => {
    const id = setInterval(() => {
      if (realtime) {
        const d = new Date();
        setSimSec(d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds());
      } else if (playing) {
        setSimSec((s) => (s + speed) % 86400);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [realtime, playing, speed]);

  // 영속 저장
  React.useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify({ schedule, charId, simSec, realtime }));
  }, [schedule, charId, simSec, realtime]);

  return (
    <div className="app" style={{ '--accent': accent }}>
      <header className="masthead">
        <div className="logo-mark"><PixelCanvas scale={1.7} draw={(ctx) => drawHouse(ctx, { shape: t.houseShape, state: 'closed', accent })} /></div>
        <div>
          <h1>Grin-Fairy</h1>
          <p>데스크탑 한 켠에 사는, 매덩이 요정</p>
        </div>
      </header>

      <main className="stage">
        <Widget simSec={simSec} schedule={schedule} character={character}
          houseShape={t.houseShape} bubbleStyle={t.bubbleStyle} accent={accent} />
      </main>

      <ControlBar simSec={simSec} setSimSec={setSimSec} schedule={schedule}
        realtime={realtime} setRealtime={setRealtime}
        playing={playing} setPlaying={setPlaying} speed={speed} setSpeed={setSpeed}
        onOpenSettings={() => setSettingsOpen(true)} />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}
        schedule={schedule} setSchedule={setSchedule} charId={charId} setCharId={setCharId} />

      <TweaksPanel>
        <TweakSection label="위젯 스타일" />
        <TweakRadio label="집 모양" value={t.houseShape}
          options={['mushroom', 'cabin', 'tent']}
          onChange={(v) => setTweak('houseShape', v)} />
        <TweakRadio label="말풍선" value={t.bubbleStyle}
          options={['rounded', 'pixel', 'sticky']}
          onChange={(v) => setTweak('bubbleStyle', v)} />
        <TweakColor label="테마 색" value={accent}
          options={[ACCENTS.purple, ACCENTS.blue, ACCENTS.pink, ACCENTS.green]}
          onChange={(v) => {
            const key = Object.keys(ACCENTS).find((k) => ACCENTS[k] === v) || 'purple';
            setTweak('accent', key);
          }} />
      </TweaksPanel>
    </div>
  );
}

if (!window.__NO_AUTO_MOUNT) {
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
}
Object.assign(window, { App, SettingsModal, ControlBar, TimeField });
