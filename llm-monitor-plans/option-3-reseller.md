# Option 3: Reseller (Unified API Key) 방식

## 개요

고객에게 통합 API Key를 제공하고, 우리가 각 LLM Provider와의 비용을 대신 지불한 후 고객에게 재청구하는 방식.
고객은 우리 API Key 하나로 모든 LLM Provider를 사용할 수 있음.

```
┌─────────────────────────────────────────────────────────────┐
│                        고객 환경                             │
│                                                             │
│  [고객 서비스]                                               │
│       │                                                     │
│       │  LLM_API_KEY=llm_sk_xxx (우리가 발급한 통합 Key)     │
│       │  LLM_BASE_URL=https://api.llmmonitor.com            │
│       │                                                     │
│       │  ※ 고객은 OpenAI, Anthropic 등 개별 Key 불필요      │
│       │                                                     │
└───────┼─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Unified LLM Gateway                       │
│                                                             │
│   1. 고객 요청 수신 (우리 API Key)                          │
│   2. 고객 인증 + 잔액/할당량 확인                           │
│   3. 우리 API Key로 LLM Provider 호출                       │
│   4. 응답 수신 + Usage 기록                                 │
│   5. 고객 잔액에서 비용 차감                                │
│   6. 응답 반환                                              │
│                                                             │
└───────┬─────────────────────────────────────────────────────┘
        │
        │  우리 회사 API Key 사용
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    LLM Providers                            │
│                                                             │
│   [OpenAI]  [Anthropic]  [Google]  [xAI]                   │
│                                                             │
│   ※ 비용 청구: Provider → 우리 회사                        │
│   ※ 우리가 고객에게 재청구 (마진 포함)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 핵심 특징

| 항목 | 설명 |
|------|------|
| **통합 API Key** | 고객은 우리 Key 하나로 4개 Provider 모두 사용 |
| **개별 Key 불필요** | 고객이 각 Provider에 가입할 필요 없음 |
| **선불/후불 청구** | 크레딧 충전 또는 월말 정산 |
| **마진 추가 가능** | 원가 + 마진으로 수익 창출 |
| **완전한 제어** | 실시간 할당량, 차단, 정책 적용 가능 |

---

## 비즈니스 모델

### 수익 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      수익 구조                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  고객 지불 = Provider 원가 + 마진(10-30%)                   │
│                                                             │
│  예시:                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ GPT-4 Turbo (1M tokens)                              │   │
│  │                                                      │   │
│  │ OpenAI 원가:  Input $10 + Output $30 = $40          │   │
│  │ 마진 (20%):   $8                                     │   │
│  │ ─────────────────────────────────────               │   │
│  │ 고객 청구:    $48                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  수익 = 마진 + 모니터링 구독료 (선택)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 가격 정책 옵션

| 방식 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **원가 + 고정 마진** | 모든 모델 20% 마진 | 단순, 투명 | 저가 모델 마진 작음 |
| **티어별 마진** | 사용량 많을수록 마진↓ | 대형 고객 유치 | 복잡 |
| **고정 가격** | 우리가 책정한 가격 | 가격 경쟁력 조절 | Provider 가격 변동 리스크 |

---

## 아키텍처

### 시스템 구성도

```
┌─────────────────────────────────────────────────────────────────┐
│                     LLM Gateway System                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Load Balancer                          │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    API Gateway                            │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │                Authentication                        │ │ │
│  │  │  - API Key 검증                                      │ │ │
│  │  │  - 조직 식별                                         │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                         │                                 │ │
│  │                         ▼                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              Balance & Quota Check                   │ │ │
│  │  │  - 잔액 확인 (선불 모델)                             │ │ │
│  │  │  - 할당량 확인                                       │ │ │
│  │  │  - 사용 가능 여부 결정                               │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                         │                                 │ │
│  │                         ▼                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │                 Provider Router                      │ │ │
│  │  │                                                      │ │ │
│  │  │  /v1/chat/completions (model: gpt-4)    → OpenAI    │ │ │
│  │  │  /v1/chat/completions (model: claude-3) → Anthropic │ │ │
│  │  │  /v1/chat/completions (model: gemini)   → Google    │ │ │
│  │  │  /v1/chat/completions (model: grok)     → xAI       │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                         │                                 │ │
│  │                         │ (우리 API Key 사용)             │ │
│  │                         ▼                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              LLM Provider Clients                    │ │ │
│  │  │                                                      │ │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│ │ │
│  │  │  │ OpenAI   │ │Anthropic │ │ Google   │ │  xAI     ││ │ │
│  │  │  │ Client   │ │ Client   │ │ Client   │ │ Client   ││ │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘│ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Billing Service                          │ │
│  │                                                           │ │
│  │  - Usage 기록                                             │ │
│  │  - 비용 계산 (원가 + 마진)                                │ │
│  │  - 잔액 차감 (선불) / 청구 누적 (후불)                    │ │
│  │  - 인보이스 생성                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                      Database                             │ │
│  │              (PostgreSQL + TimescaleDB)                   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                Dashboard + Admin Console                  │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 요청 처리 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                      Request Flow                               │
│                                                                 │
│  1. [고객] ─── POST /v1/chat/completions ───→ [Gateway]        │
│              Headers:                                           │
│              - Authorization: Bearer llm_sk_고객키              │
│              Body:                                              │
│              - model: "gpt-4-turbo"                             │
│                                                                 │
│  2. [Gateway] ─── 인증 ───→ API Key 검증, 조직 식별            │
│                                                                 │
│  3. [Gateway] ─── 잔액 확인 ───→ Redis                         │
│              - 잔액: $50.00                                     │
│              - 예상 비용: ~$0.05                                │
│              - 결과: OK                                         │
│                                                                 │
│  4. [Gateway] ─── model로 라우팅 ───→ OpenAI                   │
│              Headers:                                           │
│              - Authorization: Bearer sk-우리회사OpenAI키       │
│                                                                 │
│  5. [OpenAI] ─── Response ───→ [Gateway]                       │
│              - usage: { prompt_tokens: 100, completion_tokens: 50 }
│                                                                 │
│  6. [Gateway] ─── 비용 계산 + 차감 ───→                        │
│              - 원가: $0.04                                      │
│              - 마진(20%): $0.008                                │
│              - 청구액: $0.048                                   │
│              - 새 잔액: $49.952                                 │
│                                                                 │
│  7. [Gateway] ─── Response ───→ [고객]                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 고객 온보딩 플로우

