# LLM Proxy Test MVP 구현 계획서

## 1. 프로젝트 개요

### 1.1 목적
LLM SDK의 `base_url` 변경을 통한 프록시 연동이 실제로 동작하는지 테스트하기 위한 MVP 구축

### 1.2 테스트 대상 SDK
| Provider | SDK | base_url 지원 | 확인 출처 |
|----------|-----|--------------|----------|
| **OpenAI** | `openai` | ✅ `base_url` 파라미터 | [공식 SDK](https://github.com/openai/openai-python) |
| **Anthropic** | `@anthropic-ai/sdk` | ✅ `base_url` 파라미터 | [공식 SDK](https://github.com/anthropics/anthropic-sdk-python) |
| **xAI (Grok)** | `openai` (호환) | ✅ OpenAI SDK 사용 | [xAI Docs](https://docs.x.ai/docs/overview) |
| **Google (Gemini)** | `openai` (호환 모드) | ✅ OpenAI 호환 API | [Gemini OpenAI 호환](https://ai.google.dev/gemini-api/docs/openai) |

### 1.3 구현 방식
| 방식 | 설명 | 인증 |
|------|------|------|
| **Pass-through** | 고객 API Key 그대로 전달, 사용량만 기록 | Monitor Token |
| **Reseller** | 통합 API Key 발급, 우리 Key로 호출 후 재청구 | API Key + 잔액 |

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        llm-client (Port 3000)                   │
│                         간단한 채팅 UI                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Provider    │  │ Mode        │  │ Chat        │              │
│  │ Selector    │  │ Selector    │  │ Interface   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      llm-monitor (Port 3001)                    │
│              프록시 서버 + 대시보드                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Pass-through 모드                     │   │
│  │  /api/v1/openai/*    → api.openai.com                   │   │
│  │  /api/v1/anthropic/* → api.anthropic.com                │   │
│  │  /api/v1/google/*    → generativelanguage.googleapis.com│   │
│  │  /api/v1/xai/*       → api.x.ai                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Reseller 모드                         │   │
│  │  /api/v1/chat/completions                               │   │
│  │  → model로 Provider 자동 라우팅                          │   │
│  │  → OpenAI 형식으로 통합 응답                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    대시보드                              │   │
│  │  사용량 통계 / Provider별 분석 / 비용 현황               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LLM Providers                              │
│  [OpenAI]  [Anthropic]  [Google Gemini]  [xAI Grok]            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 프로젝트 구조

```
/Users/gimhangyeol/Desktop/my-project/llm-mvp/proxy-test/
├── llm-monitor/                    # 모니터링 서버 (Port 3001)
│   ├── prisma/
│   │   ├── schema.prisma           # DB 스키마
│   │   └── seed.ts                 # 초기 데이터 (가격표)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── v1/
│   │   │   │   │   ├── openai/[...path]/route.ts
│   │   │   │   │   ├── anthropic/[...path]/route.ts
│   │   │   │   │   ├── google/[...path]/route.ts
│   │   │   │   │   ├── xai/[...path]/route.ts
│   │   │   │   │   └── chat/completions/route.ts
│   │   │   │   ├── auth/
│   │   │   │   │   ├── register/route.ts
│   │   │   │   │   └── login/route.ts
│   │   │   │   ├── tokens/route.ts
│   │   │   │   ├── keys/route.ts
│   │   │   │   ├── balance/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── charge/route.ts
│   │   │   │   └── stats/
│   │   │   │       ├── summary/route.ts
│   │   │   │       └── by-model/route.ts
│   │   │   ├── dashboard/page.tsx
│   │   │   └── page.tsx
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   ├── auth.ts
│   │   │   ├── pricing.ts
│   │   │   └── proxy/
│   │   │       ├── openai.ts
│   │   │       ├── anthropic.ts
│   │   │       ├── google.ts
│   │   │       ├── xai.ts
│   │   │       └── unified.ts
│   │   └── components/
│   │       └── dashboard/
│   └── .env
│
└── llm-client/                     # 클라이언트 서버 (Port 3000)
    ├── src/
    │   ├── app/
    │   │   ├── api/chat/route.ts
    │   │   └── page.tsx
    │   ├── components/
    │   │   ├── ChatInterface.tsx
    │   │   ├── ProviderSelector.tsx
    │   │   └── ModeSelector.tsx
    │   └── lib/
    │       └── llm-client.ts
    └── .env.local
```

---

## 3. 데이터베이스 설계

### 3.1 Prisma 스키마

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// 조직 (고객사)
model Organization {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String   // bcrypt 해시
  createdAt DateTime @default(now())

  monitorTokens       MonitorToken[]
  apiKeys             ApiKey[]
  balance             Balance?
  usageLogs           UsageLog[]
  balanceTransactions BalanceTransaction[]
}

// Monitor Token (Pass-through 방식용)
model MonitorToken {
  id          String    @id @default(cuid())
  orgId       String
  tokenHash   String    // bcrypt 해시
  tokenPrefix String    // mon_sk_xxxx (표시용)
  name        String?
  isActive    Boolean   @default(true)
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())

  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  @@index([tokenHash])
}

// API Key (Reseller 방식용)
model ApiKey {
  id        String   @id @default(cuid())
  orgId     String
  keyHash   String   // SHA-256 해시
  keyPrefix String   // llm_sk_xxxx (표시용)
  name      String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  usageLogs    UsageLog[]
  @@index([keyHash])
}

// 잔액 (Reseller용)
model Balance {
  id        String   @id @default(cuid())
  orgId     String   @unique
  amount    Float    @default(0)
  updatedAt DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

// 잔액 변동 이력
model BalanceTransaction {
  id           String   @id @default(cuid())
  orgId        String
  type         String   // 'charge', 'usage'
  amount       Float
  balanceAfter Float
  description  String?
  createdAt    DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

// 사용량 로그 (Pass-through + Reseller 공용)
model UsageLog {
  id            String   @id @default(cuid())
  orgId         String
  apiKeyId      String?  // Reseller 모드에서만 사용
  provider      String   // 'openai', 'anthropic', 'google', 'xai'
  model         String
  inputTokens   Int
  outputTokens  Int
  providerCost  Float?   // Reseller: Provider 원가
  margin        Float?   // Reseller: 마진
  totalCost     Float?   // Reseller: 청구액
  estimatedCost Float?   // Pass-through: 예상 비용
  endpoint      String?
  isStreaming   Boolean  @default(false)
  latencyMs     Int?
  statusCode    Int?
  mode          String   @default("passthrough") // 'passthrough' or 'reseller'
  requestedAt   DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  apiKey       ApiKey?      @relation(fields: [apiKeyId], references: [id], onDelete: SetNull)

  @@index([orgId, requestedAt])
  @@index([provider, model])
}

// 가격 테이블
model Pricing {
  id               String   @id @default(cuid())
  provider         String
  model            String
  inputPricePer1m  Float    // 1M 토큰당 입력 가격 (USD)
  outputPricePer1m Float    // 1M 토큰당 출력 가격 (USD)
  effectiveDate    DateTime

  @@unique([provider, model, effectiveDate])
}
```

### 3.2 초기 가격 데이터 (seed.ts)

| Provider | Model | Input/1M | Output/1M |
|----------|-------|----------|-----------|
| openai | gpt-4o | $2.50 | $10.00 |
| openai | gpt-4o-mini | $0.15 | $0.60 |
| anthropic | claude-3-5-sonnet-20241022 | $3.00 | $15.00 |
| anthropic | claude-3-5-haiku-20241022 | $0.80 | $4.00 |
| google | gemini-1.5-pro | $1.25 | $5.00 |
| google | gemini-1.5-flash | $0.075 | $0.30 |
| xai | grok-beta | $5.00 | $15.00 |

---

## 4. API 설계

### 4.1 Pass-through 프록시 API

#### OpenAI Proxy
```
POST /api/v1/openai/chat/completions
Headers:
  - Authorization: Bearer sk-xxx (고객의 OpenAI Key)
  - X-Monitor-Token: mon_sk_xxx (모니터링 토큰)
  - Content-Type: application/json

→ Proxy to: https://api.openai.com/v1/chat/completions
```

#### Anthropic Proxy
```
POST /api/v1/anthropic/messages
Headers:
  - x-api-key: sk-ant-xxx (고객의 Anthropic Key)
  - anthropic-version: 2023-06-01
  - X-Monitor-Token: mon_sk_xxx
  - Content-Type: application/json

→ Proxy to: https://api.anthropic.com/v1/messages
```

#### Google Proxy (OpenAI 호환 모드)
```
POST /api/v1/google/chat/completions
Headers:
  - Authorization: Bearer AIza... (고객의 Google Key)
  - X-Monitor-Token: mon_sk_xxx
  - Content-Type: application/json

→ Proxy to: https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
```

#### xAI Proxy
```
POST /api/v1/xai/chat/completions
Headers:
  - Authorization: Bearer xai-xxx (고객의 xAI Key)
  - X-Monitor-Token: mon_sk_xxx
  - Content-Type: application/json

→ Proxy to: https://api.x.ai/v1/chat/completions
```

### 4.2 Reseller 통합 API

```
POST /api/v1/chat/completions
Headers:
  - Authorization: Bearer llm_sk_xxx (우리가 발급한 통합 Key)
  - Content-Type: application/json

Body:
{
  "model": "gpt-4o",        // 또는 "claude-3-5-sonnet", "gemini-1.5-pro", "grok-beta"
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}

→ model에 따라 자동 라우팅:
  - gpt-* → OpenAI
  - claude-* → Anthropic
  - gemini-* → Google
  - grok-* → xAI
```

#### Model 라우팅 테이블
| model 값 | Provider | 실제 model |
|---------|----------|-----------|
| gpt-4o | openai | gpt-4o |
| gpt-4o-mini | openai | gpt-4o-mini |
| claude-3-5-sonnet | anthropic | claude-3-5-sonnet-20241022 |
| claude-3-5-haiku | anthropic | claude-3-5-haiku-20241022 |
| gemini-1.5-pro | google | gemini-1.5-pro |
| gemini-1.5-flash | google | gemini-1.5-flash |
| grok-beta | xai | grok-beta |

### 4.3 관리 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 |
| GET | /api/tokens | Monitor Token 목록 |
| POST | /api/tokens | Monitor Token 생성 |
| DELETE | /api/tokens?id=xxx | Monitor Token 삭제 |
| GET | /api/keys | API Key 목록 |
| POST | /api/keys | API Key 생성 |
| DELETE | /api/keys?id=xxx | API Key 삭제 |
| GET | /api/balance | 잔액 조회 |
| POST | /api/balance/charge | 잔액 충전 |
| GET | /api/stats/summary | 사용량 요약 |
| GET | /api/stats/by-model | 모델별 통계 |

---

## 5. 각 Provider별 구현 상세

### 5.1 OpenAI

```typescript
// 인증: Authorization: Bearer sk-xxx
// Base URL: https://api.openai.com/v1
// 엔드포인트: /chat/completions

// Usage 추출
const data = await response.json()
const usage = {
  inputTokens: data.usage.prompt_tokens,
  outputTokens: data.usage.completion_tokens,
}
```

### 5.2 Anthropic

```typescript
// 인증: x-api-key: sk-ant-xxx
// 필수 헤더: anthropic-version: 2023-06-01
// Base URL: https://api.anthropic.com/v1
// 엔드포인트: /messages

// Usage 추출
const data = await response.json()
const usage = {
  inputTokens: data.usage.input_tokens,
  outputTokens: data.usage.output_tokens,
}

// Reseller용 OpenAI 형식 변환
const openaiFormat = {
  id: data.id,
  model: data.model,
  choices: [{
    message: { role: 'assistant', content: data.content[0].text },
    finish_reason: 'stop',
  }],
  usage: {
    prompt_tokens: data.usage.input_tokens,
    completion_tokens: data.usage.output_tokens,
    total_tokens: data.usage.input_tokens + data.usage.output_tokens,
  },
}
```

### 5.3 Google Gemini (OpenAI 호환 모드)

```typescript
// 인증: Authorization: Bearer AIza...
// Base URL: https://generativelanguage.googleapis.com/v1beta/openai
// 엔드포인트: /chat/completions

// OpenAI와 동일한 형식으로 요청/응답
// Usage도 OpenAI 형식: prompt_tokens, completion_tokens
```

### 5.4 xAI (Grok)

```typescript
// 인증: Authorization: Bearer xai-xxx
// Base URL: https://api.x.ai/v1
// 엔드포인트: /chat/completions

// OpenAI와 완전 호환 - 동일한 형식
```

---

## 6. SDK 연동 방법

### 6.1 Pass-through 모드

```typescript
// OpenAI
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'sk-xxx',  // 고객의 OpenAI Key
  baseURL: 'http://localhost:3001/api/v1/openai',
  defaultHeaders: { 'X-Monitor-Token': 'mon_sk_xxx' },
})
```

```typescript
// Anthropic
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: 'sk-ant-xxx',  // 고객의 Anthropic Key
  baseURL: 'http://localhost:3001/api/v1/anthropic',
  defaultHeaders: { 'X-Monitor-Token': 'mon_sk_xxx' },
})
```

```typescript
// xAI (OpenAI SDK 사용)
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'xai-xxx',  // 고객의 xAI Key
  baseURL: 'http://localhost:3001/api/v1/xai',
  defaultHeaders: { 'X-Monitor-Token': 'mon_sk_xxx' },
})
```

```typescript
// Google (OpenAI SDK 호환 모드)
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'AIza...',  // 고객의 Google Key
  baseURL: 'http://localhost:3001/api/v1/google',
  defaultHeaders: { 'X-Monitor-Token': 'mon_sk_xxx' },
})
```

### 6.2 Reseller 모드

```typescript
// 모든 Provider를 하나의 SDK로 사용
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'llm_sk_xxx',  // 우리가 발급한 통합 Key
  baseURL: 'http://localhost:3001/api/v1',
})

// GPT 호출
await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
})

// Claude 호출 (같은 SDK!)
await client.chat.completions.create({
  model: 'claude-3-5-sonnet',
  messages: [{ role: 'user', content: 'Hello!' }],
})

// Gemini 호출 (같은 SDK!)
await client.chat.completions.create({
  model: 'gemini-1.5-pro',
  messages: [{ role: 'user', content: 'Hello!' }],
})

// Grok 호출 (같은 SDK!)
await client.chat.completions.create({
  model: 'grok-beta',
  messages: [{ role: 'user', content: 'Hello!' }],
})
```

---

## 7. 환경변수

### 7.1 llm-monitor/.env

```bash
# Database
DATABASE_URL="file:./dev.db"

# 우리 회사 API Keys (Reseller 모드용)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
XAI_API_KEY=xai-...

# 인증
JWT_SECRET=your-32-character-secret-key

# 설정
DEFAULT_MARGIN_PERCENT=0.20
```

### 7.2 llm-client/.env.local

```bash
# Pass-through용 (고객의 실제 API Keys)
OPENAI_API_KEY=sk-customer-...
ANTHROPIC_API_KEY=sk-ant-customer-...
GOOGLE_API_KEY=AIza-customer-...
XAI_API_KEY=xai-customer-...

# Pass-through 모니터링 토큰
MONITOR_TOKEN=mon_sk_...

# Reseller용 통합 Key
LLM_API_KEY=llm_sk_...
```

---

## 8. 테스트 시나리오

### 8.1 Pass-through 테스트

```bash
# 1. 회원가입
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "email": "test@test.com", "password": "password123"}'

# 2. Monitor Token 발급 (로그인 후)
# → mon_sk_xxxx 토큰 받음

# 3. OpenAI Pass-through 테스트
curl -X POST http://localhost:3001/api/v1/openai/chat/completions \
  -H "Authorization: Bearer sk-your-openai-key" \
  -H "X-Monitor-Token: mon_sk_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hi"}]}'

# 4. Anthropic Pass-through 테스트
curl -X POST http://localhost:3001/api/v1/anthropic/messages \
  -H "x-api-key: sk-ant-your-key" \
  -H "anthropic-version: 2023-06-01" \
  -H "X-Monitor-Token: mon_sk_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-haiku-20241022","max_tokens":1024,"messages":[{"role":"user","content":"Hi"}]}'

# 5. 대시보드에서 사용량 확인
# http://localhost:3001/dashboard
```

### 8.2 Reseller 테스트

```bash
# 1. API Key 발급 (로그인 후)
# → llm_sk_xxxx 토큰 받음

# 2. 잔액 충전
curl -X POST http://localhost:3001/api/balance/charge \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{"amount": 10.00}'

# 3. 통합 API로 GPT 호출
curl -X POST http://localhost:3001/api/v1/chat/completions \
  -H "Authorization: Bearer llm_sk_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hi"}]}'

# 4. 통합 API로 Claude 호출 (같은 엔드포인트!)
curl -X POST http://localhost:3001/api/v1/chat/completions \
  -H "Authorization: Bearer llm_sk_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-haiku","messages":[{"role":"user","content":"Hi"}]}'

# 5. 잔액 확인
curl http://localhost:3001/api/balance -H "Cookie: session=..."
```

---

## 9. 구현 체크리스트

### Phase 1: 기초 설정
- [ ] llm-monitor Next.js 프로젝트 생성
- [ ] llm-client Next.js 프로젝트 생성
- [ ] Prisma 스키마 작성 및 마이그레이션
- [ ] 초기 가격 데이터 시드
- [ ] 환경변수 설정

### Phase 2: 인증 시스템
- [ ] 회원가입 API (/api/auth/register)
- [ ] 로그인 API (/api/auth/login)
- [ ] Monitor Token 발급/관리 API
- [ ] API Key 발급/관리 API
- [ ] 토큰 검증 유틸리티

### Phase 3: Pass-through 프록시
- [ ] OpenAI 프록시 구현
- [ ] Anthropic 프록시 구현
- [ ] Google 프록시 구현 (OpenAI 호환 모드)
- [ ] xAI 프록시 구현
- [ ] Usage 로깅 공통 로직

### Phase 4: Reseller 통합 API
- [ ] 잔액 관리 API
- [ ] 통합 chat/completions 엔드포인트
- [ ] Model 라우팅 로직
- [ ] Anthropic 요청/응답 변환 레이어
- [ ] 비용 계산 및 잔액 차감

### Phase 5: 클라이언트 UI
- [ ] Provider 선택 컴포넌트
- [ ] Mode 선택 컴포넌트
- [ ] 채팅 인터페이스
- [ ] API 호출 로직

### Phase 6: 대시보드
- [ ] 사용량 요약 통계
- [ ] Provider별 분석
- [ ] 모델별 상세 테이블
- [ ] 잔액 현황 (Reseller)

---

## 10. 주의사항

### 10.1 Google Gemini
- 기본 SDK(`@google/generative-ai`)는 `base_url` 변경이 제한적
- **OpenAI 호환 모드 사용**: `https://generativelanguage.googleapis.com/v1beta/openai/`
- OpenAI SDK로 통일하여 사용 가능

### 10.2 스트리밍
- 초기 MVP에서는 **non-streaming만 구현**
- 스트리밍은 추후 별도 Phase에서 추가

### 10.3 에러 처리
- 각 Provider의 에러 형식이 다름
- Reseller 모드에서는 모든 에러를 OpenAI 형식으로 통일:
```json
{
  "error": {
    "message": "Error description",
    "type": "invalid_request_error",
    "code": "model_not_found"
  }
}
```

### 10.4 SDK 호환성 정리
| Provider | Pass-through SDK | Reseller SDK |
|----------|-----------------|--------------|
| OpenAI | `openai` | `openai` |
| Anthropic | `@anthropic-ai/sdk` | `openai` (변환) |
| Google | `openai` (호환 모드) | `openai` |
| xAI | `openai` | `openai` |

---

## 11. 참고 링크

### 공식 문서
- [OpenAI API](https://platform.openai.com/docs/api-reference)
- [Anthropic API](https://docs.anthropic.com/en/api)
- [Google Gemini OpenAI 호환](https://ai.google.dev/gemini-api/docs/openai)
- [xAI API](https://docs.x.ai/docs/overview)

### SDK GitHub
- [openai-python](https://github.com/openai/openai-python)
- [anthropic-sdk-python](https://github.com/anthropics/anthropic-sdk-python)

### base_url 지원 확인
- [Anthropic base_url Issue #409](https://github.com/anthropics/anthropic-sdk-python/issues/409)
- [xAI OpenAI SDK 호환](https://docs.x.ai/docs/overview)
