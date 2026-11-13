# 💬 Drawing Chat

**사람과 연결되고, 관심사로 모이다.**

Drawing Chat은 개인 메신저와 커뮤니티 Station을 하나로 묶는 Drawing 생태계의 웹 메신저 프로젝트입니다. 익숙한 클래식 메신저 탐색 구조를 참고하되, Drawing 고유의 네이비·화이트 스타일로 구현합니다.

## 🏗️ 기술 구성

- **Next.js 16 (App Router)** + React 19 + TypeScript
- 전역 CSS로 관리하는 반응형 UI, 라이트/다크 테마
- 현재 친구·대화·Station은 **브라우저 전용 데모**입니다. Drawing ID 인증 코드가 추가되었으나 관리자 OAuth 설정 전에는 비활성화됩니다. 실제 서버 메시지, 사용자 동기화, 알림, 그룹 대화 등은 아직 구현되지 않았습니다.

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

## 🔐 Drawing ID 통합 로그인 · v0.3

**코드 구현:** 중앙 Drawing 포털에서 사용 중인 Supabase Auth 프로젝트를 OAuth 2.1 공급자로 연결하는 방식입니다. 드챗은 **별도 Public OAuth Client**가 되어 인증 정보와 세션을 앱별로 분리합니다.

- `GET /api/drawing-id/start`: 서버가 무작위 `state`, PKCE verifier/challenge를 생성하고 중앙 Supabase OAuth 인증 페이지로 이동합니다.
- `GET /api/drawing-id/callback`: 서버에서 state와 PKCE 코드를 검증하고 토큰을 교환합니다. 토큰은 로그인 결과 URL이나 UI JSON에 노출되지 않습니다.
- `GET /api/drawing-id/me`: 서버가 Supabase `auth.getUser()`로 실제 사용자를 확인한 뒤 안전한 최소 프로필 정보만 반환합니다.
- `POST /api/drawing-id/logout`: 동일 출처 요청만 허용하고 **드챗의 로컬 세션**을 정리합니다.
- **더보기 → Drawing ID**에서 로그인 여부 확인, 중앙 로그인 시작, 이름 표시, 로그아웃이 가능합니다.

### 배포 전에 해야 하는 관리자 설정

중앙 Drawing 포털의 [SSO 배포 체크리스트](https://github.com/codingguy1026/Drawing/blob/main/docs/sso-setup.md)에 따라:

1. 기존 Drawing ID가 사용하는 **동일한 Supabase Auth 프로젝트**에서 OAuth Server를 켜고, 중앙 Drawing의 동의 페이지 경로를 `/oauth/consent`로 설정합니다.
2. **OAuth Apps → Add a new client**에서 이름을 **Drawing Chat**, 유형을 **Public (PKCE)** 으로 새로 등록합니다. Verse, Music 등의 기존 클라이언트 ID를 재사용하지 않습니다.
3. 드챗의 **실제 배포 원본 URL**이 `https://chat.example.com`이라면 등록된 Redirect URI를 정확히 `https://chat.example.com/api/drawing-id/callback`으로 설정합니다. Codespaces에서 실험할 때는 5173 포트의 고정 HTTPS 전달 주소를 사용하고 변경될 때마다 등록 URI를 확인해야 합니다.
4. `.env.example`을 참고해 **저장소에 커밋하지 않는** `.env.local` 또는 배포 환경에 설정합니다.

```dotenv
DRAWING_SUPABASE_URL=https://your-existing-project.supabase.co
DRAWING_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
DRAWING_SSO_CLIENT_ID=public-client-id-for-drawing-chat
DRAWING_SSO_ORIGIN=https://your-chat-domain.example
DRAWING_SSO_ENABLED=true
```

서버 전용 변수 `DRAWING_*`를 우선 사용하므로 Docker 이미지가 빌드된 이후에도 실행 환경에서 설정을 바꿀 수 있습니다. 다른 Drawing 서비스와 호환되는 `NEXT_PUBLIC_*` 환경 변수도 읽지만, 빌드 시 값이 고정될 수 있어 런타임 설정에는 권장하지 않습니다.

여기에는 **Supabase service_role/secret 키나 OAuth client secret이 필요하지 않습니다.** OAuth 사용을 시작하기 전에는 `DRAWING_SSO_ENABLED`를 `false`로 유지하세요. `true`여도 설정이 부족하면 연결하지 않고 안내 메시지만 보여줍니다.

### 확인 절차

- `npm install && npm run typecheck && npm run build` 후 `npm run dev`
- 첫 방문에는 **더보기 → Drawing ID → Drawing ID로 계속하기** 버튼이 정상 표시되는지 확인
- 중앙 Drawing ID에서 로그인하고 권한 요청을 승인한 뒤 드챗으로 복귀하여 실제 프로필이 표시되는지 확인
- 인증 거절, 다른 `state`, 만료된 코드는 연결되지 않아야 함
- 새로고침 후 로그인 유지, 로그아웃 후 `/api/drawing-id/me`에서 `user: null`, 다른 Drawing 서비스 세션은 영향 없음
- 다른 계정으로 로그인하여 이전 사용자의 정보가 남지 않는지 확인

**주의:** 중앙 OAuth Server의 활성화와 클라이언트 등록은 GitHub 코드만으로 수행되지 않습니다. 현재 중앙 Drawing의 공개 문서에는 관리자 설정/실사용 검증이 미완료라고 기록되어 있습니다. **실제 인증 성공 여부는 관리자 설정과 별도 브라우저 검증 이후에만 확정할 수 있습니다.**

## 🔐 향후 개발 순서

1. 중앙 OAuth 관리자 설정 및 브라우저에서 실제 로그인·로그아웃 검증
2. 개인 사용자와 실제 친구 관계 데이터 모델
3. 서버의 메시지 저장, 구독 및 권한 검사
4. 차단·신고·스팸 대응을 포함한 기본 안전 기능
5. Station 멤버십과 Drawing Verse Universe 연결

**중요:** 인증 코드는 준비되었지만 관리자 설정과 실사용 검증 전에는 성공을 보장하지 않습니다. 채팅과 친구 데이터는 계속 데모이며 메시지 암호화가 구현된 메신저가 아닙니다.

## 🌱 기존 Weblings 코드

이 저장소에는 이전 Discord 협동 육성 봇 Weblings 소스(`bot.py`, `weblings/` 등)가 남아 있습니다. 삭제하지 않고 보존했지만, **최상위 Dockerfile은 이제 Next.js Drawing Chat을 빌드하고 실행**하도록 변경되었습니다. 예전 Discord 봇 배포와 동시에 운영하려면 서비스/도커 설정을 분리해야 합니다.

이전 정적 HTML 시안은 `drawing-chat/index.html`에 참고용으로 보존했습니다. 메인 개발 경로는 이제 `app/` 및 `components/`입니다.
