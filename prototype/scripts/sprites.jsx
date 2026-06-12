/* ============================================================
   sprites.jsx — 절차적 픽셀 드로잉 엔진 + 퇴근요정 스프라이트
   작은 캔버스(GRID×GRID 논리 픽셀)에 정수 좌표 사각형을 찍어
   '의도적으로 투박한' 픽셀 요정/집/소품을 그린다.
   ============================================================ */

const GRID = 36; // 논리 픽셀 캔버스 크기

/* ---------- 캐릭터 팔레트 (라벤더 파스텔 기조) ---------- */
const THEME = {
  purple: '#C3B1E1',
  blue: '#A0C4E8',
  pink: '#F2A9C4',
  cream: '#F3F0F8',
  ink: '#4A4458',
};

function pal(o) {
  // outline/white/black/sparkle 공통값 채워 반환
  return Object.assign({
    out: '#3B3550',      // 외곽선
    white: '#FFFFFF',
    black: '#2B2738',
    blush: '#F4A6B8',    // 볼터치
    spark: '#FFE08A',    // 반짝이
    led: '#FF5D5D',      // 전광판 빨강
    ledOff: '#5A1F1F',
    leddark: '#2A0B0B',
  }, o);
}

const CHARACTERS = [
  {
    id: 'young_m',
    name: '청년요정',
    sub: '남 · 후드티 & 에어팟',
    blurb: '아침엔 에어팟 끼고 출근, 6시 땡 치면 누구보다 빠르게 사라짐.',
    feat: { hair: 'short', glasses: false, earbud: true, accessory: 'none' },
    pal: pal({ skin: '#F2C7A6', skinSh: '#E0AC85', hair: '#7A4B2B', hairSh: '#5E3820',
      cloth: '#A0C4E8', clothSh: '#7FA6D2', cloth2: '#C9DCF2', wing: '#DCE9FA' }),
  },
  {
    id: 'young_f',
    name: '청년요정',
    sub: '여 · 카디건 & 텀블러',
    blurb: '손에서 텀블러를 놓지 않는다. 카페인은 요정의 마나.',
    feat: { hair: 'bob', glasses: false, earbud: false, accessory: 'tumbler' },
    pal: pal({ skin: '#F6CDB2', skinSh: '#E8B292', hair: '#4E3326', hairSh: '#382418',
      cloth: '#F2A9C4', clothSh: '#D984A6', cloth2: '#FBD2E2', wing: '#FBDDE9' }),
  },
  {
    id: 'mid_m',
    name: '중년요정',
    sub: '남 · 셔츠 & 조끼 & 돋보기',
    blurb: '"라떼는" 을 시전하려다 퇴근시간이라 참는다. 워라밸은 안다.',
    feat: { hair: 'bald', glasses: true, earbud: false, accessory: 'none' },
    pal: pal({ skin: '#E9BD9A', skinSh: '#D4A481', hair: '#B9BDC4', hairSh: '#969BA4',
      cloth: '#9AA7B5', clothSh: '#73808F', cloth2: '#6E7A8A', wing: '#DDE3EA' }),
  },
  {
    id: 'mid_f',
    name: '중년요정',
    sub: '여 · 블라우스 & 보온병',
    blurb: '보온병에 든 건 결코 식지 않는다. 정시 퇴근도 결코 식지 않는다.',
    feat: { hair: 'perm', glasses: false, earbud: false, accessory: 'thermos' },
    pal: pal({ skin: '#F0C5A6', skinSh: '#DDAC8A', hair: '#8C7A6A', hairSh: '#6E5E50',
      cloth: '#C3B1E1', clothSh: '#9E89C4', cloth2: '#E0D6F0', wing: '#E7DEF4' }),
  },
];

/* ============================================================
   드로잉 유틸
   ============================================================ */
function makePx(ctx) {
  return (x, y, w, h, c) => {
    if (!c) return;
    ctx.fillStyle = c;
    ctx.fillRect(x | 0, y | 0, (w || 1) | 0, (h || 1) | 0);
  };
}

