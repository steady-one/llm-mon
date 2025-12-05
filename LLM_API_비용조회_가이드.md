# LLM 프로바이더별 API 키를 통한 비용 조회 가이드

> 작성일: 2025-12-05
> 대상: OpenAI, Anthropic, xAI, Google Gemini

## 📊 요약 비교표

| 프로바이더 | API 비용 조회 지원 | 필요한 키 유형 | 엔드포인트 제공 | 비고 |
|-----------|------------------|---------------|---------------|------|
| **OpenAI** | ✅ 지원 | **Admin API 키 필수** | ✅ REST API | 완성도 높은 Usage/Cost API |
| **Anthropic** | ✅ 지원 | **Admin API 키 필수** | ✅ REST API | 조직 계정 필수, Admin 권한 필요 |
| **xAI** | ❌ 미지원 | - | ❌ 콘솔만 | 프로그래매틱 조회 API 없음 |
| **Google Gemini** | ⚠️ 제한적 | GCP 서비스 계정 | ❌ Cloud Billing만 | GCP 빌링 API 통해 간접 조회 |

> ⚠️ **핵심 결론**: OpenAI와 Anthropic 모두 **일반 API 키로는 비용 조회가 불가능**합니다. 별도의 Admin Key가 필요합니다.

---

## 1. OpenAI

### ✅ 지원 상태: **조건부 지원 (Admin Key 필수)**

OpenAI는 Usage 및 Cost API를 제공하지만, **Admin API Key가 필수**입니다.

### ⚠️ 중요: Admin Key 필수

- **일반 API 키로는 비용/사용량 조회 불가**
- Admin Key 발급: https://platform.openai.com/settings/organization/admin-keys
- 조직 Owner/Admin 권한 필요

### 엔드포인트

#### 1.1 Costs API (비용 조회)
```
GET https://api.openai.com/v1/organization/costs
```

**매개변수:**
| 매개변수 | 필수 | 설명 |
|---------|-----|------|
| `start_time` | ✅ | Unix 초 단위 시작 시간 |
| `bucket_width` | - | 현재 `1d`만 지원 |
| `limit` | - | 반환할 버킷 수 |

#### 1.2 Usage API (사용량 조회)
```
GET https://api.openai.com/v1/organization/usage/{service}
```
- 지원 서비스: `completions`, `images`, `audio`, `embeddings`, `moderations`, `vector_stores`, `code_interpreter_sessions`

**매개변수:**
| 매개변수 | 필수 | 설명 |
|---------|-----|------|
| `start_time` | ✅ | Unix 초 단위 시작 시간 |
| `bucket_width` | - | `1m`, `1h`, `1d` (기본: `1d`) |
| `group_by` | - | 그룹화 기준 (예: `["model", "project_id"]`) |
| `project_ids` | - | 프로젝트 ID 필터 |
| `api_key_ids` | - | API 키 ID 필터 |

### 인증 방법
```bash
# ⚠️ Admin Key 필수 (일반 API 키 사용 불가)
curl "https://api.openai.com/v1/organization/costs?start_time=1733356800" \
  -H "Authorization: Bearer $OPENAI_ADMIN_KEY"
```

### 응답 예시
```json
{
  "object": "page",
  "data": [
    {
      "input_tokens": 15000,
      "output_tokens": 5000,
      "input_cached_tokens": 2000,
      "num_model_requests": 50,
      "project_id": "proj_xxx",
      "model": "gpt-4"
    }
  ]
}
```

### 특징
- **Admin Key 필수** (일반 API 키로는 조회 불가)
- API 키별 사용량 추적 가능 (2023년 12월 20일 이후 생성 키)
- `group_by` 미지정 시 project_id, model 등이 null로 반환
- 금액은 센트 단위로 반환 (달러 변환: `/100`)

