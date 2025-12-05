# LLM API Key 퀵 가이드

## 주요 제공자별 설정

| 제공자 | 환경 변수 | API 키 발급 |
|--------|-----------|-------------|
| OpenAI | `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) |
| Anthropic | `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| Google Gemini | `GOOGLE_API_KEY` | [aistudio.google.com](https://aistudio.google.com) |
| Mistral AI | `MISTRAL_API_KEY` | [console.mistral.ai](https://console.mistral.ai) |
| Cohere | `COHERE_API_KEY` | [dashboard.cohere.com](https://dashboard.cohere.com) |
| Hugging Face | `HF_TOKEN` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |

---

## 빠른 시작 예시

### OpenAI
```python
from openai import OpenAI
client = OpenAI()  # 환경 변수에서 자동 로드
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### Anthropic (Claude)
```python
import anthropic
client = anthropic.Anthropic()
message = client.messages.create(
    model="claude-opus-4-5-20251101",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### Google Gemini
```python
import google.generativeai as genai
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
model = genai.GenerativeModel('gemini-2.5-flash')
response = model.generate_content("Hello!")
```

---

## 멀티 프로바이더 게이트웨이

| 도구 | 특징 |
|------|------|
| **OpenRouter** | 단일 API 키로 300+ 모델 접근, OpenAI 호환 |
| **LiteLLM** | 100+ LLM 통합, 비용 추적, 프록시 서버 |

```python
# OpenRouter 예시
from openai import OpenAI
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)
```

---

## 로컬 LLM

| 도구 | 특징 |
|------|------|
| **Ollama** | CLI 기반, 경량, 무료 |
| **LM Studio** | GUI 기반, 사용자 친화적 |

```bash
# Ollama 설치 및 실행
ollama pull llama3.2
ollama run llama3.2
```

---

## API 키 관리

### 개발 환경
```bash
# .env 파일 사용
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```
> `.gitignore`에 `.env` 반드시 추가!

### 프로덕션 환경
- AWS Secrets Manager
- Google Secret Manager
- HashiCorp Vault

---

## 보안 체크리스트

- [ ] 코드에 API 키 하드코딩 금지
- [ ] 프론트엔드에 키 노출 금지
- [ ] `.gitignore`에 `.env` 추가
- [ ] API 키 정기 교체
- [ ] 최소 권한 원칙 적용
- [ ] 사용량 모니터링 설정

### 키 유출 시 대응
1. 즉시 키 비활성화
2. 새 키 생성
3. 사용 로그 확인

---

## 참고 링크

- [OpenAI Docs](https://platform.openai.com/docs)
- [Anthropic Docs](https://docs.anthropic.com)
- [LiteLLM](https://docs.litellm.ai)
- [OpenRouter](https://openrouter.ai)
- [Ollama](https://ollama.com)

---

*전체 가이드: [LLM_API_KEY_사용_가이드_2025.md](./LLM_API_KEY_사용_가이드_2025.md)*
