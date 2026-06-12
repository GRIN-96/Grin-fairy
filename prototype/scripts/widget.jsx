/* ============================================================
   widget.jsx — 퇴근요정 위젯 본체
   하루 스케줄 상태머신 + 말풍선(시크 드립) + 위젯 조립
   ============================================================ */

/* ---------- 시간 유틸 ---------- */
const pad2 = (n) => String(n).padStart(2, '0');
function hhmm(min) { return `${pad2(Math.floor(min / 60) % 24)}:${pad2(Math.floor(min) % 60)}`; }
function mmss(sec) {
  sec = Math.max(0, Math.floor(sec));
  return `${pad2(Math.floor(sec / 60))}:${pad2(sec % 60)}`;
}

/* ---------- 스케줄 → 현재 국면(phase) ---------- */
function getPhase(simSec, s) {
  const m = simSec / 60;
  const cheerStart = s.arrive - 10, cheerEnd = s.arrive + 12;
  const cdStart = s.leave - 30, leaveEnd = s.leave + 5;
  if (m < cheerStart) return 'off_pre';
  if (m < cheerEnd) return 'cheer';
  if (m < s.lunchStart) return 'work';
  if (m < s.lunchEnd) return 'lunch';
  if (m < cdStart) return 'work';
  if (m < s.leave) return 'countdown';
  if (m < leaveEnd) return 'leave';
  return 'off_post';
}

const PHASE_INFO = {
  off_pre: { pose: null, house: 'off', label: '출근 전', tag: '불 꺼짐' },
  cheer: { pose: 'cheer', house: 'open', label: '출근 응원', tag: '문 열림' },
  work: { pose: null, house: 'closed', label: '근무 중', tag: '문 닫힘' },
  lunch: { pose: 'eat', house: 'open', label: '점심시간', tag: '문 열림' },
  countdown: { pose: 'countdown', house: 'open', label: '퇴근 카운트다운', tag: '전광판 ON' },
  leave: { pose: 'leave', house: 'open', label: '칼퇴 중', tag: '먼저 갑니다' },
  off_post: { pose: null, house: 'off', label: '퇴근 후', tag: 'CLOSED' },
};

/* ---------- 말풍선 카피 (직장인 공감 / 약간 시크) ---------- */
const MESSAGES = {
  cheer: [
    '출근... 인정합니다. 오늘도 살아남아요.',
    '눈 떴으면 절반은 성공이에요. 가시죠.',
    '월급이 저 안에서 기다려요.',
    '커피 한 잔의 힘을 믿어봅시다.',
  ],
  work: [ // poke 시 (annoyed)
    '지금 바빠요. 용건은 6시 이후에.',
    '부르지 마세요. 일하는 척 중입니다.',
    '문 닫혀 있으면 그런 줄 아세요.',
    '회의 또 잡혔어요? 모르는 척합시다.',
  ],
  lunch: [
    '밥이 일보다 중요합니다. 천천히요.',
    '점심시간에 회의 잡는 거 아닙니다.',
    '후식까지가 점심이에요.',
    '오후는 밥심으로 버티는 겁니다.',
  ],
  countdown: [
    '{t} 뒤 칼퇴. 가방 미리 챙기세요.',
    '마우스 흔들 시간에 짐 싸요. {t} 남음.',
    '거의 다 왔어요. {t} 만 버텨요.',
    '엘리베이터 동선 점검할 시간, {t}.',
  ],
  leave: [
    '칼퇴는 권리입니다. 먼저 갈게요.',
    '정시 퇴근. 이게 맞습니다.',
    '내일 봐요. 야근은 모르는 일이에요.',
    '저는 갑니다. 불은 마지막에 끄세요.',
  ],
  off_pre: [
    '아직 출근 전이에요. 더 자도 됩니다.',
    '요정도 준비 중. 곧 문 열어요.',
  ],
  off_post: [
    '요정도 퇴근했습니다. 내일 9시에 봐요.',
    '불 꺼졌으면 칼퇴 신호입니다.',
    '연락은 근무시간에 부탁드려요.',
  ],
};

