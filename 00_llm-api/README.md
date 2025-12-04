# LLM Billing Monitor MVP

OpenAI Usage API를 연동하여 LLM 사용량과 비용을 모니터링하는 대시보드입니다.

## 기능

- **대시보드**: 총 비용, 토큰 사용량, 일별 추이 차트, 모델별 분석
- **설정**: OpenAI API Key 등록/관리
- **데이터 동기화**: OpenAI Usage API를 통한 30일치 사용량 수집

## 기술 스택

| 항목 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Database | SQLite + Prisma |
| UI | Tailwind CSS |
| 차트 | Recharts |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 데이터베이스 설정

```bash
npx prisma migrate dev
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 사용 방법

1. `/settings` 페이지에서 OpenAI API Key 등록
2. 메인 대시보드(`/`)에서 "데이터 동기화" 버튼 클릭
3. 사용량 데이터 확인

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── settings/    # API Key 관리 API
│   │   ├── sync/        # OpenAI 데이터 동기화 API
│   │   └── usage/       # 사용량 조회 API
│   ├── settings/        # 설정 페이지
│   ├── layout.tsx       # 루트 레이아웃
│   └── page.tsx         # 대시보드 메인
├── components/
│   └── dashboard/       # 대시보드 컴포넌트
├── lib/
│   ├── db.ts            # Prisma 클라이언트
│   ├── openai.ts        # OpenAI API 연동
│   └── utils.ts         # 유틸리티 함수
└── types/
    └── index.ts         # 타입 정의
```

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/settings` | 저장된 설정 조회 |
| POST | `/api/settings` | API Key 저장 |
| DELETE | `/api/settings?provider=openai` | API Key 삭제 |
| POST | `/api/sync` | OpenAI 사용량 동기화 |
| GET | `/api/usage?days=30` | 사용량 데이터 조회 |

## 주의사항

- OpenAI Usage API는 **Organization Admin** 권한이 필요합니다
- 일반 API Key로는 Usage API 접근이 불가할 수 있습니다
- API Key는 서버에만 저장되며 클라이언트에 노출되지 않습니다

## 환경 변수

`.env` 파일에 다음 변수가 필요합니다:

```env
DATABASE_URL="file:./dev.db"
```

## 라이선스

MIT