### Step 1: 회원가입

```
┌─────────────────────────────────────────┐
│           LLM Gateway 회원가입           │
├─────────────────────────────────────────┤
│                                         │
│  회사명: [                    ]         │
│  이메일: [                    ]         │
│  비밀번호: [                  ]         │
│                                         │
│           [ 가입하기 ]                   │
│                                         │
└─────────────────────────────────────────┘
```

### Step 2: 크레딧 충전 (선불 모델)

```
┌─────────────────────────────────────────┐
│             크레딧 충전                  │
├─────────────────────────────────────────┤
│                                         │
│  현재 잔액: $0.00                        │
│                                         │
│  충전 금액 선택:                         │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │  $10   │ │  $50   │ │ $100   │      │
│  └────────┘ └────────┘ └────────┘      │
│  ┌────────┐ ┌────────┐                 │
│  │ $500   │ │ Custom │                 │
│  └────────┘ └────────┘                 │
│                                         │
│  결제 수단:                              │
│  ○ 신용카드                             │
│  ○ 계좌이체                             │
│                                         │
│           [ 충전하기 ]                   │
│                                         │
└─────────────────────────────────────────┘
```

### Step 3: API Key 발급

```
┌─────────────────────────────────────────┐
│         API Key가 발급되었습니다         │
├─────────────────────────────────────────┤
│                                         │
│  Your API Key:                          │
│  ┌───────────────────────────────────┐  │
│  │ llm_sk_a1b2c3d4e5f6g7h8i9j0...   │  │
│  └───────────────────────────────────┘  │
│                              [Copy]     │
│                                         │
│  ⚠️ 이 키로 모든 LLM Provider 사용 가능 │
│                                         │
│  지원 모델:                              │
│  • OpenAI: gpt-4-turbo, gpt-4o, ...    │
│  • Anthropic: claude-3-opus, ...       │
│  • Google: gemini-1.5-pro, ...         │
│  • xAI: grok-beta, ...                 │
│                                         │
└─────────────────────────────────────────┘
```