function pickMessage(phase, idx, remainSec) {
  const arr = MESSAGES[phase] || [''];
  let msg = arr[idx % arr.length];
  return msg.replace('{t}', mmss(remainSec));
}

/* ============================================================
   말풍선 — 스타일 3종 (rounded / pixel / sticky)
   ============================================================ */
function Bubble({ text, style, accent, visible }) {
  const base = {
    position: 'absolute', left: '50%', top: 6, transform: 'translateX(-50%)',
    maxWidth: 232, minWidth: 150, textAlign: 'center', padding: '12px 16px',
    fontSize: 15, lineHeight: 1.5, color: '#3B3550', zIndex: 30,
    opacity: visible ? 1 : 0, transition: 'opacity .25s, transform .25s',
    pointerEvents: 'none', textWrap: 'pretty',
  };
  const tint = `color-mix(in srgb, ${accent} 28%, white)`;
  if (style === 'pixel') {
    return (
      <div style={{ ...base, fontFamily: "'Galmuri11', monospace", background: tint,
        border: '3px solid #3B3550', borderRadius: 0, boxShadow: '5px 5px 0 rgba(59,53,80,.25)',
        transform: `translateX(-50%) translateY(${visible ? 0 : -4}px)` }}>
        {text}
        <span style={{ position: 'absolute', left: '50%', bottom: -11, transform: 'translateX(-50%)',
          width: 14, height: 8, background: tint, borderLeft: '3px solid #3B3550',
          borderRight: '3px solid #3B3550', clipPath: 'polygon(0 0,100% 0,50% 100%)' }} />
      </div>
    );
  }
  if (style === 'sticky') {
    return (
      <div style={{ ...base, background: '#FFF1A8', border: 'none', borderRadius: 3,
        fontFamily: "'Galmuri11', monospace", color: '#5b5326',
        boxShadow: '0 6px 14px rgba(0,0,0,.18)',
        transform: `translateX(-50%) rotate(-2.5deg) translateY(${visible ? 0 : -4}px)` }}>
        <span style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)',
          width: 46, height: 16, background: 'rgba(255,255,255,.55)', borderRadius: 2,
          boxShadow: '0 1px 2px rgba(0,0,0,.1)' }} />
        {text}
      </div>
    );
  }
  // rounded (기본)
  return (
    <div style={{ ...base, background: tint, borderRadius: 16,
      boxShadow: '0 8px 20px rgba(80,64,120,.18)',
      transform: `translateX(-50%) translateY(${visible ? 0 : -4}px)` }}>
      {text}
      <span style={{ position: 'absolute', left: '50%', bottom: -8, transform: 'translateX(-50%)',
        width: 18, height: 12, background: tint, clipPath: 'polygon(50% 100%,0 0,100% 0)' }} />
    </div>
  );
}

/* ============================================================
   Widget — 집 + 요정 + 말풍선 합성 + poke 상호작용
   ============================================================ */
