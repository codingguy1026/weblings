# 💬 Drawing Chat

**Drawing 생태계의 클래식 메신저 UI 시제품**

과거 카카오톡의 단순하고 익숙한 친구·채팅 목록을 참고하되, Drawing 고유의 네이비·화이트 디자인을 적용했습니다. 공개 소셜 피드를 채팅 화면에 강제로 섞지 않고 **친구 / 채팅 / Station / 더보기**를 분리합니다.

## 🧑‍💻 Codespaces에서 바로 실행하기

**2026-11-13 업데이트:** `package.json`과 설치가 필요 없는 Node.js 미리보기 서버가 추가되었습니다. Codespaces 터미널에서 다음 명령으로 실행합니다.

```bash
cd /workspaces/weblings
git pull
npm run dev
```

출력되는 `http://localhost:5173` 주소 또는 Codespaces의 **Ports → 5173 → Open in Browser**로 화면을 엽니다. `drawing-chat` 폴더 안에서도 `npm run dev`가 가능합니다. 외부 패키지 의존성이 없어 `npm install`은 필요하지 않습니다.

이전에 `npm i`를 실행하다 **로컬에 빈 `package.json`을 생성했다면**, `git pull` 전에 그 빈 파일을 백업하거나 치워 주세요. 그렇지 않으면 Git이 새로 추가된 올바른 `package.json`을 받아오지 못할 수 있습니다.

서버는 개발용이며 HTML 미리보기만 제공하고 실제 채팅 서버나 Drawing ID 로그인은 제공하지 않습니다.

## ▶ 실행

저장소 최상단의 `index.html`을 웹 브라우저에서 열면 됩니다. 별도 설치나 패키지 빌드가 필요 없는 정적 HTML·CSS·JavaScript 시제품입니다.

- 홈 화면: [index.html](./index.html)
- 동일한 시제품의 독립 폴더: [drawing-chat/](./drawing-chat/)
- 상세 기능/주의사항: [drawing-chat/README.md](./drawing-chat/README.md)

## ✨ 현재 구현된 시연 기능

- 친구와 최근 채팅 목록, 가상 대화 열기, 목록 검색
- 메시지 전송 체험과 브라우저의 로컬 저장소 기록
- 주제별 Station 채널과 참여하기 시연
- 데스크톱 사이드바 및 모바일 하단 탐색
- 라이트/다크 테마, 데모 데이터 초기화
- HTML 출력 시 사용자 입력 이스케이프 처리

> **주의:** 실제 Drawing ID 인증이나 다른 사람과의 실시간 대화는 아직 지원하지 않습니다. 모든 친구·채널 데이터는 예시이며, 입력한 메시지는 본인 브라우저에만 보관됩니다. 비밀번호나 개인정보를 입력하지 마세요.

## 🎯 다음 개발 순서

1. 기존 Drawing ID 인증 구조 확인 후 안전하게 연결
2. 사용자별 친구 관계 및 1:1 채팅 데이터 모델 설계
3. 실시간 데이터 저장·접근 권한·차단 및 신고 기능 구현
4. Station 멤버십/채널 관리
5. 비공개 테스트와 서비스 운영 정책 정리

## 🌱 기존 Weblings 봇 파일에 대하여

이 저장소에는 원래 **Discord 협동 생물 육성 봇 Weblings** 코드(`bot.py`, `weblings/`, `tests/`, `Dockerfile` 등)가 포함되어 있습니다. 실수로 기존 기능이나 배포를 파괴하지 않도록 이 파일들은 현재 그대로 보존했습니다.

특히 **기존 Dockerfile은 여전히 Weblings 디스코드 봇을 실행합니다.** `index.html`을 웹으로 공개하려면 정적 호스팅을 따로 설정해야 하며, 본 변경이 Railway 배포를 자동으로 Drawing Chat으로 바꾸지는 않습니다.
