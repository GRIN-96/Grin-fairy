# 퇴근요정 (Grin Fairy)

Tauri 2 + TypeScript + React 데스크탑 위젯. 항상 화면 위에 떠있는 요정의 집.

> Electron 버전은 `electron-legacy` 브랜치에 보존되어 있습니다.

## 실행

요구 사항: Node.js, Rust 툴체인(cargo), Windows의 경우 WebView2(Win11 기본 내장)

```bash
npm install
npm run dev        # 개발 모드 (vite HMR + tauri dev)
npm run build      # 패키징 → src-tauri/target/release/bundle/
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
src-tauri/
  src/lib.rs       # 트레이, 위치 복원, 플러그인 등록 (store/process)
  tauri.conf.json  # 창 설정 (transparent/alwaysOnTop/skipTaskbar 등)
  capabilities/    # 렌더러 권한 (드래그, 메뉴, 창 생성, store)
src/renderer/      # 프론트엔드 (vite root)
  api.ts           # Tauri 연동 레이어 (구 electronAPI 대체)
  types.ts         # 공유 타입
  sprites.tsx      # 절차적 픽셀 드로잉 엔진 (집 + 요정 4종)
  widget.tsx       # 상태머신 + 말풍선 + Widget 컴포넌트
  settings.tsx     # 시간 설정 페이지
  App.tsx          # 루트 (실시간 시계, drag, 컨텍스트 메뉴)
  main.tsx         # React 마운트
scripts/
  gen-icon.mjs     # 버섯집 아이콘 PNG 생성 → npx tauri icon
prototype/         # 브라우저에서 바로 열 수 있는 HTML 프로토타입
```

## 윈도우

- `190×225`, frameless + transparent + alwaysOnTop + skipTaskbar
- 드래그: mousedown 후 3px 이동 시 `startDragging()` (OS 네이티브 드래그)
- 우클릭: 네이티브 컨텍스트 메뉴 (`@tauri-apps/api/menu`) — 요정/시간/집/말풍선/색상/종료
- 마지막 위치 `tauri-plugin-store`(store.json)에 저장, Rust setup에서 복원 후 표시
- 트레이 메뉴: 시간 설정 / 종료
- 시간 설정은 별도 `WebviewWindow` (`?page=time`)

## 스택

- Tauri 2 (tray-icon) + tauri-plugin-store + tauri-plugin-process
- React 18 + TypeScript 5 + Vite 5
