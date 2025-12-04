# LLM Monitor

Pass-through 프록시 방식의 LLM API 사용량 모니터링 시스템입니다.

고객의 LLM API 요청을 투명하게 프록시하면서 사용량만 기록합니다. 고객은 자신의 API Key를 계속 사용하고, 모니터링 서비스만 제공받습니다.

## 주요 기능

- **투명한 프록시**: OpenAI API 요청을 그대로 전달하고 응답 반환
- **사용량 추적**: 토큰 사용량, 비용, 지연시간 자동 기록
- **실시간 대시보드**: 사용량 통계, 비용 분석, 모델별 현황
- **모니터 토큰 관리**: 여러 토큰 생성/관리 가능
- **스트리밍 지원**: SSE 스트리밍 응답 완벽 지원

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite + Prisma ORM
- **Auth**: NextAuth.js v5
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열고 `AUTH_SECRET`을 변경하세요:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-random-secret-key"
```

### 3. 데이터베이스 설정

```bash
# 마이그레이션 실행
npx prisma migrate dev

# 초기 가격 데이터 시드
npm run db:seed
```

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## 사용 방법

### 1. 회원가입

1. http://localhost:3000/register 접속
2. 조직명, 이메일, 비밀번호 입력
3. **발급된 모니터 토큰을 안전하게 저장** (다시 표시되지 않음)

### 2. 환경변수 설정 (고객 서비스)

기존 OpenAI SDK를 사용하는 서비스에서 환경변수만 변경:

```env
# 기존 API Key는 그대로 유지
OPENAI_API_KEY=sk-your-existing-key

# Base URL을 프록시 서버로 변경
OPENAI_BASE_URL=http://localhost:3000/api/v1/openai

# 모니터링 토큰 추가
LLM_MONITOR_TOKEN=mon_xxxxxxxxxxxx
```

### 3. API 호출

모든 요청에 `X-Monitor-Token` 헤더를 추가:

```bash
curl -X POST http://localhost:3000/api/v1/openai/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "X-Monitor-Token: $LLM_MONITOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 4. 대시보드 확인

- **메인 대시보드** (`/`): 요청 수, 토큰 사용량, 비용, 평균 지연시간
- **비용 분석** (`/costs`): 모델별 상세 비용 분석
- **토큰 관리** (`/tokens`): 모니터 토큰 생성/삭제

## API 엔드포인트

### 프록시 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/openai/chat/completions` | Chat Completions |
| POST | `/api/v1/openai/embeddings` | Embeddings |
| * | `/api/v1/openai/*` | 모든 OpenAI API |

### 통계 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/stats/summary?period=day\|week\|month` | 기간별 요약 |
| GET | `/api/stats/timeline?from=...&to=...` | 시계열 데이터 |
| GET | `/api/stats/by-model` | 모델별 통계 |

### 토큰 관리 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/tokens` | 토큰 목록 조회 |
| POST | `/api/tokens` | 새 토큰 생성 |
| DELETE | `/api/tokens?id=xxx` | 토큰 삭제 |

## 데이터베이스 스키마

```
Organization     - 조직 (고객사)
├── MonitorToken - 모니터링 토큰 (1:N)
└── UsageLog     - 사용량 로그 (1:N)

Pricing          - 모델별 가격 정보
```

## 프로젝트 구조

```
monitor-proxy/
├── prisma/
│   ├── schema.prisma    # DB 스키마
│   └── seed.ts          # 초기 데이터
├── src/
│   ├── app/
│   │   ├── (auth)/      # 로그인/회원가입
│   │   ├── (dashboard)/ # 대시보드 페이지
│   │   └── api/
│   │       ├── auth/    # 인증 API
│   │       ├── v1/openai/  # 프록시 API
│   │       ├── tokens/  # 토큰 관리 API
│   │       └── stats/   # 통계 API
│   ├── components/
│   │   ├── ui/          # shadcn/ui 컴포넌트
│   │   ├── charts/      # 차트 컴포넌트
│   │   └── dashboard/   # 대시보드 컴포넌트
│   └── lib/
│       ├── auth.ts      # NextAuth 설정
│       ├── prisma.ts    # Prisma 클라이언트
│       ├── pricing.ts   # 비용 계산
│       └── proxy/       # 프록시 로직
└── package.json
```

## 확장 계획

현재 MVP는 OpenAI만 지원합니다. 추후 확장 가능:

- [ ] Anthropic (Claude) 지원
- [ ] Google (Gemini) 지원
- [ ] xAI (Grok) 지원
- [ ] 알림 기능 (비용 한도, 이상 탐지)
- [ ] 팀 멤버 관리
- [ ] API 사용량 제한 (Rate Limiting)

## 라이선스

MIT