/* ---------- 날개 (몸통 뒤) ---------- */
function drawWings(P, p, frame) {
  const f = frame ? 1 : 0; // 살짝 파닥
  // 왼쪽
  P(6, 13 - f, 5, 9, p.wing);
  P(5, 15 - f, 2, 5, p.wing);
  P(6, 13 - f, 5, 1, p.out);
  P(5, 15 - f, 1, 5, p.out);
  // 오른쪽
  P(25, 13 - f, 5, 9, p.wing);
  P(29, 15 - f, 2, 5, p.wing);
  P(25, 13 - f, 5, 1, p.out);
  P(30, 15 - f, 1, 5, p.out);
}

/* ---------- 머리 + 얼굴 ---------- */
function drawHead(P, p, feat, expr, blink) {
  // 두상 (투박한 사각 블롭)
  P(13, 8, 10, 9, p.skin);
  P(12, 9, 1, 7, p.skin);
  P(23, 9, 1, 7, p.skin);
  // 외곽선
  P(13, 7, 10, 1, p.out);
  P(12, 8, 1, 9, p.out);
  P(23, 8, 1, 9, p.out);
  P(13, 17, 10, 1, p.out);
  // 볼터치
  P(13, 14, 2, 1, p.blush);
  P(21, 14, 2, 1, p.blush);

  // 머리카락 스타일
  if (feat.hair === 'short') {
    P(12, 6, 12, 3, p.hair);
    P(12, 6, 12, 1, p.hairSh);
    P(12, 9, 1, 2, p.hair);
    P(23, 9, 1, 2, p.hair);
  } else if (feat.hair === 'bob') {
    P(11, 6, 14, 3, p.hair);
    P(11, 9, 2, 6, p.hair); // 옆머리 길게
    P(23, 9, 2, 6, p.hair);
    P(11, 6, 14, 1, p.hairSh);
    P(14, 8, 8, 1, p.skin); // 앞머리 사이 살짝
  } else if (feat.hair === 'bald') {
    // 정수리 휑 + 옆머리만
    P(12, 9, 1, 4, p.hair);
    P(23, 9, 1, 4, p.hair);
    P(13, 8, 2, 1, p.hair);
    P(21, 8, 2, 1, p.hair);
    P(17, 7, 2, 1, p.skinSh); // 반짝이는 정수리
  } else if (feat.hair === 'perm') {
    // 뽀글 파마
    P(11, 5, 14, 4, p.hair);
    P(10, 7, 2, 5, p.hair);
    P(24, 7, 2, 5, p.hair);
    P(12, 5, 1, 1, p.hairSh); P(15, 4, 1, 1, p.hair);
    P(18, 4, 1, 1, p.hair); P(21, 4, 1, 1, p.hair); P(23, 5, 1, 1, p.hairSh);
  }

  // 눈 (표정별)
  const eyeY = 12;
  if (expr === 'annoyed') {
    P(14, eyeY, 3, 1, p.black); // -_-
    P(19, eyeY, 3, 1, p.black);
  } else if (expr === 'happy' || expr === 'cheer') {
    // ^ ^ 웃는 눈
    P(15, eyeY, 1, 1, p.black); P(14, eyeY + 1, 1, 1, p.black); P(16, eyeY + 1, 1, 1, p.black);
    P(20, eyeY, 1, 1, p.black); P(19, eyeY + 1, 1, 1, p.black); P(21, eyeY + 1, 1, 1, p.black);
  } else if (blink) {
    P(14, eyeY + 1, 2, 1, p.black);
    P(20, eyeY + 1, 2, 1, p.black);
  } else {
    P(14, eyeY, 2, 2, p.black);
    P(20, eyeY, 2, 2, p.black);
    P(15, eyeY, 1, 1, p.white); // 하이라이트
    P(21, eyeY, 1, 1, p.white);
  }

  // 안경
  if (feat.glasses) {
    P(13, 11, 4, 4, p.out); P(14, 12, 2, 2, p.cloth2 || '#fff');
    P(19, 11, 4, 4, p.out); P(20, 12, 2, 2, p.cloth2 || '#fff');
    P(17, 12, 2, 1, p.out);
    // 안쪽 비우기(렌즈 느낌)
    P(14, 12, 2, 2, '#ffffff'); P(20, 12, 2, 2, '#ffffff');
    P(15, 13, 1, 1, p.black); P(21, 13, 1, 1, p.black); // 눈동자
  }

  // 입
  if (expr === 'cheer' || expr === 'happy') {
    P(16, 15, 4, 1, p.out); P(17, 16, 2, 1, p.out); // 활짝
  } else if (expr === 'annoyed') {
    P(16, 15, 4, 1, p.out); // 일자
  } else {
    P(17, 15, 2, 1, p.out); // 점입
  }

  // 에어팟
  if (feat.earbud) {
    P(11, 12, 1, 2, p.white);
    P(11, 14, 1, 2, p.white);
    P(24, 12, 1, 2, p.white);
  }
}

