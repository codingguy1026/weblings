# 💬 Drawing Chat

**사람과 연결되고, 관심사로 모이다.**

Drawing Chat은 개인 메신저와 커뮤니티 Station을 하나로 묶는 Drawing 생태계의 웹 메신저 프로젝트입니다. 익숙한 클래식 메신저 탐색 구조를 참고하되, Drawing 고유의 네이비·화이트 스타일로 구현합니다.

## 🏗️ 기술 구성

- **Next.js 16 (App Router)** + React 19 + TypeScript
- 전역 CSS로 관리하는 반응형 UI, 라이트/다크 테마
- 현재는 **브라우저 전용 데모**입니다. 실제 서버 메시지, Drawing ID 인증, 사용자 동기화, 알림, 그룹 대화 등은 아직 구현되지 않았습니다.

## 🚀 GitHub Codespaces에서 실행

**Node.js 20.9 이상**을 사용하세요. 저장소 최상단에서 실행합니다.

```bash
cd /workspaces/weblings
git pull
npm install
npm run dev
```

Codespaces에서 **Ports → 5173 → Open in Browser**를 선택하거나 개발 환경의 `http://localhost:5173`으로 접속하세요.

- `npm run dev`: Next.js 개발 서버 (포트 5173)
- `npm run build`: 프로덕션 빌드
- `npm run start`: 프로덕션 서버 (포트 3000, 빌드 후 실행)
- `npm run typecheck`: TypeScript 검사

`drawing-chat` 폴더에서 `npm run dev`를 실행해도 최상단 Next.js 프로젝트의 개발 서버를 실행하도록 연결해 두었습니다.

## 🧭 화면 구성

| 탭 | 역할 |
| --- | --- |
| 친구 | 간결한 세로 친구 목록 및 1:1 대화로 이동 |
| 채팅 | 최근 대화 목록, Enter 전송 / Shift+Enter 줄바꿈 |
| Station | 독립적인 관심사 채널 탐색 및 데모 참여 |
| 더보기 | 라이트/다크 테마, 데모 데이터 초기화 |

가상의 친구·Station과 메시지를 사용하며, 사용자가 입력한 메시지는 **현재 브라우저의 localStorage에만 저장**됩니다. 비밀번호나 개인정보를 입력하지 마세요.

## 📁 프로젝트 구조

```text
app/
  layout.tsx          # HTML 셸, 메타데이터, 전역 CSS
  page.tsx            # 메인 화면 (/)
  drawing-chat/
    page.tsx          # 보조 진입 경로 (/drawing-chat)
  globals.css         # 공통 레이아웃 / 모바일 UI / 테마
components/
  chat-app.tsx        # React 클라이언트 화면과 데모 인터랙션
lib/
  demo.ts             # 화면용 가상 데이터와 TypeScript 타입
next.config.ts
package.json
Dockerfile
```

## 🔐 향후 개발 순서

1. Drawing ID 인증 시스템 검토 및 안전한 로그인 연동
2. 개인 사용자와 실제 친구 관계 데이터 모델
3. 서버의 메시지 저장, 구독 및 권한 검사
4. 차단·신고·스팸 대응을 포함한 기본 안전 기능
5. Station 멤버십과 Drawing Verse Universe 연결

**중요:** 이 코드는 실제 대화 암호화나 보안이 구현된 메신저가 아니라 UI 시제품입니다. Drawing ID로 로그인할 수 있다고 표시하지 마세요.

## 🌱 기존 Weblings 코드

이 저장소에는 이전 Discord 협동 육성 봇 Weblings 소스(`bot.py`, `weblings/` 등)가 남아 있습니다. 삭제하지 않고 보존했지만, **최상위 Dockerfile은 이제 Next.js Drawing Chat을 빌드하고 실행**하도록 변경되었습니다. 예전 Discord 봇 배포와 동시에 운영하려면 서비스/도커 설정을 분리해야 합니다.

이전 정적 HTML 시안은 `drawing-chat/index.html`에 참고용으로 보존했습니다. 메인 개발 경로는 이제 `app/` 및 `components/`입니다.