function Widget({ simSec, schedule, character, houseShape, bubbleStyle, accent, scale = 1 }) {
  const phase = getPhase(simSec, schedule);
  const info = PHASE_INFO[phase];
  const remainSec = Math.max(0, schedule.leave * 60 - simSec);

  const [frame, setFrame] = React.useState(0);
  const [blink, setBlink] = React.useState(false);
  const [msgIdx, setMsgIdx] = React.useState(0);
  const [poke, setPoke] = React.useState(null); // {pose, house, phase, until}

  // 스프라이트 애니메이션 프레임 (날개짓/반짝이/걷기)
  React.useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 2), 430);
    return () => clearInterval(id);
  }, []);
  // 눈 깜빡임
  React.useEffect(() => {
    let t;
    const loop = () => {
      setBlink(true); setTimeout(() => setBlink(false), 140);
      t = setTimeout(loop, 2600 + Math.random() * 2200);
    };
    t = setTimeout(loop, 1800);
    return () => clearTimeout(t);
  }, []);
  // 메시지 자동 로테이션 + phase 변경 시 리셋
  React.useEffect(() => { setMsgIdx(0); }, [phase, character.id]);
  React.useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => i + 1), 6500);
    return () => clearInterval(id);
  }, []);
  // poke 만료
  React.useEffect(() => {
    if (!poke) return;
    const id = setTimeout(() => setPoke(null), 4200);
    return () => clearTimeout(id);
  }, [poke]);

  function handlePoke() {
    if (phase === 'work') {
      setPoke({ pose: 'annoyed', house: 'open', phase: 'work', msg: pickMessage('work', Math.floor(Math.random() * 4), 0) });
    } else if (phase === 'off_pre' || phase === 'off_post') {
      setPoke({ pose: null, house: 'off', phase, msg: pickMessage(phase, Math.floor(Math.random() * MESSAGES[phase].length), 0) });
    } else {
      // 이미 나와있으면 talk 리액션
      setPoke({ pose: 'talk', house: 'open', phase, msg: '네? 부르셨어요?' });
    }
  }

  // 현재 표시 상태(poke 우선)
  const showPose = poke ? poke.pose : info.pose;
  const houseState = poke ? poke.house : info.house;
  const fairyVisible = !!showPose;

  // 말풍선 텍스트: poke 우선, 아니면 phase 메시지(나와있을 때만 상시, 닫힘이면 숨김)
  let bubbleText = '', bubbleVisible = false;
  if (poke) { bubbleText = poke.msg; bubbleVisible = true; }
  else if (info.pose) { bubbleText = pickMessage(phase, msgIdx, remainSec); bubbleVisible = true; }

  const HOUSE_SCALE = 5.6, FAIRY_SCALE = 3.6;
  return (
    <div style={{ position: 'relative', width: 300 * scale, height: 340 * scale,
      transform: `scale(${scale})`, transformOrigin: 'top center' }}>
      <div style={{ position: 'relative', width: 300, height: 340 }}>
        <Bubble text={bubbleText} style={bubbleStyle} accent={accent} visible={bubbleVisible} />

        {/* 바닥 그림자 */}
        <div style={{ position: 'absolute', left: '50%', bottom: 26, transform: 'translateX(-50%)',
          width: 188, height: 26, background: 'radial-gradient(ellipse at center, rgba(80,64,120,.22), transparent 70%)' }} />

        {/* 집 */}
        <div style={{ position: 'absolute', left: '50%', bottom: 36, transform: 'translateX(-50%)', zIndex: 10 }}>
          <PixelCanvas scale={HOUSE_SCALE}
            draw={(ctx) => drawHouse(ctx, { shape: houseShape, state: houseState, frame, accent })} />
        </div>

        {/* 요정 (문 앞에 서있음) */}
        <div style={{ position: 'absolute', left: '50%', bottom: 30,
          transform: 'translateX(-50%)', zIndex: 20,
          opacity: fairyVisible ? 1 : 0,
          transition: 'opacity .3s ease',
          filter: 'drop-shadow(2px 3px 2px rgba(40,30,60,.25))' }}>
          <PixelCanvas scale={FAIRY_SCALE}
            draw={(ctx) => drawFairy(ctx, { pose: showPose || 'idle', frame, blink, character, remain: mmss(remainSec) })} />
        </div>

        {/* 클릭 영역 (요정 부르기) */}
        <button onClick={handlePoke} aria-label="요정 부르기"
          style={{ position: 'absolute', inset: 0, top: 70, background: 'transparent',
            border: 'none', cursor: 'pointer', zIndex: 25 }} />
      </div>
    </div>
  );
}

Object.assign(window, {
  getPhase, PHASE_INFO, MESSAGES, pickMessage, hhmm, mmss, pad2, Bubble, Widget,
});
