# LLM Gateway

통합 API Key로 여러 LLM Provider를 사용할 수 있는 Reseller 방식의 LLM Gateway MVP입니다.

## 기능

- **통합 API Key**: 하나의 API Key로 OpenAI 모델 사용
- **OpenAI 호환 API**: 기존 OpenAI SDK와 100% 호환
- **선불 크레딧 시스템**: 크레딧 충전 후 사용한 만큼 차감
- **사용량 추적**: 실시간 토큰 사용량 및 비용 추적
- **대시보드**: 잔액, API Key, 사용량 관리

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite (Prisma ORM)
- **인증**: iron-session (세션 기반)
- **스타일링**: Tailwind CSS

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 수정하세요:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="your-32-character-or-longer-secret-key-here"
OPENAI_API_KEY="sk-your-openai-api-key"
```

### 3. 데이터베이스 마이그레이션

```bash
npx prisma migrate dev
```

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## API 사용법

### 인증

모든 API 요청에는 `Authorization` 헤더가 필요합니다:

```
Authorization: Bearer llm_sk_your_api_key
```

### Chat Completions

```bash
curl http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer llm_sk_your_api_key" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    api_key="llm_sk_your_api_key",
    base_url="http://localhost:3000/api/v1"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

### JavaScript/TypeScript

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'llm_sk_your_api_key',
  baseURL: 'http://localhost:3000/api/v1',
});

const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(response.choices[0].message.content);
```

## 지원 모델

| 모델 | 입력 (1M tokens) | 출력 (1M tokens) |
|------|------------------|------------------|
| gpt-4o | $3.00 | $12.00 |
| gpt-4o-mini | $0.18 | $0.72 |
| gpt-4-turbo | $12.00 | $36.00 |
| gpt-4 | $36.00 | $72.00 |
| gpt-3.5-turbo | $0.60 | $1.80 |

*가격은 Provider 원가 + 20% 마진이 적용됩니다.*

## 프로젝트 구조

```
llm-gateway/
├── prisma/
│   └── schema.prisma         # 데이터베이스 스키마
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/         # 인증 API
│   │   │   ├── balance/      # 잔액 API
│   │   │   ├── keys/         # API Key 관리
│   │   │   ├── usage/        # 사용량 조회
│   │   │   └── v1/chat/completions/  # LLM Gateway API
│   │   ├── auth/             # 로그인/회원가입 페이지
│   │   └── dashboard/        # 대시보드 페이지
│   ├── lib/
│   │   ├── api-key.ts        # API Key 생성/검증
│   │   ├── billing.ts        # 비용 계산
│   │   ├── openai.ts         # OpenAI API 클라이언트
│   │   ├── prisma.ts         # Prisma 클라이언트
│   │   └── session.ts        # 세션 관리
│   └── middleware.ts         # 인증 미들웨어
└── .env                      # 환경 변수
```

## API 엔드포인트

### 인증
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/signin` - 로그인
- `POST /api/auth/signout` - 로그아웃
- `GET /api/auth/me` - 현재 사용자 정보

### API Key 관리
- `GET /api/keys` - API Key 목록
- `POST /api/keys` - API Key 생성
- `DELETE /api/keys/[id]` - API Key 삭제

### 잔액
- `GET /api/balance` - 잔액 조회
- `POST /api/balance/charge` - 크레딧 충전

### 사용량
- `GET /api/usage` - 사용량 조회

### LLM Gateway
- `POST /api/v1/chat/completions` - Chat Completions (OpenAI 호환)

## 향후 확장 계획

- [ ] Anthropic (Claude) 모델 지원
- [ ] Google (Gemini) 모델 지원
- [ ] 스트리밍 응답 지원
- [ ] Stripe 결제 연동
- [ ] 할당량 설정
- [ ] 이메일 알림

## 라이선스

MIT