### Step 4: 사용 가이드

```
┌─────────────────────────────────────────────────────────────┐
│                    사용 가이드                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 환경 변수 설정:                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ # 통합 API Key (모든 Provider 사용 가능)             │   │
│  │ LLM_API_KEY=llm_sk_a1b2c3d4...                       │   │
│  │                                                      │   │
│  │ # Base URL                                           │   │
│  │ LLM_BASE_URL=https://api.llmgateway.com/v1          │   │
│  │                                                      │   │
│  │ # OpenAI SDK 호환 (선택)                             │   │
│  │ OPENAI_API_KEY=llm_sk_a1b2c3d4...                   │   │
│  │ OPENAI_BASE_URL=https://api.llmgateway.com/v1       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📝 코드 예시 (Python):                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ from openai import OpenAI                            │   │
│  │                                                      │   │
│  │ client = OpenAI(                                     │   │
│  │     api_key="llm_sk_...",                           │   │
│  │     base_url="https://api.llmgateway.com/v1"        │   │
│  │ )                                                    │   │
│  │                                                      │   │
│  │ # OpenAI 모델                                        │   │
│  │ response = client.chat.completions.create(           │   │
│  │     model="gpt-4-turbo",                            │   │
│  │     messages=[{"role": "user", "content": "Hi"}]    │   │
│  │ )                                                    │   │
│  │                                                      │   │
│  │ # Claude 모델 (같은 API로!)                          │   │
│  │ response = client.chat.completions.create(           │   │
│  │     model="claude-3-5-sonnet-20241022",             │   │
│  │     messages=[{"role": "user", "content": "Hi"}]    │   │
│  │ )                                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ✅ 하나의 Key로 모든 모델 사용!                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 통합 API 설계

### OpenAI 호환 API

```yaml
# 모든 Provider를 OpenAI 호환 인터페이스로 통합
POST /v1/chat/completions

Request:
  model: string           # gpt-4, claude-3-opus, gemini-pro, grok-beta
  messages: Message[]
  temperature?: number
  max_tokens?: number
  stream?: boolean

Response:
  id: string
  object: "chat.completion"
  model: string
  usage:
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  choices:
    - message:
        role: "assistant"
        content: string
```

### 모델 매핑

```
┌─────────────────────────────────────────────────────────────┐
│                     Model Routing                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  요청 model          →  Provider   →  실제 model           │
│  ─────────────────────────────────────────────────────────  │
│  gpt-4-turbo         →  OpenAI     →  gpt-4-turbo          │
│  gpt-4o              →  OpenAI     →  gpt-4o               │
│  gpt-4o-mini         →  OpenAI     →  gpt-4o-mini          │
│                                                             │
│  claude-3-opus       →  Anthropic  →  claude-3-opus-20240229
│  claude-3-5-sonnet   →  Anthropic  →  claude-3-5-sonnet-20241022
│  claude-3-5-haiku    →  Anthropic  →  claude-3-5-haiku-20241022
│                                                             │
│  gemini-1.5-pro      →  Google     →  gemini-1.5-pro       │
│  gemini-1.5-flash    →  Google     →  gemini-1.5-flash     │
│                                                             │
│  grok-beta           →  xAI        →  grok-beta            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 기술 스택

| 레이어 | 기술 | 이유 |
|--------|------|------|
| **API Gateway** | Go (Fiber) | 고성능, 낮은 latency |
| **Auth/Billing** | Node.js (NestJS) | 복잡한 비즈니스 로직 |
| **Cache** | Redis Cluster | 잔액 캐싱, Rate Limiting |
| **Database** | PostgreSQL | 트랜잭션, 빌링 데이터 |
| **Time Series** | TimescaleDB | 사용량 데이터 |
| **Message Queue** | Kafka | 빌링 이벤트 처리 |
| **Payment** | Stripe | 결제 처리 |
| **Dashboard** | Next.js | 풀스택 |

---

## 데이터 모델

