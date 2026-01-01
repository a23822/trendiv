# 🌊 Trendiv (트렌디브)

> **AI 기반 글로벌 웹/모바일 개발 트렌드 뉴스레터 & 아카이브 서비스**
>
> "매일 쏟아지는 기술 뉴스, Gemini 2.5 Flash가 읽고 핵심만 골라드립니다."

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-20.x-green.svg)](https://nodejs.org/)
[![Docker Build](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Deployed on Cloud Run](https://img.shields.io/badge/Backend-Cloud_Run-4285F4.svg)](https://cloud.google.com/run)
[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Frontend-Cloudflare_Pages-F38020.svg)](https://pages.cloudflare.com/)

Trendiv는 전 세계 주요 기술 블로그와 커뮤니티(RSS/HTML)를 수집하고, AI가 이를 심층 분석하여 프론트엔드 및 모바일 개발자에게 꼭 필요한 정보만을 선별해 제공하는 자동화 파이프라인 시스템입니다.

## 🌟 핵심 기능 (Core Features)

### 🤖 자동화된 수집 & 분석 파이프라인

- **하이브리드 수집 엔진:** RSS 피드와 Playwright(Headless Browser)를 결합하여 차단 우회 및 정교한 크롤링 수행.
- **Smart Fetching:** 초기 구동 시 1년 치 데이터를, 이후에는 주간 데이터만 지능적으로 수집.
- **AI 심층 분석 (Deep Dive):** Gemini 2.5 Flash가 원문을 직접 읽고 개발자 관점에서 가치 평가(Scoring).
- **비평가 모드 & 재시도 로직:** 광고/스팸 0점 자동 필터링 및 API 과부하(503) 시 지수 백오프(Exponential Backoff) 재시도 수행.

### 🌐 인터랙티브 웹 아카이브

- **트렌드 피드:** SvelteKit + Tailwind CSS로 구축된 반응형 뉴스 피드.
- **검색 & 필터:** 키워드 검색 및 태그(#CSS, #React, #iOS 등) 기반 필터링 지원.
- **무한 스크롤:** 대량의 데이터를 끊김 없이 탐색 가능 (Pagination 적용).
- **상세 분석 모달:** AI가 작성한 '핵심 요약(3-Line Summary)'과 '선정 이유(Reason)' 제공.
- **구글 로그인:** Supabase Auth를 활용한 원클릭 로그인 및 구독 관리.

### 📧 개인화된 뉴스레터

- **자동 발송:** 매주 월요일, 분석 완료된 상위 트렌드를 MJML 템플릿으로 렌더링하여 이메일 발송 (Resend API).
- **커스텀 도메인:** `trendiv.org` 도메인을 통한 신뢰도 높은 발송.

## 🏗️ 아키텍처 (Architecture)

프로젝트는 기능별로 독립된 모듈로 구성된 **Monorepo** 구조이며, 백엔드와 프론트엔드가 분리되어 배포됩니다.

| 모듈명                            | 역할                | 주요 기술               | 배포 환경                     |
| :-------------------------------- | :------------------ | :---------------------- | :---------------------------- |
| **`trendiv-pipeline-controller`** | API 서버 & 스케줄러 | Node.js, Express, Cron  | **Google Cloud Run** (Docker) |
| **`trendiv-web`**                 | 웹 서비스 (UI/UX)   | SvelteKit, Tailwind CSS | **Cloudflare Pages**          |
| **`trendiv-scraper-module`**      | 데이터 수집         | Playwright, RSS Parser  | (Controller 내장 실행)        |
| **`trendiv-analysis-module`**     | AI 분석             | Google Gemini SDK       | (Controller 내장 실행)        |
| **`trendiv-result-module`**       | HTML 생성           | MJML                    | (Controller 내장 실행)        |

## 🚀 시작 가이드 (Getting Started)

### 1. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 아래 키를 설정하세요.

```env
# Database & Auth (Backend)
SUPABASE_URL="[https://your-project.supabase.co](https://your-project.supabase.co)"
SUPABASE_KEY="your-service-role-key"

# AI & Email Services
GEMINI_API_KEY="your-gemini-api-key"
RESEND_API_KEY="re_your_resend_key"

# Frontend Config (Public)
PUBLIC_SUPABASE_URL="[https://your-project.supabase.co](https://your-project.supabase.co)"
PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
PUBLIC_API_URL="http://localhost:3000" # 배포 시 실제 백엔드 주소 입력
```

### 2. 설치 및 로컬 실행

```bash
# 의존성 설치
pnpm install

# 백엔드 실행 (Docker 권장)
docker build -t trendiv-backend .
docker run -p 3000:3000 --env-file .env trendiv-backend

# 프론트엔드 실행
cd trendiv-web
pnpm dev
```

### 3. 배포 (Deployment)

#### Backend (Google Cloud Run)

```bash
./deploy.sh
# deploy.sh 참고
```

또는

```bash
pnpm run deploy
```

> env 변경 시 [GCP Console](https://console.cloud.google.com/compute/instances?chat=true&project=trendiv&supportedpurview=folder)에서 SSH를 통해 변경하세요.

#### Frontend (Cloudflare Pages)

```bash
cd trendiv-web
pnpm build
npx wrangler pages deploy
```

## 🤝 기여 가이드 (Contributing)

이 프로젝트는 **Conventional Commits** 규칙에 따라 버전 관리 및 배포가 **100% 자동화**되어 있습니다.
PR 생성 또는 머지 시 아래의 커밋 메시지 규칙을 반드시 준수해주세요.

### 커밋 메시지 규칙 (Commit Convention)

| 태그 (Prefix) | 설명 (Description)     | 버전 변경 (SemVer)          | 예시                           |
| :------------ | :--------------------- | :-------------------------- | :----------------------------- |
| **`feat`**    | 새로운 기능 추가       | **Minor** (v1.0.0 → v1.1.0) | `feat: 검색 필터 기능 추가`    |
| **`fix`**     | 버그 수정              | **Patch** (v1.0.0 → v1.0.1) | `fix: 로그인 토큰 에러 수정`   |
| **`docs`**    | 문서 수정              | **Patch** (v1.0.0 → v1.0.1) | `docs: README 설치법 업데이트` |
| **`chore`**   | 설정/패키지 변경       | **Patch** (v1.0.0 → v1.0.1) | `chore: tailwindcss 버전 업`   |
| **`major`**   | 중대한 변경 (Breaking) | **Major** (v1.0.0 → v2.0.0) | `major: API v2 마이그레이션`   |

> ⚠️ **주의:** `master` 브랜치로 머지될 때의 **Squash Commit 메시지**가 위 규칙을 따라야 릴리즈가 정상적으로 생성됩니다.

## 📝 라이선스

MIT License
