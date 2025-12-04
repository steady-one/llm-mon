# Option 2: Pass-through Proxy 방식

## 개요

고객의 LLM API 요청을 투명하게 프록시하면서 사용량만 기록하는 방식.
고객은 자신의 LLM API Key를 계속 사용하고, 우리는 모니터링만 담당.

```
┌─────────────────────────────────────────────────────────────┐
│                        고객 환경                             │
│                                                             │
│  [고객 서비스]                                               │
│       │                                                     │
│       │  OPENAI_BASE_URL=https://monitor.example.com/openai │
│       │  OPENAI_API_KEY=sk-고객키 (기존 그대로)              │
│       │                                                     │
└───────┼─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Transparent Proxy                          │
│                                                             │
│   1. 요청 수신 (고객 API Key 포함)                          │
│   2. 그대로 LLM Provider에 전달                             │
│   3. 응답 수신                                              │
│   4. Usage 정보 추출 → DB 저장                              │
│   5. 응답 그대로 고객에게 반환                              │
│                                                             │
│   ※ 고객 API Key 저장하지 않음                              │
│   ※ 요청/응답 본문 저장하지 않음                            │
│                                                             │
└───────┬─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    LLM Providers                            │
│                                                             │
│   [OpenAI]  [Anthropic]  [Google]  [xAI]                   │
│                                                             │
│   ※ 비용 청구: Provider → 고객 직접                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 핵심 특징

| 항목 | 설명 |
|------|------|
| **고객 Key 사용** | 고객이 자신의 API Key를 계속 사용 |
| **Key 미저장** | 프록시는 Key를 메모리에서만 처리, 저장하지 않음 |
| **비용 직접 청구** | LLM 비용은 Provider가 고객에게 직접 청구 |
| **모니터링 전용** | 우리는 사용량 모니터링 서비스만 제공 |

---

## 아키텍처

### 시스템 구성도

```
┌─────────────────────────────────────────────────────────────────┐
│                     LLM Monitor System                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Load Balancer                          │ │
│  │                   (nginx / AWS ALB)                       │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Proxy Server                           │ │
│  │                   (Node.js / Go)                          │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │                  Router                              │ │ │
│  │  │                                                      │ │ │
│  │  │  /v1/openai/*    ──→  https://api.openai.com        │ │ │
│  │  │  /v1/anthropic/* ──→  https://api.anthropic.com     │ │ │
│  │  │  /v1/google/*    ──→  https://generativelanguage... │ │ │
│  │  │  /v1/grok/*      ──→  https://api.x.ai              │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              Usage Extractor                        │ │ │
│  │  │                                                      │ │ │
│  │  │  - OpenAI: response.usage                           │ │ │
│  │  │  - Anthropic: response.usage                        │ │ │
│  │  │  - Google: response.usageMetadata                   │ │ │
│  │  │  - xAI: response.usage (OpenAI 호환)                │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                    │
│                            │ (비동기 저장)                      │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         Message Queue (Redis / Kafka)                     │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Usage Writer Service                         │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    PostgreSQL                             │ │
│  │              (TimescaleDB for scale)                      │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Dashboard                              │ │
│  │                    (Next.js)                              │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 요청 처리 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                      Request Flow                               │
│                                                                 │
│  1. [고객] ─── POST /v1/openai/chat/completions ───→ [프록시]  │
│              Headers:                                           │
│              - Authorization: Bearer sk-고객키                  │
│              - X-Monitor-Token: mon_xxx                        │
│                                                                 │
│  2. [프록시] ─── 인증 확인 ───→ mon_xxx 유효성 검사            │
│                                                                 │
│  3. [프록시] ─── POST /chat/completions ───→ [OpenAI]          │
│              Headers:                                           │
│              - Authorization: Bearer sk-고객키 (그대로 전달)   │
│                                                                 │
│  4. [OpenAI] ─── Response ───→ [프록시]                        │
│              Body:                                              │
│              - usage: { prompt_tokens, completion_tokens }     │
│                                                                 │
│  5. [프록시] ─── Usage 추출 ───→ [Message Queue]               │
│              - org_id, provider, model, tokens, cost           │
│                                                                 │
│  6. [프록시] ─── Response (그대로) ───→ [고객]                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 고객 온보딩 플로우

### Step 1: 회원가입

```
┌─────────────────────────────────────────┐
│           LLM Monitor 회원가입           │
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

### Step 2: 모니터링 토큰 발급

```
┌─────────────────────────────────────────┐
│         모니터링 토큰이 발급되었습니다    │
├─────────────────────────────────────────┤
│                                         │
│  Your Monitor Token:                    │
│  ┌───────────────────────────────────┐  │
│  │ mon_sk_a1b2c3d4e5f6g7h8i9j0...   │  │
│  └───────────────────────────────────┘  │
│                              [Copy]     │
│                                         │
│  ⚠️ 이 토큰은 다시 표시되지 않습니다     │
│                                         │
└─────────────────────────────────────────┘
```

### Step 3: 환경변수 설정 가이드

```
┌─────────────────────────────────────────────────────────────┐
│                    설정 가이드                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 .env 파일에 다음을 추가하세요:                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ # 기존 API Key는 그대로 유지                         │   │
│  │ OPENAI_API_KEY=sk-your-existing-key                 │   │
│  │ ANTHROPIC_API_KEY=sk-ant-your-existing-key          │   │
│  │                                                      │   │
│  │ # Base URL만 변경                                    │   │
│  │ OPENAI_BASE_URL=https://api.llmmonitor.com/v1/openai│   │
│  │ ANTHROPIC_BASE_URL=https://api.llmmonitor.com/v1/anthropic
│  │ GOOGLE_API_BASE=https://api.llmmonitor.com/v1/google│   │
│  │ XAI_BASE_URL=https://api.llmmonitor.com/v1/grok     │   │
│  │                                                      │   │
│  │ # 모니터링 토큰                                      │   │
│  │ LLM_MONITOR_TOKEN=mon_sk_a1b2c3d4...                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ✅ 코드 수정 없이 환경변수만 변경하면 됩니다               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: 테스트 요청

```
┌─────────────────────────────────────────────────────────────┐
│                    연동 테스트                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  curl -X POST https://api.llmmonitor.com/v1/openai/chat/completions \
│    -H "Authorization: Bearer $OPENAI_API_KEY" \             │
│    -H "X-Monitor-Token: $LLM_MONITOR_TOKEN" \               │
│    -H "Content-Type: application/json" \                    │
│    -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hi"}]}'
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ 연동 성공!                                        │   │
│  │                                                      │   │
│  │ Provider: OpenAI                                     │   │
│  │ Model: gpt-4                                         │   │
│  │ Tokens: 15 (input: 10, output: 5)                   │   │
│  │ Cost: $0.0012                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│             [ 대시보드로 이동 ]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 기술 스택

| 레이어 | 기술 | 이유 |
|--------|------|------|
| **Proxy Server** | Go (Fiber) 또는 Node.js (Fastify) | 고성능, 스트리밍 처리 |
| **Message Queue** | Redis Streams | 경량, 빠른 처리 |
| **Database** | PostgreSQL + TimescaleDB | 시계열 데이터 최적화 |
| **Cache** | Redis | 토큰 검증 캐싱 |
| **Dashboard** | Next.js + Recharts | 풀스택 단일 프레임워크 |
| **Load Balancer** | nginx / AWS ALB | 트래픽 분산, SSL 처리 |
| **Deployment** | Docker + Kubernetes | 오토스케일링 |

---

## 데이터 모델

```sql
-- 조직 (고객사)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 모니터링 토큰
CREATE TABLE monitor_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    token_hash VARCHAR(64) NOT NULL,      -- bcrypt hash
    token_prefix VARCHAR(10) NOT NULL,    -- 'mon_sk_a1b2' (식별용)
    name VARCHAR(100),                     -- '프로덕션', '개발용' 등
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 사용량 로그 (TimescaleDB Hypertable)
CREATE TABLE usage_logs (
    id BIGSERIAL,
    org_id UUID NOT NULL,

    -- Provider 정보
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,

    -- 토큰 사용량
    input_tokens INT NOT NULL,
    output_tokens INT NOT NULL,
    total_tokens INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

    -- 비용 (USD)
    estimated_cost DECIMAL(10, 6),

    -- 요청 메타데이터
    endpoint VARCHAR(100),                 -- '/chat/completions'
    is_streaming BOOLEAN DEFAULT false,
    latency_ms INT,
    status_code INT,

    -- 시간
    requested_at TIMESTAMP NOT NULL,

    PRIMARY KEY (id, requested_at)
);

-- TimescaleDB Hypertable 변환
SELECT create_hypertable('usage_logs', 'requested_at');

-- 인덱스
CREATE INDEX idx_usage_org_time ON usage_logs(org_id, requested_at DESC);
CREATE INDEX idx_usage_provider ON usage_logs(provider, model);

-- 가격 테이블
CREATE TABLE pricing (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    input_price_per_1m DECIMAL(10, 4),    -- $ per 1M tokens
    output_price_per_1m DECIMAL(10, 4),
    effective_date DATE NOT NULL,

    UNIQUE(provider, model, effective_date)
);

-- 가격 데이터 예시
INSERT INTO pricing (provider, model, input_price_per_1m, output_price_per_1m, effective_date) VALUES
-- OpenAI
('openai', 'gpt-4-turbo', 10.00, 30.00, '2024-01-01'),
('openai', 'gpt-4o', 2.50, 10.00, '2024-05-01'),
('openai', 'gpt-4o-mini', 0.15, 0.60, '2024-07-01'),
-- Anthropic
('anthropic', 'claude-3-opus-20240229', 15.00, 75.00, '2024-03-01'),
('anthropic', 'claude-3-5-sonnet-20241022', 3.00, 15.00, '2024-10-01'),
('anthropic', 'claude-3-5-haiku-20241022', 0.80, 4.00, '2024-10-01'),
-- Google
('google', 'gemini-1.5-pro', 1.25, 5.00, '2024-05-01'),
('google', 'gemini-1.5-flash', 0.075, 0.30, '2024-05-01'),
-- xAI
('xai', 'grok-beta', 5.00, 15.00, '2024-10-01');
```

---

## API 엔드포인트

### Proxy Endpoints

```
# OpenAI 호환
POST /v1/openai/chat/completions
POST /v1/openai/embeddings
POST /v1/openai/images/generations

# Anthropic
POST /v1/anthropic/messages

# Google
POST /v1/google/models/{model}:generateContent
POST /v1/google/models/{model}:streamGenerateContent

# xAI (OpenAI 호환)
POST /v1/grok/chat/completions
```

### Dashboard API

```
# 인증
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout

# 조직 관리
GET    /api/orgs/me
PUT    /api/orgs/me

# 토큰 관리
GET    /api/tokens
POST   /api/tokens
DELETE /api/tokens/:id
POST   /api/tokens/:id/rotate

# 통계
GET    /api/stats/summary?period=day|week|month
GET    /api/stats/timeline?from=...&to=...&granularity=hour|day
GET    /api/stats/by-provider
GET    /api/stats/by-model
GET    /api/stats/costs
```

---

## 대시보드 화면

### 메인 대시보드

```
┌─────────────────────────────────────────────────────────────────┐
│  LLM Monitor                                    [ACME Corp] ▼  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 이번 달 요약                              [일|주|월]        │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │  총 요청     │  총 토큰     │  총 비용     │  평균 지연   │ │
│  │  45,230      │  12.5M       │  $2,340      │  1.2s        │ │
│  │  ↑12%        │  ↑8%         │  ↑15%        │  ↓5%         │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
│                                                                 │
│  📈 사용량 추이                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                    ╭── OpenAI           │   │
│  │  1M ┤                    ╭────────╯                     │   │
│  │     │            ╭──────╯         ╭── Anthropic         │   │
│  │ 500K┤    ╭──────╯            ────╯                      │   │
│  │     │────╯                        ╭── Google            │   │
│  │   0 ┼────────────────────────────╯                      │   │
│  │     12/1  12/2  12/3  12/4  12/5  12/6  12/7            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🥧 Provider 비율              📊 Top Models                   │
│  ┌─────────────────────┐      ┌─────────────────────────────┐ │
│  │     ╭───╮           │      │ Model            │ Tokens   │ │
│  │   ╭─┤OAI├─╮ 45%     │      │ gpt-4o           │ 5.2M     │ │
│  │   │ ╰───╯ │         │      │ claude-3-sonnet  │ 3.1M     │ │
│  │   │  ANT  │ 30%     │      │ gpt-4o-mini      │ 2.1M     │ │
│  │   ╰───────╯         │      │ gemini-1.5-pro   │ 1.5M     │ │
│  │    GGL 15% XAI 10%  │      │ grok-beta        │ 0.6M     │ │
│  └─────────────────────┘      └─────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 비용 분석

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 비용 분석                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Provider별 비용                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ OpenAI     ████████████████████████████████  $1,234  53%│   │
│  │ Anthropic  ████████████████████              $756    32%│   │
│  │ Google     ██████                            $245    10%│   │
│  │ xAI        ███                               $105     5%│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Model별 비용 상세                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Provider  │ Model              │ Requests │ Cost       │   │
│  │───────────┼────────────────────┼──────────┼────────────│   │
│  │ OpenAI    │ gpt-4-turbo        │ 5,230    │ $523.00    │   │
│  │ OpenAI    │ gpt-4o             │ 12,450   │ $456.00    │   │
│  │ Anthropic │ claude-3-5-sonnet  │ 8,900    │ $534.00    │   │
│  │ Anthropic │ claude-3-5-haiku   │ 15,200   │ $222.00    │   │
│  │ Google    │ gemini-1.5-pro     │ 3,400    │ $170.00    │   │
│  │ xAI       │ grok-beta          │ 2,100    │ $105.00    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 장점

| 항목 | 설명 |
|------|------|
| **고객 작업 최소화** | 환경변수 변경만으로 연동 완료 |
| **코드 수정 없음** | 기존 코드 그대로 사용 가능 |
| **모든 Provider 지원** | API 유무와 관계없이 4개 Provider 모두 지원 |
| **실시간 모니터링** | 요청 즉시 사용량 기록 |
| **세부 데이터** | 요청 단위의 상세 데이터 수집 |
| **보안** | 고객 API Key 저장하지 않음 |
| **비용 리스크 없음** | LLM 비용은 고객이 직접 지불 |
| **차단 기능 확장 가능** | 고도화 시 Rate Limiting, 할당량 관리 추가 용이 |

---

## 단점

| 항목 | 설명 | 대응 방안 |
|------|------|-----------|
| **트래픽 경유** | 모든 요청이 프록시 통과 | 글로벌 엣지 배포 |
| **지연 시간 추가** | ~10-30ms latency 추가 | 최적화, CDN 활용 |
| **인프라 부담** | 프록시 서버 운영 필요 | 오토스케일링 |
| **장애 영향** | 프록시 장애 시 고객 영향 | HA 구성, 헬스체크 |
| **스트리밍 복잡성** | SSE 응답 처리 필요 | 스트림 파이프라인 구현 |

---

## 고가용성 구성

```
┌─────────────────────────────────────────────────────────────────┐
│                    High Availability Setup                      │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                     CloudFlare / AWS                      │ │
│  │                      (Global LB)                          │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                    │
│          ┌─────────────────┼─────────────────┐                 │
│          ▼                 ▼                 ▼                 │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐        │
│  │   Region 1    │ │   Region 2    │ │   Region 3    │        │
│  │   (US-East)   │ │   (EU-West)   │ │   (AP-NE)     │        │
│  │               │ │               │ │               │        │
│  │ ┌───────────┐ │ │ ┌───────────┐ │ │ ┌───────────┐ │        │
│  │ │ Proxy x3  │ │ │ │ Proxy x3  │ │ │ │ Proxy x3  │ │        │
│  │ └───────────┘ │ │ └───────────┘ │ │ └───────────┘ │        │
│  │ ┌───────────┐ │ │ ┌───────────┐ │ │ ┌───────────┐ │        │
│  │ │ Redis     │ │ │ │ Redis     │ │ │ │ Redis     │ │        │
│  │ └───────────┘ │ │ └───────────┘ │ │ └───────────┘ │        │
│  └───────────────┘ └───────────────┘ └───────────────┘        │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL (Primary + Replica)               │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 개발 일정 (예상)

| Phase | 기간 | 내용 |
|-------|------|------|
| **Phase 1** | 1.5주 | 프록시 코어 (4개 Provider) |
| **Phase 2** | 1주 | 스트리밍 처리 + Usage 파싱 |
| **Phase 3** | 1주 | 대시보드 (메인 + 비용) |
| **Phase 4** | 0.5주 | 조직/토큰 관리 + 온보딩 |

**총 예상 기간: 4주**

---

## 비용 구조

| 항목 | 월 예상 비용 | 비고 |
|------|-------------|------|
| Proxy Server (3대) | $150-300 | t3.medium x3 |
| Load Balancer | $20-50 | AWS ALB |
| Database (RDS) | $100-200 | db.t3.medium |
| Redis | $50-100 | ElastiCache |
| 모니터링 | $50 | CloudWatch, Datadog |
| **총 인프라 비용** | **$370-700/월** | 초기 |

**스케일업 시**: 트래픽 증가에 따라 비례 증가

---

## 수익 모델

| 티어 | 월 요청 수 | 가격 |
|------|-----------|------|
| Free | 10,000 | $0 |
| Starter | 100,000 | $29 |
| Pro | 1,000,000 | $99 |
| Enterprise | Unlimited | Custom |

---

## 결론 및 권장 사항

### 이 방식이 적합한 경우

- ✅ 4대 Provider 통합 모니터링이 목표
- ✅ 고객 작업 최소화 중시
- ✅ 실시간 세부 데이터 필요
- ✅ 차단 기능 고도화 계획이 있음
- ✅ 비용 리스크를 피하고 싶음

### 권장하지 않는 경우

- ❌ 인프라 운영 부담을 원하지 않는 경우
- ❌ 트래픽 경유를 피하고 싶은 경우

### 최종 평가

| 평가 항목 | 점수 |
|-----------|------|
| 구현 난이도 | ⭐⭐⭐ (중간) |
| 고객 경험 | ⭐⭐⭐⭐⭐ (최고) |
| 확장성 | ⭐⭐⭐⭐ (높음) |
| MVP 적합성 | ⭐⭐⭐⭐⭐ (최고) |

**총평: MVP에 가장 적합한 방식. 고객 경험과 기능 확장성 모두 우수.**
