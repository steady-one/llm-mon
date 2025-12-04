# Option 1: LLM Provider Billing API 방식

## 개요

각 LLM Provider가 제공하는 Billing/Usage API를 직접 연동하여 사용량 데이터를 수집하는 방식

```
┌─────────────────────────────────────────────────────────────┐
│                      고객 환경                               │
│                                                             │
│  [고객 서비스] ────────────────────→ [LLM Provider]         │
│       (기존 방식 그대로 사용)                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   모니터링 시스템                            │
│                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐ │
│  │ OAuth 연동  │ ───→ │ Usage 수집  │ ───→ │  Dashboard  │ │
│  │ (고객 인증) │      │ (정기 폴링) │      │  (시각화)   │ │
│  └─────────────┘      └─────────────┘      └─────────────┘ │
│                              │                              │
│                              ▼                              │
│                    [OpenAI Usage API]                       │
│                    [Anthropic Console]                      │
│                    [Google Cloud Billing]                   │
│                    [xAI Console]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Provider별 API 지원 현황

| Provider | Usage API | 지원 수준 | 데이터 세분화 |
|----------|-----------|-----------|---------------|
| **OpenAI** | `/v1/organization/usage/*` | ✅ 완전 지원 | 분/시간/일, API Key별 |
| **Anthropic** | ❌ 없음 | ❌ 미지원 | Console에서만 확인 |
| **Google** | Cloud Billing API | ⚠️ 제한적 | 프로젝트 단위만 |
| **xAI** | ❌ 없음 | ❌ 미지원 | Console에서만 확인 |

---

## 아키텍처

### 시스템 구성

```
┌──────────────────────────────────────────────────────────────┐
│                    LLM Monitor System                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   OAuth Service                         │ │
│  │                                                         │ │
│  │  - OpenAI OAuth 연동                                    │ │
│  │  - Google OAuth 연동                                    │ │
│  │  - (Anthropic, xAI는 OAuth 미지원)                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                 │
│                            ▼                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                Usage Collector (Scheduler)              │ │
│  │                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │ │
│  │  │ OpenAI       │  │ Google       │  │ Manual       │  │ │
│  │  │ Collector    │  │ Collector    │  │ Import       │  │ │
│  │  │ (API 호출)   │  │ (API 호출)   │  │ (CSV 업로드) │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                 │
│                            ▼                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                     Database                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                 │
│                            ▼                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Dashboard                            │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 데이터 흐름

```
1. 고객 온보딩
   └─→ OAuth로 LLM Provider 계정 연결 (지원되는 경우)
   └─→ 또는 수동으로 사용량 데이터 업로드

2. 정기 수집 (Cron Job)
   └─→ 매 시간/일 단위로 Usage API 폴링
   └─→ 데이터 정규화 후 DB 저장

3. 대시보드 조회
   └─→ 통합된 사용량 데이터 시각화
```

---

## 고객 온보딩 플로우

### OpenAI (OAuth 지원)

```
1. "OpenAI 연결" 버튼 클릭
2. OpenAI OAuth 인증 화면으로 리다이렉트
3. 고객이 권한 승인
4. Access Token 저장 (암호화)
5. Usage API 자동 수집 시작
```

### Anthropic, xAI (API 미지원)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Anthropic, xAI는 Usage API를 제공하지 않습니다.        │
│                                                             │
│  대안:                                                      │
│  1. Console에서 CSV 다운로드 후 수동 업로드                 │
│  2. (미지원) 자동 수집 불가                                 │
└─────────────────────────────────────────────────────────────┘
```

### Google (Cloud Billing)

```
1. Google Cloud 프로젝트 ID 입력
2. Service Account JSON 업로드
3. Cloud Billing API 권한 부여
4. 사용량 자동 수집 시작
```

---

## 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| Backend | Node.js (NestJS) | OAuth 처리, API 연동 |
| Scheduler | Bull Queue + Redis | 정기 수집 작업 |
| Database | PostgreSQL | 사용량 데이터 저장 |
| Dashboard | Next.js | 시각화 |
| 인증 | OAuth 2.0 | Provider별 연동 |

---

## 데이터 모델

```sql
-- OAuth 연결 정보
CREATE TABLE provider_connections (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL,        -- 'openai', 'google'
    access_token TEXT ENCRYPTED,          -- 암호화 저장
    refresh_token TEXT ENCRYPTED,
    token_expires_at TIMESTAMP,
    metadata JSONB,                        -- Provider별 추가 정보
    connected_at TIMESTAMP DEFAULT NOW(),
    last_sync_at TIMESTAMP
);

-- 수집된 사용량 데이터
CREATE TABLE usage_data (
    id BIGSERIAL PRIMARY KEY,
    org_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL,

    -- 기간
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    granularity VARCHAR(20),              -- 'minute', 'hour', 'day'

    -- 사용량
    total_tokens BIGINT,
    input_tokens BIGINT,
    output_tokens BIGINT,
    request_count INT,

    -- 비용
    total_cost DECIMAL(10, 6),

    -- 세부 정보
    breakdown JSONB,                       -- 모델별, API Key별 등

    -- 메타
    source VARCHAR(20),                    -- 'api', 'manual_import'
    raw_data JSONB,                        -- 원본 데이터 보관
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 장점

| 항목 | 설명 |
|------|------|
| **고객 작업 최소화** | OAuth 인증 한 번이면 끝 (지원 Provider) |
| **인프라 부담 없음** | 프록시 서버 운영 불필요 |
| **보안** | 트래픽이 우리를 경유하지 않음 |
| **정확한 데이터** | Provider 공식 데이터 사용 |
| **장애 영향 없음** | 우리 시스템 장애가 고객 서비스에 영향 없음 |

---

## 단점

| 항목 | 설명 | 심각도 |
|------|------|--------|
| **Provider 의존성** | API 미제공 Provider 지원 불가 | 🔴 Critical |
| **실시간성 부족** | 시간/일 단위 집계만 가능 | 🟠 High |
| **데이터 불일치** | Provider마다 제공 데이터가 다름 | 🟠 High |
| **차단 기능 불가** | 모니터링만 가능, 실시간 제어 불가 | 🟡 Medium |
| **수동 작업 필요** | Anthropic, xAI는 CSV 업로드 필요 | 🔴 Critical |

---

## 치명적 제약 사항

```
┌─────────────────────────────────────────────────────────────┐
│  🚨 Critical Issue                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  4대 Provider 중 2개(Anthropic, xAI)가 Usage API 미제공    │
│                                                             │
│  → 전체 Provider 통합 모니터링 목표 달성 불가               │
│  → 고객에게 수동 CSV 업로드 요구 (UX 저하)                  │
│  → 실시간 모니터링 불가능                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 개발 일정 (예상)

| Phase | 기간 | 내용 |
|-------|------|------|
| Phase 1 | 2주 | OpenAI Usage API 연동 + 대시보드 |
| Phase 2 | 1주 | Google Cloud Billing 연동 |
| Phase 3 | 1주 | 수동 Import 기능 (CSV) |
| Phase 4 | 1주 | 알림 기능 |

**총 예상 기간: 5주**

---

## 비용 구조

| 항목 | 월 예상 비용 |
|------|-------------|
| 서버 (API + Scheduler) | $50-100 |
| Database | $50-100 |
| 총 인프라 비용 | **$100-200/월** |

---

## 결론 및 권장 사항

### 이 방식이 적합한 경우

- OpenAI, Google 위주로 사용하는 고객 대상
- 실시간 모니터링이 필수가 아닌 경우
- 인프라 운영 부담을 최소화하고 싶은 경우

### 권장하지 않는 경우

- **4대 Provider 통합 모니터링이 목표인 경우** ❌
- 실시간 데이터가 필요한 경우
- 차단 기능 고도화를 계획하는 경우

### 최종 평가

| 평가 항목 | 점수 |
|-----------|------|
| 구현 난이도 | ⭐⭐⭐ (중간) |
| 고객 경험 | ⭐⭐ (낮음 - 일부 수동 작업) |
| 확장성 | ⭐⭐ (낮음 - Provider 의존) |
| MVP 적합성 | ⭐⭐ (낮음) |

**총평: 4대 Provider 통합이 목표라면 이 방식은 권장하지 않음**
