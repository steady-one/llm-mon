# LLM API 사용 방식 가이드

## 사용 방식 분류

| 방식               | 설명                                         | 장점                            | 단점                     |
| ------------------ | -------------------------------------------- | ------------------------------- | ------------------------ |
| **HTTP 직접 호출** | curl, fetch, axios 등으로 REST API 직접 호출 | 의존성 없음, 언어 무관          | 인증/에러 처리 직접 구현 |
| **공식 SDK**       | 각 제공자의 공식 라이브러리 사용             | 타입 지원, 편리한 인터페이스    | 제공자별 SDK 학습 필요   |
| **통합 SDK**       | LiteLLM 등 멀티 프로바이더 SDK               | 단일 인터페이스로 여러 LLM 사용 | 추가 의존성              |
| **게이트웨이**     | OpenRouter 등 프록시 서비스                  | 단일 API 키, failover           | 추가 비용/지연           |

---

## 1. HTTP 직접 호출 (curl/fetch)

### OpenAI

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Anthropic (Claude)

```bash
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

````

### 인증 헤더 비교

| 제공자 | 인증 헤더 |
|--------|-----------|
| OpenAI | `Authorization: Bearer $KEY` |
| Anthropic | `x-api-key: $KEY` + `anthropic-version: 2023-06-01` |
| Google Gemini | `?key=$KEY` (쿼리 파라미터) |
| Mistral | `Authorization: Bearer $KEY` |
| Cohere | `Authorization: Bearer $KEY` |

---

## 2. 공식 SDK

### OpenAI (Python)
```bash
pip install openai
````

```python
from openai import OpenAI
client = OpenAI()  # OPENAI_API_KEY 환경변수 자동 로드

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

### Anthropic (Python)

```bash
pip install anthropic
```

```python
import anthropic
client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 환경변수 자동 로드

message = client.messages.create(
    model="claude-opus-4-5-20251101",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
print(message.content[0].text)
```

### Google Gemini (Python)

```bash
pip install google-generativeai
```

```python
import google.generativeai as genai
import os

genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
model = genai.GenerativeModel('gemini-2.5-flash')
response = model.generate_content("Hello!")
print(response.text)
```

### Mistral AI (Python)

```bash
pip install mistralai
```

```python
from mistralai import Mistral
import os

client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
response = client.chat.complete(
    model="mistral-large-latest",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

### Cohere (Python)

```bash
pip install cohere
```

```python
import cohere
co = cohere.ClientV2(api_key="your-api-key")

response = co.chat(
    model="command-r-plus",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

---

## 3. 통합 SDK (LiteLLM)

단일 인터페이스로 100+ LLM 호출

```bash
pip install litellm
```

```python
from litellm import completion

# OpenAI
response = completion(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)

# Anthropic
response = completion(
    model="claude-opus-4-5-20251101",
    messages=[{"role": "user", "content": "Hello!"}]
)

# AWS Bedrock
response = completion(
    model="bedrock/anthropic.claude-v2",
    messages=[{"role": "user", "content": "Hello!"}]
)

# Mistral
response = completion(
    model="mistral/mistral-large-latest",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### LiteLLM 프록시 서버

```bash
pip install 'litellm[proxy]'
litellm --model gpt-4 --api_key sk-...
# http://localhost:4000 에서 OpenAI 호환 API 제공
```

---

## 4. 게이트웨이 (OpenRouter)

단일 API 키로 300+ 모델 접근, OpenAI SDK 호환

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)

# Claude 사용
response = client.chat.completions.create(
    model="anthropic/claude-opus-4-5",
    messages=[{"role": "user", "content": "Hello!"}]
)

# GPT-4 사용
response = client.chat.completions.create(
    model="openai/gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)

# 자동 라우팅
response = client.chat.completions.create(
    model="openrouter/auto",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

---

## 방식별 선택 가이드

| 상황                          | 권장 방식            |
| ----------------------------- | -------------------- |
| 빠른 테스트, 스크립트         | HTTP 직접 호출       |
| 단일 제공자 프로덕션          | 공식 SDK             |
| 멀티 제공자, 비용 최적화      | LiteLLM / OpenRouter |
| 프라이버시, 오프라인          | 로컬 LLM (Ollama)    |
| 기존 OpenAI 코드 마이그레이션 | OpenRouter / LiteLLM |

---

## 환경 변수 요약

```bash
# 각 제공자별
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="..."
export MISTRAL_API_KEY="..."
export HF_TOKEN="hf_..."

# 게이트웨이
export OPENROUTER_API_KEY="sk-or-..."
```

---

_전체 가이드: [LLM*API_KEY*사용\_가이드\_2025.md](./LLM_API_KEY_사용_가이드_2025.md)_
