# ✅ Trendiv 프로젝트 로드맵 (Current Status)

## 🚀 Phase 1: 핵심 파이프라인 구축 (완료)

- [x] **프로젝트 구조:** Monorepo 설정 및 공통 모듈화.
- [x] **데이터베이스:** Supabase 연동 (`Trend`, `Subscriber` 테이블).
- [x] **수집 엔진:** RSS + Playwright 하이브리드 크롤러 구현.
- [x] **AI 분석:** Gemini 2.5 Flash 연동 및 프롬프트 엔지니어링 (HTML/CSS/A11y 강조).
- [x] **결과 생성:** MJML 기반 뉴스레터 HTML 생성기 구현.

## 🛠️ Phase 2: 통합 및 자동화 (완료)

- [x] **파이프라인 통합 API:** 수집-분석-저장 흐름 제어 및 상태 관리 (`RAW` -> `ANALYZED`).
- [x] **스케줄링:** `node-cron` 적용 (매주 월요일 자동 실행).
- [x] **안정성 강화:**
  - [x] Gemini 503 에러 대응을 위한 **지수 백오프(Exponential Backoff)** 재시도 로직.
  - [x] **상태 기반 처리:** 실패 시 `RAW` 상태 보존 및 다음 실행 시 재처리(Retry) 메커니즘.
  - [x] **중복 방지:** URL/ID 기반 `upsert` 로직 및 `ignoreDuplicates` 옵션 적용.
- [x] **이메일 발송:** Resend API 연동 및 발송 로직 구현.
- [x] **백엔드 배포:** Dockerizing 완료 및 **Google Cloud Run** 배포 완료.

## 🔮 Phase 3: 웹 서비스 고도화 (완료)

- [x] **웹 아카이브 페이지 (`trendiv-web`):**
  - [x] Tailwind CSS 기반 반응형 UI/UX 디자인.
  - [x] **무한 스크롤(Infinite Scroll):** Pagination API 연동.
  - [x] **검색 및 필터:** 키워드 검색 및 태그(#CSS, #React 등) 필터링 기능.
  - [x] **상세 모달:** AI 분석 결과(핵심 요약, 선정 이유)를 보여주는 모달 구현.
  - [x] **웹 접근성(A11y):** 시맨틱 태그 및 키보드 네비게이션 준수.
- [x] **프론트엔드 배포:** Cloudflare Adapter 적용 및 **Cloudflare Pages** 배포 완료.

## 📈 Phase 4: 운영 및 확장 (Next Step)

- [ ] **보안 및 인증:**
  - [ ] 관리자(Admin) 대시보드 로그인 (Lucia Auth).
  - [ ] API Rate Limiting 도입 (Upstash Redis 고려).
- [ ] **데이터 관리:**
  - [ ] **Garbage Collection:** 90일 지난 데이터 자동 아카이빙/삭제 스케줄러.
  - [ ] 벡터 검색(Vector Search): Supabase pgvector를 활용한 AI 시맨틱 검색 도입.
- [ ] **채널 확장 (Omni-channel):**
  - [ ] Telegram/Slack 봇 연동하여 알림 발송.
- [ ] **모니터링:**
  - [ ] Sentry 도입으로 실시간 에러 추적.
