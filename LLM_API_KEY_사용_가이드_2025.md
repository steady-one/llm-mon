# LLM API Key 사용 완벽 가이드 (2025년 12월)

## 목차
1. [개요](#개요)
2. [주요 LLM API 제공자별 설정](#주요-llm-api-제공자별-설정)
   - [OpenAI](#1-openai)
   - [Anthropic (Claude)](#2-anthropic-claude)
   - [Google Gemini](#3-google-gemini)
   - [AWS Bedrock](#4-aws-bedrock)
   - [Mistral AI](#5-mistral-ai)
   - [Cohere](#6-cohere)
   - [Hugging Face](#7-hugging-face)
3. [멀티 프로바이더 게이트웨이](#멀티-프로바이더-게이트웨이)
4. [로컬 LLM API](#로컬-llm-api)
5. [API 키 관리 방법](#api-키-관리-방법)
6. [보안 모범 사례](#보안-모범-사례)
7. [비용 및 사용량 관리](#비용-및-사용량-관리)

---

## 개요

2025년 현재, LLM(Large Language Model) API를 사용하는 방법은 크게 다음과 같이 분류됩니다:

| 분류 | 설명 | 예시 |
|------|------|------|
| **직접 API 호출** | 각 제공자의 API를 직접 사용 | OpenAI, Anthropic, Google 등 |
| **멀티 프로바이더 게이트웨이** | 단일 인터페이스로 여러 LLM 접근 | OpenRouter, LiteLLM |
| **클라우드 플랫폼** | 클라우드 인프라 통합 | AWS Bedrock, Azure OpenAI |
| **로컬 LLM** | 자체 서버에서 모델 실행 | Ollama, LM Studio |

---

## 주요 LLM API 제공자별 설정

### 1. OpenAI

#### API 키 발급
1. [platform.openai.com](https://platform.openai.com)에서 계정 생성
2. API Keys 섹션에서 키 생성
3. 프로젝트별로 키를 분리하여 관리

#### API 키 유형 (2025년)
| 유형 | 설명 | 용도 |
|------|------|------|
| **User-bound Keys** | 사용자에게 바인딩된 키 | 로컬 개발, 개인 실험 |
| **Service Account Keys** | 프로젝트에 속한 봇 ID | 프로덕션, CI/CD |

#### 권한 레벨
- **All**: 전체 API 접근 (기본값)
- **Read Only**: 읽기 전용
- **Restricted**: 엔드포인트별 세밀한 권한 설정

#### 사용 예시
```bash
# 환경 변수 설정
export OPENAI_API_KEY="sk-..."

# curl 요청
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

```python
# Python SDK
from openai import OpenAI
client = OpenAI()  # 환경 변수에서 자동 로드
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

> **참고**: [OpenAI Authentication 공식 문서](https://platform.openai.com/docs/api-reference/authentication)

---

### 2. Anthropic (Claude)

#### API 키 발급
1. [console.anthropic.com](https://console.anthropic.com)에서 계정 생성
2. API Keys 탭에서 "+Create Key" 클릭
3. 키 이름 지정 (예: "Production Backend", "Testing Environment")
4. 권한 및 워크스페이스 설정

#### 주의사항
- 키는 **생성 시 한 번만** 표시됨
- 분실 시 새 키 생성 필요

#### 사용 예시
```bash
# 환경 변수 설정
export ANTHROPIC_API_KEY="sk-ant-..."

# curl 요청
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-opus-4-5-20251101",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

```python
# Python SDK
import anthropic
client = anthropic.Anthropic()  # 환경 변수에서 자동 로드
message = client.messages.create(
    model="claude-opus-4-5-20251101",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
```

> **참고**: [Anthropic 공식 가이드](https://docs.anthropic.com/en/api/admin-api/apikeys/get-api-key)

---

### 3. Google Gemini

#### API 키 발급
1. [aistudio.google.com](https://aistudio.google.com)에서 Google 계정으로 로그인
2. "Get API Key" 버튼 클릭
3. 기존 프로젝트 선택 또는 새 프로젝트 생성

#### 환경 변수
```bash
# 두 가지 환경 변수 지원 (GOOGLE_API_KEY 우선)
export GEMINI_API_KEY="..."
# 또는
export GOOGLE_API_KEY="..."
```

#### 사용 예시
```python
import google.generativeai as genai

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel('gemini-2.5-flash')
response = model.generate_content("Hello!")
```

#### 2025년 주요 변경사항
- **2025년 4월 29일 이후**: 새 프로젝트는 Gemini 1.5 Pro/Flash 접근 불가, 2.0/2.5 버전으로 이전 권장
- **프로덕션 환경**: Google Cloud Platform의 Vertex AI 사용 권장

> **참고**: [Google AI for Developers](https://ai.google.dev/gemini-api/docs/api-key)

---

### 4. AWS Bedrock

#### 인증 방식 (2025년)
| 방식 | 설명 | 유효기간 |
|------|------|----------|
| **단기 API 키** | AWS Signature V4로 서명된 사전 서명 URL | 최대 12시간 |
| **장기 API 키** | IAM 사용자와 연결된 서비스별 자격 증명 | 1~36,600일 (설정 가능) |
| **임시 보안 자격 증명** | IAM 역할 기반 | 세션 기간 |

#### 장기 API 키 생성 (2025년 7월 출시)
```bash
# AWS CLI로 장기 API 키 생성
aws bedrock create-model-invocation-job ...
```

#### 사용 예시
```python
# boto3 사용 (기존 방식)
import boto3
client = boto3.client('bedrock-runtime', region_name='us-east-1')

# API 키 사용 (2025년 신규)
import requests
headers = {"Authorization": f"Bearer {BEDROCK_API_KEY}"}
response = requests.post(endpoint, headers=headers, json=payload)
```

#### 제한사항
- Bedrock API 키는 Agents for Amazon Bedrock 또는 Data Automation API에서 사용 불가
- 프로덕션에서는 단기 API 키 또는 임시 자격 증명 권장

> **참고**: [AWS Bedrock API Keys 문서](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html)

---

### 5. Mistral AI

#### API 키 발급
1. [console.mistral.ai](https://console.mistral.ai)에서 계정 생성
2. [admin.mistral.ai](https://admin.mistral.ai)에서 결제 설정
3. Workspace > API keys에서 "Create new key" 클릭

#### 요금제
| 요금제 | 설명 |
|--------|------|
| **Experiment** | 무료 실험 티어 |
| **Scale** | 종량제 |

#### 사용 예시
```bash
export MISTRAL_API_KEY="..."

curl https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer $MISTRAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral-large-latest",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

```python
from mistralai import Mistral
client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
response = client.chat.complete(
    model="mistral-large-latest",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

> **참고**: [Mistral AI Quickstart](https://docs.mistral.ai/getting-started/quickstart)

---

### 6. Cohere

#### API 키 유형
| 유형 | 설명 |
|------|------|
| **Trial Key** | 무료, 사용량 제한 |
| **Production Key** | 유료, 높은 한도 |

#### API 키 발급
1. [dashboard.cohere.com](https://dashboard.cohere.com)에서 로그인
2. API Keys 섹션에서 "New Trial Key" 또는 "New Production Key" 클릭

#### 사용 예시
```python
import cohere
co = cohere.ClientV2(api_key="your-api-key")

response = co.chat(
    model="command-r-plus",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

> **참고**: [Cohere 공식 문서](https://docs.cohere.com/)

---

### 7. Hugging Face

#### Access Token 유형
| 유형 | 설명 | 용도 |
|------|------|------|
| **Fine-grained** | 특정 리소스에 대한 세밀한 접근 권한 | 프로덕션 |
| **Read** | 읽기 전용 접근 | 모델 다운로드 |
| **Write** | 읽기/쓰기 접근 | 모델 업로드 |

#### 토큰 발급
1. [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)에서 "New token" 클릭
2. 역할(Role) 선택 및 이름 지정

#### 인증 방법
```bash
# 환경 변수
export HF_TOKEN="hf_..."

# CLI 로그인
huggingface-cli login

# 또는 Python에서
from huggingface_hub import login
login()
```

```python
# Inference API 사용
from huggingface_hub import InferenceClient
client = InferenceClient(token=os.environ["HF_TOKEN"])
response = client.text_generation("Hello!", model="meta-llama/Llama-3-8b-hf")
```

> **참고**: [Hugging Face User Access Tokens](https://huggingface.co/docs/hub/en/security-tokens)

---

## 멀티 프로바이더 게이트웨이

### OpenRouter

단일 API 키로 300개 이상의 모델에 접근 가능한 통합 게이트웨이

#### 특징
- **OpenAI 호환 API**: 기존 OpenAI SDK 코드 그대로 사용 가능
- **자동 라우팅**: `openrouter/auto` 모델로 최적 모델 자동 선택
- **Failover**: 제공자 장애 시 자동 대체
- **BYOK**: 자체 API 키 사용 가능 (5% 수수료)
- **추가 지연**: ~25-40ms

#### 사용 예시
```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)

response = client.chat.completions.create(
    model="anthropic/claude-opus-4-5",  # 또는 openai/gpt-4 등
    messages=[{"role": "user", "content": "Hello!"}]
)
```

> **참고**: [OpenRouter](https://openrouter.ai)

---

### LiteLLM

100개 이상의 LLM API를 OpenAI 형식으로 호출할 수 있는 Python SDK 및 프록시 서버

#### 특징
- **통합 인터페이스**: 모든 제공자를 OpenAI 형식으로 호출
- **예산/속도 제한**: 프로젝트, API 키, 모델별 설정
- **비용 추적**: 자동 토큰 사용량 및 비용 계산
- **시크릿 매니저 통합**: HashiCorp Vault, AWS Secrets Manager 등

#### 프록시 서버 실행
```bash
pip install 'litellm[proxy]'
litellm --model gpt-4 --api_key sk-...
```

#### 사용 예시
```python
from litellm import completion

# OpenAI
response = completion(model="gpt-4", messages=[...])

# Anthropic
response = completion(model="claude-opus-4-5-20251101", messages=[...])

# AWS Bedrock
response = completion(model="bedrock/anthropic.claude-v2", messages=[...])
```

> **참고**: [LiteLLM 문서](https://docs.litellm.ai/)

---

### 기타 게이트웨이 도구

| 도구 | 특징 |
|------|------|
| **Kong AI Gateway** | 성숙한 API 관리 플랫폼 기반 |
| **Apache APISIX** | 다중 제공자 지원, 토큰 속도 제한, 프롬프트 필터링 |
| **Portkey** | 캐싱, 관찰성, 속도 제한 |
| **Helicone** | 분석 및 모니터링 특화 |
| **TrueFoundry** | 엔터프라이즈 AI 인프라 |

---

## 로컬 LLM API

### Ollama

CLI 기반의 경량 로컬 LLM 실행 도구

#### 설치 및 사용
```bash
# 설치
curl -fsSL https://ollama.com/install.sh | sh

# 모델 다운로드
ollama pull llama3.2

# 모델 실행
ollama run llama3.2

# API 서버 (기본 포트: 11434)
curl http://localhost:11434/api/generate \
  -d '{"model": "llama3.2", "prompt": "Hello!"}'
```

#### OpenAI 호환 API
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # 아무 값이나 가능
)

response = client.chat.completions.create(
    model="llama3.2",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

> **참고**: [Ollama 공식 사이트](https://ollama.com)

---

### LM Studio

GUI 기반 로컬 LLM 실행 애플리케이션

#### 특징
- 사용자 친화적인 그래픽 인터페이스
- 모델 다운로드 및 관리 내장
- OpenAI 호환 로컬 API 서버

#### API 서버 실행
1. Developer 탭으로 이동
2. 모델 선택
3. "Start Server" 토글

```python
# 기본 주소: http://localhost:1234/v1
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:1234/v1",
    api_key="lm-studio",
)
```

> **참고**: [LM Studio](https://lmstudio.ai/)

---

## API 키 관리 방법

### 1. 환경 변수

가장 기본적인 방법

```bash
# .bashrc 또는 .zshrc에 추가
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

```python
import os
api_key = os.environ.get("OPENAI_API_KEY")
```

**장점**: 간단함
**단점**: 보안 취약, 여러 환경 관리 어려움

---

### 2. .env 파일

```bash
# .env 파일
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

```python
from dotenv import load_dotenv
load_dotenv()
```

**주의**: `.gitignore`에 `.env` 반드시 추가!

---

### 3. 시크릿 매니저

프로덕션 환경에서 권장

| 서비스 | 제공자 |
|--------|--------|
| AWS Secrets Manager | AWS |
| Google Secret Manager | GCP |
| Azure Key Vault | Azure |
| HashiCorp Vault | 멀티 클라우드 |

```python
# AWS Secrets Manager 예시
import boto3
import json

def get_secret(secret_name):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

secrets = get_secret("llm-api-keys")
openai_key = secrets["OPENAI_API_KEY"]
```

---

### 4. LLM Key Server

엔터프라이즈 환경에서의 중앙 집중식 키 관리

**특징**:
- OIDC 토큰 검증
- 단기 API 키 발급
- 사용량 추적 및 감사

> **참고**: [Mercari LLM Key Server](https://engineering.mercari.com/en/blog/entry/20251202-llm-key-server/)

---

## 보안 모범 사례

### 필수 사항

| 항목 | 설명 |
|------|------|
| **하드코딩 금지** | 코드에 API 키 직접 작성 금지 |
| **클라이언트 사이드 노출 금지** | 프론트엔드 코드에 키 포함 금지 |
| **버전 관리 제외** | `.gitignore`에 `.env` 추가 |
| **정기 교체** | API 키 주기적 갱신 |
| **최소 권한 원칙** | 필요한 권한만 부여 |

### 권장 사항

```yaml
# 보안 설정 체크리스트
키_저장:
  - 시크릿 매니저 사용
  - 환경 변수 (개발용)
  - 절대 하드코딩 금지

접근_제어:
  - IP/도메인 제한 설정
  - 사용량 할당량 설정
  - API 키별 권한 분리

모니터링:
  - 사용량 대시보드 활용
  - 이상 징후 알림 설정
  - 로그 감사

키_수명_주기:
  - 단기 토큰 선호 (분 단위)
  - 장기 키는 만료일 설정
  - 자동 교체 CI/CD 통합
```

### 유출 시 대응

1. **즉시 키 비활성화**
2. **새 키 생성**
3. **사용 로그 확인** (비정상 사용량)
4. **영향 범위 파악**
5. **제공자에 신고** (필요시)

> **경고**: GitHub에서 노출된 API 키를 스캔하는 봇은 CI/CD 파이프라인보다 빠릅니다. 한 사례에서는 $150,000의 청구서가 발생했습니다.

---

## 비용 및 사용량 관리

### 비용 최적화 전략

| 전략 | 설명 |
|------|------|
| **컨텍스트 캐싱** | 반복 입력 토큰 캐시 (Gemini, Claude 지원) |
| **모델 선택** | 작업 복잡도에 맞는 모델 사용 |
| **토큰 최적화** | 프롬프트 압축, 불필요한 컨텍스트 제거 |
| **멀티 프로바이더** | 작업별 최적 제공자 라우팅 |

### 속도 제한 관리

```python
import time
from tenacity import retry, wait_exponential, stop_after_attempt

@retry(wait=wait_exponential(min=1, max=60), stop=stop_after_attempt(5))
def call_api_with_retry(prompt):
    return client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
```

### 모니터링 도구

| 도구 | 기능 |
|------|------|
| **제공자 대시보드** | 기본 사용량 추적 |
| **LiteLLM** | 멀티 제공자 비용 추적 |
| **Helicone** | 상세 분석 및 알림 |
| **Langfuse** | 관찰성 및 비용 추적 |

### 예산 설정

```python
# LiteLLM 예산 설정 예시
litellm.set_callbacks([
    BudgetManager(
        project_name="my-project",
        budget_limit=100.0,  # $100/월
        duration="monthly"
    )
])
```

---

## 요약: 2025년 권장 설정

### 개발 환경
```
1. 환경 변수 또는 .env 파일로 키 관리
2. 각 제공자의 Trial/Free tier 활용
3. Ollama/LM Studio로 로컬 테스트
```

### 프로덕션 환경
```
1. 시크릿 매니저 (Vault, AWS Secrets Manager 등)
2. LiteLLM 또는 OpenRouter로 멀티 프로바이더 관리
3. 단기 토큰 + 자동 교체
4. 비용 모니터링 및 알림 설정
```

### 엔터프라이즈 환경
```
1. Workload Identity (GCP) 또는 Managed Identity (Azure)
2. LLM Key Server 구축
3. 중앙 집중식 감사 로깅
4. 제로 트러스트 아키텍처
```

---

## 참고 자료

### 공식 문서
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic Claude Docs](https://docs.anthropic.com)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [AWS Bedrock](https://docs.aws.amazon.com/bedrock/)
- [Mistral AI Docs](https://docs.mistral.ai)
- [Cohere Documentation](https://docs.cohere.com)
- [Hugging Face Hub](https://huggingface.co/docs/hub)

### 게이트웨이 및 도구
- [LiteLLM](https://docs.litellm.ai)
- [OpenRouter](https://openrouter.ai)
- [Ollama](https://ollama.com)
- [LM Studio](https://lmstudio.ai)

### 보안 및 관리
- [Mercari LLM Key Server](https://engineering.mercari.com/en/blog/entry/20251202-llm-key-server/)
- [HashiCorp Vault](https://developer.hashicorp.com/vault)
- [Best LLM Gateways 2025](https://www.pomerium.com/blog/best-llm-gateways-in-2025)

---

*마지막 업데이트: 2025년 12월*