/* ---------- 사원증 목걸이 ---------- */
function drawLanyard(P, p) {
  P(16, 17, 1, 3, p.cloth2); // 끈
  P(19, 17, 1, 3, p.cloth2);
  P(15, 20, 6, 4, p.white);  // 카드
  P(15, 20, 6, 1, p.out);
  P(15, 23, 6, 1, p.out);
  P(15, 20, 1, 4, p.out);
  P(20, 20, 1, 4, p.out);
  P(16, 21, 2, 2, p.skinSh); // 증명사진
  P(18, 21, 2, 1, p.cloth);
}

/* ---------- 몸통 ---------- */
function drawBody(P, p) {
  P(13, 17, 10, 10, p.cloth);
  P(13, 17, 10, 1, p.cloth2);
  P(12, 18, 1, 8, p.cloth);
  P(23, 18, 1, 8, p.cloth);
  // 외곽
  P(12, 18, 1, 9, p.out);
  P(23, 18, 1, 9, p.out);
  P(13, 27, 10, 1, p.out);
  P(13, 24, 10, 2, p.clothSh); // 옷 그림자
  // 다리
  P(15, 27, 2, 3, p.skinSh);
  P(19, 27, 2, 3, p.skinSh);
  P(15, 30, 3, 1, p.out);
  P(19, 30, 3, 1, p.out);
}

/* ============================================================
   포즈별 메인: drawFairy
   pose: idle | talk | annoyed | cheer | eat | countdown | leave
   ============================================================ */
