# 🌊 Trendiv (트렌디브)

> **AI 기반 글로벌 HTML,CSS,A11Y 소식 아카이브 서비스**
>
> "매일 쏟아지는 기술 뉴스, AI가 읽고 요약해드립니다."

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-20.x-green.svg)](https://nodejs.org/)
[![Docker Build](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Deployed on Cloud Run](https://img.shields.io/badge/Backend-Cloud_Run-4285F4.svg)](https://cloud.google.com/run)
[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Frontend-Cloudflare_Pages-F38020.svg)](https://pages.cloudflare.com/)

## 🛠 Tech Stack

### Frontend

- **Framework:** Svelte 5 (Runes system applied)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (Oxide engine, CSS-first configuration)
- **Build Tool:** Vite

### Backend & Database

- **BaaS:** Supabase (Auth, Database, Realtime, Storage)
- **Library:** `@supabase/ssr` (SvelteKit 호환 인증)
- **Language:** TypeScript (Supabase Functions/Client)

## 🏗️ 아키텍처 (Architecture)

프로젝트는 기능별로 독립된 모듈로 구성된 **Monorepo** 구조이며, 백엔드와 프론트엔드가 분리되어 배포됩니다.

| 모듈명                            | 역할                | 주요 기술               | 배포 환경                     |
| :-------------------------------- | :------------------ | :---------------------- | :---------------------------- |
| **`trendiv-pipeline-controller`** | API 서버 & 스케줄러 | Node.js, Express, Cron  | **Google Cloud Run** (Docker) |
| **`trendiv-web`**                 | 웹 서비스 (UI/UX)   | SvelteKit, Tailwind CSS | **Cloudflare Pages**          |
| **`trendiv-scraper-module`**      | 데이터 수집         | Playwright, RSS Parser  | (Controller 내장 실행)        |
| **`trendiv-analysis-module`**     | AI 분석             | Google Gemini SDK       | (Controller 내장 실행)        |
| **`trendiv-result-module`**       | 이메일 리포트 생성  | MJML                    | (Controller 내장 실행)        |

## 🚀 Getting Started

### 1. Prerequisites

- Node.js 20+
- npm or pnpm (pnpm 권장)

### 2. Installation

프로젝트 클론 및 의존성 설치:

```bash
git clone <repository-url>
cd trendiv
pnpm install
```

### 3. Environment Setup (.env)

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

### 4. 설치 및 로컬 실행

```bash
# 백엔드 실행 (Docker 권장)
docker build -t trendiv-backend .
docker run -p 3000:3000 --env-file .env trendiv-backend

# 프론트엔드 실행
cd trendiv-web
pnpm run dev
```

### 5. Tailwind CSS v4 Configuration

Tailwind v4는 `tailwind.config.js` 파일이 필수가 아니며, CSS 파일에서 직접 테마를 설정합니다.

**`vite.config.ts` 설정:**

```ts
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite"; // [NEW] v4 plugin
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
});
```

**`src/app.css` 설정:**

```css
@import "tailwindcss";

@theme {
  /* [변경] v4 방식의 테마 변수 설정 */
  --font-sans: "Pretendard", ui-sans-serif, system-ui, sans-serif;
  --color-primary: #3b82f6;
  --color-secondary: #10b981;
}
```

### 6. Type Generation (Supabase)

DB 스키마 변경 시 타입을 업데이트합니다:

```bash
npm run gen-types
# 실제 명령어: npx supabase gen types typescript --project-id <id> > src/lib/types/database.types.ts
```

### 7. deploy

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

## 📝 라이선스

MIT License

```

```
