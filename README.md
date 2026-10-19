# 🌱 Weblings

**한 Discord 서버의 사람들이 생물 하나를 함께 키우는 협동 육성 게임!**

서버마다 하나의 웹링을 입양하고 🌿 숲 / ☁️ 구름 / ⚡ 번개 / 🐚 바다 중에서 종류를 골라요. 유저들이 먹이를 주고, 놀아 주고, 쓰다듬으며 함께 성장시켜요. 오래 쉬어도 웹링은 죽거나 사라지지 않아요. 데이터는 SQLite에 보관됩니다.

## 명령어

| 명령어 | 설명 |
|---|---|
| `/webling adopt` | 웹링 탄생 (이름과 종류 선택) |
| `/webling status` | 배부름, 기분, 에너지, 성장 확인 |
| `/webling feed` | 먹이 주기 (각 유저당 20분) |
| `/webling play` | 놀아 주기 (각 유저당 25분) |
| `/webling pet` | 쓰다듬기 (각 유저당 10분) |
| `/webling contributors` | 서버별 돌봄 기여도 상위 10명 |
| `/webling rename` | 이름 바꾸기 (서버 관리 권한 필요) |
| `/webling help` | 사용법 |

성장 단계: **아기(0 XP) → 어린이(120) → 청소년(350) → 어른(800) → 전설(1600)**

## 실행하기

필요한 것은 Python 3.11 이상 및 Discord 봇 토큰이에요.

1. [Discord Developer Portal](https://discord.com/developers/applications)에서 새 애플리케이션/봇을 만들고 토큰을 준비해요.
2. OAuth2 설치 설정에서 `bot`과 `applications.commands` 권한을 활성화해 원하는 Discord 서버에 봇을 설치해요. 메시지 내용 읽기 권한은 필요 없어요.
3. Python 가상환경과 환경변수를 설정한 후 실행해요.

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export DISCORD_TOKEN='your_bot_token'
export TEST_GUILD_ID='your_test_guild_id'  # 선택사항
python bot.py
```

Windows PowerShell에서는 `$env:DISCORD_TOKEN='your_bot_token'`처럼 설정해요.

`.env.example`은 환경변수 안내 파일이에요. 봇은 `.env` 파일을 자동으로 불러오지 않아요. 테스트 서버 ID(`TEST_GUILD_ID`)를 설정하면 해당 서버에서 명령어를 빠르게 동기화하고, 생략하면 모든 서버를 대상으로 글로벌 명령어를 동기화해요. 글로벌 명령어 반영에는 시간이 걸릴 수 있어요.

기본 저장 경로는 `data/weblings.db`이고 `DATABASE_PATH` 환경변수로 바꿀 수 있어요.

### 테스트

```bash
python -m unittest discover -s tests -v
```

## Railway 배포

1. 이 GitHub 저장소를 Railway 새 서비스에 연결해요. 포함된 `Dockerfile`이 봇을 실행해요.
2. Railway **Variables**에서 `DISCORD_TOKEN`을 등록해요. 테스트용이면 `TEST_GUILD_ID`도 설정할 수 있어요.
3. Railway **Volume**을 `/data`에 마운트하고 `DATABASE_PATH=/data/weblings.db`를 설정해요.
4. Discord 봇은 백그라운드 워커이므로 공개 HTTP 도메인이 필요 없어요.

**주의:** 볼륨 없이 Railway에 배포하면 재배포 시 게임 데이터가 초기화될 수 있어요. 토큰은 GitHub나 채팅에 공개하지 마세요.

## 저장되는 데이터

웹링을 키우기 위한 Discord 서버 ID, 유저 ID, 행동 횟수, XP, 웹링의 상태를 SQLite에 저장해요. 채팅 본문을 읽거나 저장하지 않아요.

## 다음 버전

웹 대시보드, 생물의 외형 성장, 랜덤 반응, 도감. 첫 버전은 서버에서 다 같이 한 마리를 키우는 기본 플레이에 집중했어요.