function drawFairy(ctx, { pose = 'idle', frame = 0, blink = false, character, remain = '00:00' }) {
  const P = makePx(ctx);
  const p = character.pal;
  const feat = character.feat;
  ctx.clearRect(0, 0, GRID, GRID);

  if (pose === 'leave') return drawLeave(P, p, feat, frame, remain);

  drawWings(P, p, frame);

  // 표정 매핑
  let expr = 'normal';
  if (pose === 'cheer') expr = 'cheer';
  else if (pose === 'annoyed') expr = 'annoyed';
  else if (pose === 'eat' || pose === 'talk') expr = 'happy';

  drawBody(P, p);
  drawLanyard(P, p);
  drawHead(P, p, feat, expr, blink && pose === 'idle');

  /* --- 팔/소품 포즈별 --- */
  if (pose === 'idle') {
    P(11, 19, 2, 5, p.cloth); P(11, 23, 2, 1, p.skin); // 팔 옆
    P(23, 19, 2, 5, p.cloth); P(23, 23, 2, 1, p.skin);
  }

  if (pose === 'talk') {
    // 한 팔 들어 가리킴
    P(24, 14, 2, 5, p.cloth);
    P(25, 12, 2, 3, p.skin);
    P(27, 12, 1, 1, p.skin); // 손가락
    P(11, 20, 2, 4, p.cloth);
  }

  if (pose === 'annoyed') {
    // 손사래 + 땀
    P(24, 13, 2, 4, p.cloth);
    P(25, 11, 2, 2, p.skin);
    P(24, 10, 1, 1, p.skin);
    P(28, 11, 1, 1, p.blue); // 땀방울
    P(28, 12, 2, 1, p.blue);
    P(28, 13, 1, 1, p.blue);
    P(11, 20, 2, 4, p.cloth);
  }

  if (pose === 'cheer') {
    // 두 팔 번쩍
    P(11, 12, 2, 6, p.cloth); P(11, 10, 2, 2, p.skin);
    P(23, 12, 2, 6, p.cloth); P(23, 10, 2, 2, p.skin);
    // 반짝이
    const tw = frame ? 1 : 0;
    P(8 + tw, 9, 1, 1, p.spark); P(7 + tw, 8, 1, 1, p.spark); P(9 + tw, 8, 1, 1, p.spark); P(8 + tw, 7, 1, 1, p.spark);
    P(27 - tw, 7, 1, 1, p.spark); P(26 - tw, 6, 1, 1, p.spark); P(28 - tw, 6, 1, 1, p.spark); P(27 - tw, 5, 1, 1, p.spark);
    P(17, 4 + tw, 1, 1, p.spark); P(16, 5 + tw, 1, 1, p.spark); P(18, 5 + tw, 1, 1, p.spark);
  }

  if (pose === 'eat') {
    // 앉은 자세 살짝 + 도시락 or 차 (frame 토글)
    P(11, 20, 2, 3, p.cloth);
    P(23, 20, 2, 3, p.cloth);
    if (!frame) {
      // 도시락 그릇
      P(14, 24, 8, 3, '#E8DCC0'); P(14, 24, 8, 1, '#CFC0A0');
      P(15, 22, 1, 2, p.skin); // 젓가락 잡은 손
      P(16, 20, 1, 4, '#9A6B3F'); P(17, 20, 1, 4, '#9A6B3F'); // 젓가락
      P(18, 25, 1, 1, '#E5765B'); P(20, 25, 1, 1, '#7FB069'); // 반찬
    } else {
      // 차 마시며 쉼
      P(20, 22, 4, 4, p.cloth2); P(20, 22, 4, 1, p.white);
      P(24, 23, 1, 2, p.cloth2); // 손잡이
      P(21, 19, 1, 2, '#D8D0E8'); P(22, 18, 1, 2, '#D8D0E8'); // 김
    }
  }

  if (pose === 'countdown') {
    // 두 손으로 LED 보드 받쳐 듦
    P(11, 21, 2, 4, p.cloth); P(11, 24, 2, 1, p.skin);
    P(23, 21, 2, 4, p.cloth); P(23, 24, 2, 1, p.skin);
    drawLEDBoard(P, p, 8, 20, remain);
  }
}

/* ---------- 퇴장(칼퇴) 전용 ---------- */
function drawLeave(P, p, feat, frame, remain) {
  drawWings(P, p, frame);
  // 약간 옆으로 향한 몸
  P(13, 17, 9, 10, p.cloth);
  P(12, 18, 1, 9, p.out);
  P(22, 18, 1, 9, p.out);
  P(13, 24, 9, 2, p.clothSh);
  // 걷는 다리 (frame 토글)
  if (!frame) { P(14, 27, 2, 3, p.skinSh); P(19, 27, 2, 4, p.skinSh); }
  else { P(15, 27, 2, 4, p.skinSh); P(18, 27, 2, 3, p.skinSh); }
  P(14, 30, 8, 1, p.out);
  // 가방 (어깨에 멘)
  P(21, 20, 4, 5, '#9A6B3F'); P(21, 20, 4, 1, '#7A5230');
  P(15, 18, 8, 1, '#7A5230'); // 가방끈
  drawHead(P, p, feat, 'happy', false);
  // 흔드는 손
  if (!frame) { P(24, 11, 2, 5, p.cloth); P(25, 9, 2, 2, p.skin); }
  else { P(25, 12, 2, 5, p.cloth); P(26, 10, 2, 2, p.skin); }
  // 작은 손인사 효과
  P(28, 8, 1, 1, p.spark); P(29, 9, 1, 1, p.spark);
}

