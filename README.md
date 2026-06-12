# Grin-Fairy

Electron + TypeScript + React 데스크탑 위젯. 항상 화면 위에 떠있는 요정의 집.

## 실행

```bash
npm install
npm run dev        # 개발 모드 (HMR)
npm run build      # 패키징 → release/ 폴더
```

## 상태 머신

| Phase | 조건 | 집 | 요정 포즈 |
|---|---|---|---|
| off_pre | 출근 전 | 불 꺼짐 | 없음 |
| cheer | 출근 ±10분 | 문 열림 | cheer |
| work | 근무 중 | 문 닫힘 | 없음 (클릭 → annoyed) |
| lunch | 점심시간 | 문 열림 | eat 루프 |
| countdown | 퇴근 30분 전 | 문 열림 | countdown (LED 카운트) |
| leave | 퇴근 후 5분 | 문 열림 | leave (칼퇴) |
| off_post | 퇴근 후 | 불 꺼짐 | 없음 |

## 구조

```
src/
  main/
    index.ts       # BrowserWindow, Tray, IPC, PNG 아이콘 생성
    store.ts       # electron-store (설정 + 위치 영속화)
  preload/
    index.ts       # contextBridge IPC 노출
  renderer/
    types.ts       # 공유 타입
    sprites.tsx    # 절차적 픽셀 드로잉 엔진 (집 + 요정 4종)
    widget.tsx     # 상태머신 + 말풍선 + Widget 컴포넌트
    settings.tsx   # 설정 모달 (요정 선택 + 시간 피커)
    App.tsx        # 루트 (실시간 시계, click-through, drag)
    main.tsx       # React 마운트
    index.html
    app.css
prototype/         # 브라우저에서 바로 열 수 있는 HTML 프로토타입
```

## 윈도우

- `280×340`, frameless + transparent + alwaysOnTop + skipTaskbar
- 드래그: `mousemove` IPC → `win.setPosition()`
- 투명 영역 클릭 통과: `setIgnoreMouseEvents(true, { forward: true })` + mousemove 판별
- 마지막 위치 `electron-store`에 저장, 재실행 시 복원
- 트레이 메뉴: 설정 열기 / 종료

## 스택

- Electron 32 + electron-vite + electron-builder
- React 18 + TypeScript 5
- electron-store v8