```sql
-- 조직 (고객사)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    billing_type VARCHAR(20) DEFAULT 'prepaid',  -- 'prepaid', 'postpaid'
    created_at TIMESTAMP DEFAULT NOW()
);

-- API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    key_hash VARCHAR(64) NOT NULL,
    key_prefix VARCHAR(15) NOT NULL,         -- 'llm_sk_a1b2c3'
    name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    rate_limit_rpm INT DEFAULT 60,           -- requests per minute
    created_at TIMESTAMP DEFAULT NOW()
);

-- 잔액 (선불)
CREATE TABLE balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID UNIQUE REFERENCES organizations(id),
    amount DECIMAL(12, 6) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 잔액 변동 이력
CREATE TABLE balance_transactions (
    id BIGSERIAL PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    type VARCHAR(20) NOT NULL,               -- 'charge', 'usage', 'refund'
    amount DECIMAL(12, 6) NOT NULL,
    balance_after DECIMAL(12, 6) NOT NULL,
    description TEXT,
    reference_id VARCHAR(100),               -- usage_log id, payment id 등
    created_at TIMESTAMP DEFAULT NOW()
);

-- 사용량 로그
CREATE TABLE usage_logs (
    id BIGSERIAL,
    org_id UUID NOT NULL,
    api_key_id UUID,

    -- Provider 정보
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    endpoint VARCHAR(100),

    -- 토큰 사용량
    input_tokens INT NOT NULL,
    output_tokens INT NOT NULL,
    total_tokens INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

    -- 비용
    provider_cost DECIMAL(10, 6),            -- Provider 원가
    margin DECIMAL(10, 6),                   -- 마진
    total_cost DECIMAL(10, 6),               -- 고객 청구액

    -- 메타데이터
    is_streaming BOOLEAN DEFAULT false,
    latency_ms INT,
    status_code INT,

    -- 시간
    requested_at TIMESTAMP NOT NULL,

    PRIMARY KEY (id, requested_at)
);

SELECT create_hypertable('usage_logs', 'requested_at');

-- 크레딧 충전 내역
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),              -- 'card', 'bank_transfer'
    stripe_payment_id VARCHAR(100),
    status VARCHAR(20),                      -- 'pending', 'completed', 'failed'
    created_at TIMESTAMP DEFAULT NOW()
);

-- 인보이스 (후불)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    subtotal DECIMAL(12, 2),
    tax DECIMAL(12, 2),
    total DECIMAL(12, 2),
    status VARCHAR(20),                      -- 'draft', 'sent', 'paid', 'overdue'
    due_date DATE,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 가격 테이블
CREATE TABLE pricing (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    input_cost_per_1m DECIMAL(10, 4),        -- Provider 원가
    output_cost_per_1m DECIMAL(10, 4),
    input_price_per_1m DECIMAL(10, 4),       -- 고객 판매가 (마진 포함)
    output_price_per_1m DECIMAL(10, 4),
    margin_percent DECIMAL(5, 2),
    effective_date DATE NOT NULL,
    UNIQUE(provider, model, effective_date)
);

-- 할당량 설정
CREATE TABLE quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    quota_type VARCHAR(20),                  -- 'daily', 'monthly'
    limit_tokens BIGINT,
    limit_cost DECIMAL(12, 2),
    current_usage_tokens BIGINT DEFAULT 0,
    current_usage_cost DECIMAL(12, 2) DEFAULT 0,
    reset_at TIMESTAMP
);
```

---

## 빌링 플로우

### 선불 (Prepaid) 모델

```
┌─────────────────────────────────────────────────────────────────┐
│                     Prepaid Billing Flow                        │
│                                                                 │
│  1. 고객이 크레딧 충전 ($100)                                   │
│     └─→ Stripe 결제 처리                                        │
│     └─→ balances.amount += $100                                │
│     └─→ balance_transactions 기록                               │
│                                                                 │
│  2. API 요청 시                                                 │
│     └─→ Redis에서 잔액 확인 (캐시)                              │
│     └─→ 잔액 부족 시 402 Payment Required 응답                  │
│                                                                 │
│  3. 응답 후 비용 차감                                           │
│     └─→ 비용 계산: 원가 + 마진                                  │
│     └─→ Redis 잔액 차감 (원자적 연산)                           │
│     └─→ 비동기로 DB 동기화                                      │
│                                                                 │
│  4. 잔액 부족 알림                                              │
│     └─→ 잔액 $10 이하 시 이메일 알림                            │
│     └─→ 잔액 $0 도달 시 서비스 중단                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 후불 (Postpaid) 모델

```
┌─────────────────────────────────────────────────────────────────┐
│                    Postpaid Billing Flow                        │
│                                                                 │
│  1. 신용 한도 설정                                              │
│     └─→ 기본 $500/월 또는 협의                                  │
│                                                                 │
│  2. API 요청 시                                                 │
│     └─→ 현재 월 사용량 < 신용 한도 확인                         │
│     └─→ 초과 시 요청 거부                                       │
│                                                                 │
│  3. 사용량 누적                                                 │
│     └─→ usage_logs 기록                                         │
│     └─→ 월간 사용량 집계                                        │
│                                                                 │
│  4. 월말 정산                                                   │
│     └─→ 인보이스 생성                                           │
│     └─→ 이메일 발송                                             │
│     └─→ 등록 카드 자동 결제 또는 계좌이체                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 대시보드 화면

