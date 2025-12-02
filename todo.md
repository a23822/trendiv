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
- [x] **이메일 발송:** Resend API 연동 및 커스텀 도메인(`trendiv.org`) 적용.
- [x] **백엔드 배포:** Dockerizing 완료 및 **Google Cloud Run** 배포 완료.

## 🔮 Phase 3: 웹 서비스 고도화 (완료)

- [x] **웹 아카이브 페이지 (`trendiv-web`):**
  - [x] Tailwind CSS 기반 반응형 UI/UX 디자인.
  - [x] **무한 스크롤(Infinite Scroll):** Pagination API 연동.
  - [x] **검색 및 필터:** 키워드 검색 및 태그(#CSS, #React 등) 필터링 기능.
  - [x] **상세 모달:** AI 분석 결과(핵심 요약, 선정 이유)를 보여주는 모달 구현.
  - [x] **사용자 인증:** Supabase Google Auth 연동 및 로그인 상태 관리.
- [x] **프론트엔드 배포:** Cloudflare Adapter 적용 및 **Cloudflare Pages** 배포 완료.

## 🎨 Phase 4: UI/UX 리디자인 (현재 진행 중)

- [ ] **디자인 시스템 구축:**
  - [x] 브랜드 컬러 및 타이포그래피 재정의.
  - [ ] 뉴스 카드, 버튼, 입력폼 등 공통 컴포넌트 디자인 고도화.
- [ ] **메인 페이지 개편:**
  - [x] 히어로 섹션 강화 (인상적인 문구 및 그래픽).
  - [ ] 뉴스 피드 레이아웃 개선 (Masonry 또는 매거진 스타일 고려).
- [x] **다크 모드 최적화:** 시스템 설정에 따른 테마 자동 전환 및 토글 버튼 추가.
- [ ] **반응형 개선:** 모바일 최적화 및 터치 인터랙션 강화.

## 📈 Phase 5: 운영 및 확장 (Next Step)

- [ ] **관리자(Admin) 대시보드:** 데이터 수동 관리 및 통계 확인.
- [ ] **데이터 관리:** 일정 지난 데이터 자동 삭제(Garbage Collection).
- [ ] **모니터링:** Sentry 연동으로 실시간 에러 추적.

## 컨텐츠 확장

- [ ] **키워드 리스트 캐러셀:** 현재 찾고 있는 키워드들을 보여주는 캐러셀 추가
- [ ] **유튜브 영상들도 찾는 로직 추가:** 유튜브도 포함필수