### 참고 링크
- [OpenAI Costs API 문서](https://platform.openai.com/docs/api-reference/usage/costs)
- [OpenAI Cookbook - Usage API 예제](https://cookbook.openai.com/examples/completions_usage_api)
- [Admin Keys 설정](https://platform.openai.com/settings/organization/admin-keys)

---

## 2. Anthropic (Claude)

### ✅ 지원 상태: **조건부 지원**

Anthropic은 Usage 및 Cost API를 제공하지만, **Admin API 키**가 필수입니다.

### 엔드포인트

#### 2.1 Usage Report API (사용량 조회)
```
GET https://api.anthropic.com/v1/organizations/usage_report/messages
```

#### 2.2 Cost Report API (비용 조회)
```
GET https://api.anthropic.com/v1/organizations/cost_report
```

### 인증 방법
```bash
curl "https://api.anthropic.com/v1/organizations/cost_report" \
  -H "anthropic-version: 2023-06-01" \
  -H "x-api-key: $ADMIN_API_KEY"
```

### ⚠️ 중요 제한사항

1. **Admin API 키 필수**
   - 일반 API 키(`sk-ant-api...`)로는 조회 불가
   - Admin 키(`sk-ant-admin...`)만 사용 가능

2. **조직 계정 필수**
   - 개인 계정에서는 Admin API 사용 불가
   - Console → Settings → Organization에서 조직 설정 필요

3. **Admin 권한 필요**
   - 조직 내 Admin 역할을 가진 사용자만 키 생성 가능

### 쿼리 매개변수
| 매개변수 | 설명 | 예시 |
|---------|------|------|
| `starting_at` | 시작 시간 (ISO 8601) | `2025-01-01T00:00:00Z` |
| `ending_at` | 종료 시간 (ISO 8601) | `2025-01-31T23:59:59Z` |
| `bucket_width` | 집계 간격 | `1m`, `1h`, `1d` |
| `group_by[]` | 그룹화 기준 | `model`, `workspace`, `service_tier` |
| `models[]` | 모델 필터링 | `claude-3-opus-20240229` |

### 특징
- 비용은 USD 센트 단위로 반환
- 데이터는 API 요청 완료 후 약 5분 내 반영
- 분당 1회 폴링 권장
- Priority Tier 비용은 별도 추적 필요

### 참고 링크
- [Anthropic Usage and Cost API 문서](https://platform.claude.com/docs/en/build-with-claude/usage-cost-api)
- [Anthropic 가격 정책](https://docs.claude.com/en/docs/about-claude/pricing)

---

## 3. xAI (Grok)

### ⚠️ 지원 상태: **제한적 지원**

xAI는 현재 **프로그래매틱 비용 조회 API를 제공하지 않습니다**.

### 현재 가능한 방법

#### 3.1 콘솔 대시보드
- **URL**: [console.x.ai](https://console.x.ai)
- Usage Explorer에서 수동으로 확인
- 토큰 소비량, 요청 패턴, 비용 모니터링

#### 3.2 빌링 관리
- Manage Billing 섹션에서 청구 내역 확인
- 선불 크레딧 또는 월별 청구 방식 선택

### API로 가능한 것
```python
# xAI API는 OpenAI SDK와 호환됩니다
from openai import OpenAI

client = OpenAI(
    api_key="xai-...",
    base_url="https://api.x.ai/v1"
)

# ❌ 비용/사용량 조회 엔드포인트는 없음
# ✅ Chat, Completions 등 일반 API만 지원
```

### 대안적 비용 추적 방법
1. **응답에서 토큰 수 추출**: API 응답의 `usage` 필드 활용
2. **자체 로깅 시스템 구축**: 요청별 토큰 수를 DB에 저장
3. **타사 모니터링 도구 사용**: LangFuse, Helicone 등

### 가격 정보 (2025년 12월 기준)
| 모델 | 입력 토큰 | 출력 토큰 |
|-----|----------|----------|
| Grok-4 | $3.00/1M | $15.00/1M |
| Grok-4-Fast | $0.20/1M | $0.50/1M |
| 도구 사용 (검색 등) | $5.00/1K 호출 | - |

### 참고 링크
- [xAI API 문서](https://docs.x.ai/docs/models)
- [xAI Console](https://console.x.ai)

---

## 4. Google Gemini

### ⚠️ 지원 상태: **제한적 지원 (GCP 통합)**

Google Gemini는 직접적인 비용 조회 API가 없으며, **Google Cloud Billing API**를 통해 간접적으로 조회해야 합니다.

### 현재 가능한 방법

#### 4.1 Firebase Console (Gemini Developer API)
- Usage and Billing 대시보드
- Blaze 요금제 필요

#### 4.2 Google Cloud Console (Vertex AI)
- Cloud Billing Reports
- FinOps Hub

#### 4.3 Cloud Billing API (프로그래매틱)
```bash
# GCP Cloud Billing API를 통한 비용 조회
# Gemini API만 별도 필터링 필요

# 전제조건: GCP 프로젝트 + 서비스 계정 키 필요
gcloud billing projects describe $PROJECT_ID \
  --billing-account=$BILLING_ACCOUNT_ID
```

### ⚠️ 중요 제한사항

1. **GCP 설정 필수**
   - Cloud Billing 활성화 필요
   - 서비스 계정 및 적절한 IAM 권한 필요

2. **직접 API 없음**
   - Gemini API 자체에 비용 조회 엔드포인트 없음
   - Cloud Billing API는 전체 GCP 비용 조회용

3. **복잡한 설정**
   - 단순 API 키로는 조회 불가
   - OAuth 2.0 또는 서비스 계정 인증 필요

### 토큰 수 조회 (비용 추정용)
```python
import google.generativeai as genai

genai.configure(api_key="YOUR_API_KEY")
model = genai.GenerativeModel("gemini-1.5-flash")

# 토큰 수 카운트 (무료, 할당량 미차감)
response = model.count_tokens("Hello, world!")
print(f"Token count: {response.total_tokens}")
```

### 대안적 비용 추적 방법
1. **count_tokens() 메서드**: 요청 전 토큰 수 예측
2. **응답 메타데이터**: `usage_metadata`에서 토큰 정보 추출
3. **GCP Cost Management**: BigQuery 내보내기로 상세 분석
4. **타사 도구**: CostGoat, CloudZero 등

### 가격 정보 (2025년 12월 기준)
| 모델 | 입력 토큰 | 출력 토큰 | 비고 |
|-----|----------|----------|------|
| Gemini 1.5 Flash | $0.075/1M | $0.30/1M | 무료 티어 있음 |
| Gemini 1.5 Pro | $1.25/1M | $5.00/1M | 128K 컨텍스트까지 |
| Gemini 2.0 Flash | $0.10/1M | $0.40/1M | - |

### 참고 링크
- [Gemini API Billing 문서](https://ai.google.dev/gemini-api/docs/billing)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Firebase 모니터링](https://firebase.google.com/docs/vertex-ai/monitoring)

---

## 🔍 결론 및 권장사항

### 핵심 발견: 4개 프로바이더 모두 "일반 API 키"로는 비용 조회 불가

| 프로바이더 | 비용 조회 방법 | 난이도 |
|-----------|--------------|--------|
| **OpenAI** | Admin Key 발급 필요 | 중 (조직 Admin 권한) |
| **Anthropic** | Admin Key 발급 + 조직 계정 필요 | 중상 |
| **xAI** | 콘솔에서만 수동 확인 | - (API 없음) |
| **Gemini** | GCP Cloud Billing 설정 필요 | 상 (복잡한 설정) |

### 프로그래매틱 비용 추적이 어려운 경우 대안

1. **자체 로깅 시스템 구축**
   - 모든 API 요청/응답의 토큰 수를 저장
   - 가격표 기반으로 비용 계산

2. **프록시 서버 활용**
   - LiteLLM, Portkey 등 프록시를 통해 통합 관리
   - 모든 요청을 중앙에서 로깅

3. **타사 모니터링 도구**
   - [LangFuse](https://langfuse.com)
   - [Helicone](https://helicone.ai)
   - [CostGoat](https://costgoat.com)

---

## 📚 참고 자료

- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [Anthropic Pricing](https://www.anthropic.com/pricing)
- [xAI API](https://x.ai/api/)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [LLM API Pricing Comparison 2025](https://intuitionlabs.ai/articles/llm-api-pricing-comparison-2025)