### 메인 대시보드

```
┌─────────────────────────────────────────────────────────────────┐
│  LLM Gateway                                    [ACME Corp] ▼  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  💰 잔액                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  $487.52                              [ + 충전하기 ]     │   │
│  │  예상 소진일: 12월 28일 (24일 후)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📊 이번 달 사용량                                              │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │  총 요청     │  총 토큰     │  총 비용     │  절감액      │ │
│  │  45,230      │  12.5M       │  $312.48     │  $42.30      │ │
│  │              │              │              │  (vs 직접)   │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
│                                                                 │
│  📈 사용량 추이                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                    ╭── GPT-4            │   │
│  │  $50 ┤                   ╭────────╯                     │   │
│  │      │           ╭──────╯         ╭── Claude            │   │
│  │  $25 ┤   ╭──────╯            ────╯                      │   │
│  │      │───╯                        ╭── Gemini            │   │
│  │   $0 ┼────────────────────────────╯                     │   │
│  │      12/1  12/2  12/3  12/4  12/5  12/6  12/7           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 비용 분석

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 비용 분석                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Model              │ 요청수   │ 토큰     │ 비용      │ % │   │
│  │────────────────────┼─────────┼─────────┼──────────┼────│   │
│  │ gpt-4-turbo        │ 5,230   │ 5.2M    │ $156.00  │ 50%│   │
│  │ claude-3-5-sonnet  │ 8,920   │ 3.1M    │ $62.40   │ 20%│   │
│  │ gpt-4o-mini        │ 25,600  │ 2.8M    │ $18.72   │ 6% │   │
│  │ gemini-1.5-pro     │ 3,200   │ 1.1M    │ $43.68   │ 14%│   │
│  │ grok-beta          │ 2,280   │ 0.3M    │ $31.68   │ 10%│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💡 비용 최적화 제안                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • gpt-4-turbo → gpt-4o로 전환 시 월 $78 절감 예상       │   │
│  │ • 간단한 작업에 gpt-4o-mini 사용 권장                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 장점

| 항목 | 설명 |
|------|------|
| **고객 경험 극대화** | Key 하나로 모든 Provider, 가입/결제 간소화 |
| **수익 모델** | 마진으로 직접적인 수익 창출 |
| **완전한 제어** | 실시간 차단, 할당량, 정책 모두 가능 |
| **부가 기능** | 비용 최적화 제안, 모델 비교 등 제공 가능 |
| **Lock-in 효과** | 고객이 우리 플랫폼에 종속 |

---

## 단점

| 항목 | 설명 | 심각도 |
|------|------|--------|
| **자본 필요** | Provider 비용 선지급 필요 | 🔴 Critical |
| **신용 리스크** | 고객 미결제 시 손실 | 🔴 Critical |
| **이용약관** | Provider Resale 정책 확인 필요 | 🟠 High |
| **가격 변동** | Provider 가격 변경 시 마진 영향 | 🟠 High |
| **운영 복잡성** | 빌링, 결제, 정산 시스템 필요 | 🟠 High |
| **규모의 경제** | 초기엔 마진이 작을 수 있음 | 🟡 Medium |

---

## 리스크 분석

### 재무 리스크

```
┌─────────────────────────────────────────────────────────────────┐
│                      재무 리스크 시나리오                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  시나리오: 월 $10,000 사용량 고객 10개사                        │
│                                                                 │
│  월간 GMV:          $100,000                                   │
│  Provider 비용:     $83,333 (마진 20% 가정)                    │
│  마진:              $16,667                                    │
│                                                                 │
│  리스크:                                                        │
│  • 1개사 미결제 시 $8,333 손실                                 │
│  • 선불 모델로 완화 가능                                        │
│  • 신용 한도 설정으로 최대 손실 제한                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Provider 이용약관