/* ============================================================
   전광판 (LED 보드) — 요정이 든 작은 디지털 카운트다운
   remain: "MM:SS"
   ============================================================ */
const LED_FONT = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  ':': ['0', '1', '0', '1', '0'],
};
function drawLEDBoard(P, p, x, y, remain) {
  // 보드 틀
  const w = 20, h = 9;
  P(x - 1, y - 1, w + 2, h + 2, p.out);
  P(x, y, w, h, p.leddark);
  P(x, y, w, 1, '#444'); // 위 하이라이트
  // 숫자 렌더 (작게)
  let cx = x + 1;
  const str = (remain || '00:00').slice(0, 5);
  for (const ch of str) {
    const glyph = LED_FONT[ch];
    if (!glyph) { cx += 2; continue; }
    const gw = glyph[0].length;
    for (let ry = 0; ry < 5; ry++) {
      for (let rx = 0; rx < gw; rx++) {
        if (glyph[ry][rx] === '1') P(cx + rx, y + 2 + ry, 1, 1, p.led);
      }
    }
    cx += gw + 1;
  }
}

/* ============================================================
   집 — 모양 3종(mushroom/cabin/tent) × 상태 3종(closed/open/off)
   ============================================================ */
function drawHouse(ctx, { shape = 'mushroom', state = 'closed', frame = 0, accent = THEME.purple }) {
  const P = makePx(ctx);
  ctx.clearRect(0, 0, GRID, GRID);
  const O = '#3B3550';
  const door = (open) => {
    if (state === 'off') {
      // 불 꺼짐 + CLOSED 팻말
      P(15, 24, 6, 8, '#2A2535');
      P(15, 24, 6, 1, O); P(15, 31, 6, 1, O);
      P(15, 24, 1, 8, O); P(20, 24, 1, 8, O);
      // CLOSED 팻말
      P(13, 20, 10, 4, '#E8DCC0'); P(13, 20, 10, 1, '#CFC0A0');
      P(14, 22, 1, 1, O); P(16, 22, 1, 1, O); P(18, 22, 1, 1, O); P(20, 22, 1, 1, O);
      P(17, 18, 1, 2, O); // 못
      return;
    }
    if (open) {
      P(14, 22, 8, 10, '#241F30'); // 열린 어두운 입구
      P(14, 22, 8, 1, O);
      P(14, 22, 1, 10, O); P(21, 22, 1, 10, O);
      // 문짝 옆으로 열림
      P(22, 22, 2, 9, '#7A5230'); P(22, 22, 1, 9, O);
      // 따뜻한 불빛 새어나옴
      P(16, 28, 4, 4, 'rgba(255,224,138,0.5)');
    } else {
      // 닫힌 문
      P(15, 23, 6, 9, '#8A5A34');
      P(15, 23, 6, 1, '#A06B3F');
      P(15, 23, 1, 9, O); P(20, 23, 1, 9, O); P(15, 23, 6, 1, O); P(15, 31, 6, 1, O);
      P(19, 27, 1, 1, '#FFE08A'); // 문고리
      // 작은 창 + 불빛
      P(16, 24, 4, 2, '#FFE08A'); P(16, 24, 4, 1, O); P(18, 24, 1, 2, O);
    }
  };

  if (shape === 'mushroom') {
    // 기둥(몸체)
    P(11, 18, 14, 14, '#F0E4D0');
    P(11, 18, 14, 1, '#FFF7EA');
    P(11, 18, 1, 14, O); P(24, 18, 1, 14, O); P(11, 32, 14, 1, O);
    // 버섯 갓
    P(8, 12, 20, 7, accent);
    P(6, 14, 24, 4, accent);
    P(6, 14, 24, 1, shade(accent, 1.12));
    P(8, 12, 20, 1, shade(accent, 1.12));
    P(6, 18, 24, 1, O); P(6, 14, 1, 4, O); P(29, 14, 1, 4, O); P(8, 12, 20, 1, O);
    // 갓 물방울 무늬
    P(11, 15, 2, 2, '#FFF7EA'); P(17, 14, 2, 2, '#FFF7EA'); P(23, 16, 2, 2, '#FFF7EA');
    // 작은 창문(불빛)
    if (state !== 'off') { P(12, 21, 3, 3, '#FFE08A'); P(12, 21, 3, 1, O); P(13, 21, 1, 3, O); }
    else { P(12, 21, 3, 3, '#3A3346'); P(12, 21, 3, 1, O); }
    door(state === 'open');
  } else if (shape === 'cabin') {
    // 통나무 오두막
    P(9, 19, 18, 13, '#C99B6E');
    for (let i = 0; i < 6; i++) P(9, 19 + i * 2, 18, 1, '#A87C50'); // 통나무 결
    P(9, 19, 1, 13, O); P(26, 19, 1, 13, O); P(9, 32, 18, 1, O);
    // 박공 지붕
    for (let i = 0; i < 8; i++) P(17 - i, 11 + i, 2 + i * 2, 1, i === 0 ? accent : (i % 2 ? accent : shade(accent, 0.92)));
    P(7, 19, 22, 1, shade(accent, 0.85)); // 처마
    P(7, 19, 22, 1, O);
    // 윤곽 지붕선
    for (let i = 0; i < 8; i++) { P(17 - i - 1, 11 + i, 1, 1, O); P(18 + i, 11 + i, 1, 1, O); }
    P(16, 10, 4, 1, O);
    if (state !== 'off') { P(11, 22, 3, 3, '#FFE08A'); P(11, 22, 3, 1, O); P(12, 22, 1, 3, O); }
    else { P(11, 22, 3, 3, '#3A3346'); P(11, 22, 3, 1, O); }
    door(state === 'open');
  } else { // tent
    P(17, 9, 2, 2, O); // 깃대 꼭대기
    P(17, 7, 1, 4, '#9A6B3F');
    P(18, 7, 2, 1, accent); P(18, 8, 3, 1, accent); // 깃발
    // 삼각 텐트
    for (let i = 0; i < 18; i++) {
      const half = i + 1;
      const xL = 18 - half, xR = 18 + half;
      const col = (Math.floor(i / 2) % 2 === 0) ? accent : shade(accent, 1.1);
      P(xL, 13 + i, (xR - xL), 1, col);
      P(xL, 13 + i, 1, 1, O); P(xR - 1, 13 + i, 1, 1, O);
    }
    P(0, 31, 36, 1, O);
    door(state === 'open');
    // 텐트 줄
    P(2, 28, 4, 1, '#A87C50'); P(30, 28, 4, 1, '#A87C50');
  }
}

/* 색 밝기 조절 (간이) */
function shade(hex, k) {
  const c = hex.replace('#', '');
  let r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  r = Math.max(0, Math.min(255, Math.round(r * k)));
  g = Math.max(0, Math.min(255, Math.round(g * k)));
  b = Math.max(0, Math.min(255, Math.round(b * k)));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ============================================================
   PixelCanvas — draw(ctx) 콜백을 픽셀화 캔버스로 렌더
   ============================================================ */
function PixelCanvas({ draw, scale = 6, size = GRID, style, className }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    draw(ctx);
  });
  return (
    <canvas ref={ref} width={size} height={size} className={className}
      style={{ width: size * scale, height: size * scale, imageRendering: 'pixelated', display: 'block', ...style }} />
  );
}

Object.assign(window, {
  GRID, THEME, CHARACTERS, drawFairy, drawHouse, drawLEDBoard, PixelCanvas, shadeHex: shade,
});
