# 🌊 Trendiv (트렌디브)

> **AI 기반 글로벌 웹/모바일 개발 트렌드 뉴스레터 서비스**
>
> "매일 쏟아지는 기술 뉴스, Gemini 2.5 Flash가 읽고 핵심만 골라드립니다."

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-20.x-green.svg)](https://nodejs.org/)
[![Docker Build](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)

Trendiv는 전 세계 주요 기술 블로그와 커뮤니티(RSS/HTML)를 수집하고, AI가 이를 심층 분석하여 프론트엔드 및 모바일 개발자에게 꼭 필요한 정보만을 선별해 제공하는 자동화 파이프라인 시스템입니다.

## 🌟 핵심 기능 (Core Features)

- **🤖 하이브리드 수집 엔진 (Hybrid Scraper):**
  - RSS 피드와 Playwright(Headless Browser)를 결합하여 차단 우회 및 안정적 수집.
  - Axios 헤더 조작을 통한 정교한 크롤링.
- **🧠 AI 심층 분석 & 윤리적 필터링 (Deep Dive Analysis):**
  - Google Gemini 2.5 Flash가 원문 링크를 직접 방문하여 내용을 읽고(Deep Dive), 개발자 관점에서 가치를 평가(Scoring)합니다.
  - **AI 윤리 준수:** 단순 광고, 스팸, 무관한 글은 AI 비평가 모드가 0점 처리하여 자동 필터링합니다.
- **📧 개인화된 뉴스레터 (Personalized Newsletter):**
  - MJML 기반의 반응형 다크 모드 템플릿 자동 생성.
  - (예정) Resend API를 통한 구독자별 맞춤 태그 발송 및 A/B 테스트 지원.
- **🛡️ 데이터 관리 & 보안:**
  - Supabase DB를 통한 중복 방지 및 이력 관리.
  - (예정) 개인정보 보호를 위한 데이터 자동 삭제(Garbage Collection) 및 암호화.

## 🏗️ 아키텍처 (Monorepo Structure)

프로젝트는 기능별로 독립된 모듈로 구성되어 있으며, 도커 컨테이너 하나로 통합 배포됩니다.

| 모듈명                            | 역할                              | 주요 기술                     | 실행                                           |
| :-------------------------------- | :-------------------------------- | :---------------------------- | :--------------------------------------------- |
| **`trendiv-web`**                 | 구독 신청 및 아카이브 (SvelteKit) | SvelteKit, TypeScript, Vite   | `cd trendiv-web && pnpm dev`                   |
| **`trendiv-pipeline-controller`** | 중앙 제어 및 API, 스케줄링        | Node.js, Express, Supabase    | `cd trendiv-pipeline-controller && pnpm start` |
| **`trendiv-scraper-module`**      | 데이터 수집 (크롤러)              | RSS Parser, Playwright, Axios | (Controller가 호출)                            |
| **`trendiv-analysis-module`**     | AI 분석 및 요약                   | Google Gemini SDK, Cheerio    | (Controller가 호출)                            |
| **`trendiv-result-module`**       | 결과물 생성 (HTML)                | MJML, TypeScript              | (Controller가 호출)                            |

## 🚀 시작 가이드 (Getting Started)

### 1. 환경 변수 설정 (.env)

프로젝트 최상위 루트에 `.env` 파일을 생성하세요.

```env
# Supabase (Database)
SUPABASE_URL="your_supabase_url"
SUPABASE_KEY="your_supabase_anon_key"

# Google Gemini (AI Analysis)
GEMINI_API_KEY="your_gemini_api_key"
GEMINI_MODEL="gemini-2.5-flash"

# Server Port
PORT=3000
```

### 2. 설치 및 실행

이 프로젝트는 `pnpm` 패키지 매니저를 권장합니다.

```bash
# 1. 전체 의존성 설치
pnpm install

# 2. 개발 모드 실행 (백엔드)
cd trendiv-pipeline-controller
pnpm start

# 3. 프론트엔드 실행
cd ../trendiv-web
pnpm run dev
```

### 3. 테스트 (Testing)

각 모듈별 단위 테스트를 실행하여 안정성을 검증할 수 있습니다. (예정)

```bash
pnpm test
```

### 4. 배포 (Deployment)

**Docker**를 사용하여 어디서든 동일한 환경으로 실행할 수 있습니다.

```bash
# 이미지 빌드 (멀티스테이지 빌드 최적화 적용 예정)
docker build -t trendiv-backend .

# 컨테이너 실행
docker run -p 3000:3000 --env-file .env trendiv-backend
```

## 🤝 기여하기 (Contributing)

Trendiv는 오픈소스 프로젝트입니다. 이슈 제보와 PR은 언제나 환영합니다!

- 새로운 스크래핑 소스 추가 시 `targets.ts`에 트렌드 점수 기준을 명시해주세요.
- 코드 스타일은 `Prettier`와 `ESLint` 규칙을 준수해주세요.

## 📝 라이선스

MIT License