```
┌─────────────────────────────────────────────────────────────────┐
│                   Provider 이용약관 확인 필요                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OpenAI:                                                        │
│  • 재판매(Resale) 관련 조항 확인 필요                           │
│  • 엔터프라이즈 계약 고려                                        │
│                                                                 │
│  Anthropic:                                                     │
│  • 상업적 재배포 정책 확인                                       │
│  • 파트너십 프로그램 문의                                        │
│                                                                 │
│  Google:                                                        │
│  • Cloud Marketplace 리셀러 프로그램 확인                        │
│                                                                 │
│  xAI:                                                           │
│  • 신규 서비스로 정책 미확정 가능성                              │
│                                                                 │
│  ⚠️ 사전에 각 Provider와 협의 권장                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 개발 일정 (예상)

| Phase | 기간 | 내용 |
|-------|------|------|
| **Phase 1** | 2주 | API Gateway + Provider 연동 |
| **Phase 2** | 1.5주 | 빌링 시스템 (잔액, 차감) |
| **Phase 3** | 1주 | 결제 연동 (Stripe) |
| **Phase 4** | 1주 | 대시보드 |
| **Phase 5** | 0.5주 | 테스트 + 안정화 |

**총 예상 기간: 6주**

---

## 비용 구조

| 항목 | 월 예상 비용 | 비고 |
|------|-------------|------|
| API Gateway (5대) | $250-500 | c5.large x5 |
| Database (RDS) | $200-400 | db.r5.large |
| Redis Cluster | $150-300 | 잔액 캐싱 |
| Kafka | $200-400 | 빌링 이벤트 |
| Stripe 수수료 | 2.9% + $0.30 | 결제당 |
| **총 인프라 비용** | **$800-1,600/월** | 초기 |

### 손익분기점 분석

```
월 인프라 비용: $1,200 (중간값)
마진율: 20%

손익분기 GMV = $1,200 / 0.20 = $6,000/월

→ 월 $6,000 이상 GMV 발생 시 흑자
```

---

## 결론 및 권장 사항

### 이 방식이 적합한 경우

- ✅ 수익 모델이 명확해야 하는 경우
- ✅ 고객 경험 극대화가 최우선인 경우
- ✅ 완전한 제어 (차단, 할당량 등)가 필요한 경우
- ✅ 초기 자본이 확보된 경우
- ✅ Provider 파트너십 가능한 경우

### 권장하지 않는 경우

- ❌ 빠른 MVP 출시가 최우선인 경우
- ❌ 초기 자본이 부족한 경우
- ❌ 빌링 시스템 구축 리소스가 없는 경우
- ❌ 재무 리스크를 피하고 싶은 경우

### 최종 평가

| 평가 항목 | 점수 |
|-----------|------|
| 구현 난이도 | ⭐⭐⭐⭐⭐ (높음) |
| 고객 경험 | ⭐⭐⭐⭐⭐ (최고) |
| 수익 잠재력 | ⭐⭐⭐⭐⭐ (최고) |
| MVP 적합성 | ⭐⭐ (낮음) |
| 리스크 | 🔴 높음 |

**총평: 장기적으로 가장 큰 수익 잠재력. 단, MVP보다는 시리즈 A 이후 고도화 단계에 적합.**

---

## 추천 로드맵

```
┌─────────────────────────────────────────────────────────────────┐
│                      권장 진행 순서                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MVP (Option 2: Pass-through)                                  │
│  └─→ 빠른 출시, 시장 검증, 고객 확보                            │
│                                                                 │
│          ↓ (시장 검증 완료, 고객 확보 후)                       │
│                                                                 │
│  고도화 (Option 3: Reseller)                                   │
│  └─→ 수익 모델 강화                                             │
│  └─→ Provider 파트너십 체결                                     │
│  └─→ 빌링 시스템 구축                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
