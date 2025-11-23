# ✅ Trendiv 프로젝트 로드맵 (2025 Updated)

## 🚀 Phase 1: 핵심 파이프라인 구축 (완료)

- [x] **프로젝트 리브랜딩:** Mama -> Trendiv로 명칭 및 구조 변경 완료 (Monorepo).
- [x] **데이터베이스 구축:** Supabase 연동 및 `Trend` 테이블 스키마 정의.
- [x] **프론트엔드 개발:** SvelteKit 기반 구독 폼 구현 및 API 연동.
- [x] **하이브리드 스크래퍼 구현 (`trendiv-scraper-module`):**
  - [x] RSS Parser 연동 (WebKit, CSS-Tricks, Android Dev 등).
  - [x] Playwright 연동 (RSS 없는 사이트 및 차단 우회용).
  - [x] Axios 헤더 조작을 통한 406 에러 해결 (Android Weekly).
  - [x] 데이터 날짜 필터링 (최근 7일) 및 JSON 저장.
- [x] **AI 분석 엔진 구현 (`trendiv-analysis-module`):**
  - [x] Google Gemini 2.5 Flash 연동 (무료 티어 최적화).
  - [x] Playwright 기반 본문(Context) 추출 기능 (Deep Dive).
  - [x] **프롬프트 엔지니어링:** '비평가 모드' 도입 (0점 필터링, HTML/CSS/A11y 강조).
  - [x] **AI 윤리:** AI 출력 결과에 대한 인간 검토용 로그 및 0점 처리 로직 구현.
- [x] **결과물 생성기 구현 (`trendiv-result-module`):**
  - [x] MJML 활용 다크 모드 뉴스레터 템플릿 디자인.
  - [x] 분석 데이터(JSON) -> HTML 이메일 변환 로직 작성.

## 🛠️ Phase 2: 통합 및 자동화 (진행 중)

- [ ] **파이프라인 통합 고도화 (`trendiv-pipeline-controller`):**
  - [x] 수집 -> 분석 -> 저장 흐름 제어 API 작성.
  - [ ] **`node-cron` 스케줄링:** 주간(월요일)/일간(핫토픽) 옵션화 및 환경 변수 토글 구현.
  - [ ] **에러 핸들링:** Winston 로그 시스템 도입 및 재시도(Retry) 로직에 지수 백오프(Exponential Backoff) 적용.
- [ ] **이메일 발송 시스템 연동:**
  - [ ] **Resend API 연동:** Nodemailer 대신 2025 트렌드인 Resend 사용하여 전송 안정성 확보.
  - [ ] **A/B 테스트:** 제목/콘텐츠 변형 생성 후 오픈율 테스트 로직 구상.
- [ ] **도커라이징 및 배포:**
  - [x] `Dockerfile` 및 `.dockerignore` 작성.
  - [ ] **멀티스테이지 빌드:** pnpm 캐싱을 활용한 빌드 속도 최적화 및 이미지 경량화.
  - [ ] Fly.io 또는 AWS Lightsail 배포 및 Health Check 엔드포인트(`/healthz`) 추가.

## 🔮 Phase 3: 서비스 고도화 (확장)

- [ ] **웹 아카이브 페이지 (`trendiv-web`):**
  - [ ] **구독자 전용:** Lucia Auth 등을 활용한 로그인 및 비공개 아카이브 접근.
  - [ ] **검색 및 필터:** Supabase Full-text Search 연동, 태그별(iOS, React 등) 필터링.
- [ ] **다양한 채널 확장 (Omni-channel):**
  - [ ] **Telegram/Discord 봇:** 요약된 뉴스를 챗봇 형식으로 푸시 알림.
  - [ ] **Web Push:** Service Worker를 활용한 브라우저 알림 (PWA 고려).
- [ ] **데이터 관리 및 보안:**
  - [ ] **Garbage Collection:** cron으로 90일 지난 데이터 자동 삭제 및 S3 백업.
  - [ ] **보안 강화:** Rate Limiting (API 남용 방지) 및 API Key 로테이션 전략 수립.

## 📈 Phase 4: 성장 및 모니터링 (New)

- [ ] **구독자 성장 자동화:** AI 에이전트를 활용한 소셜(X, LinkedIn) 공유 콘텐츠 자동 생성.
- [ ] **분석 대시보드:** Supabase + Chart.js로 오픈율/클릭율 시각화 페이지 구축.

```

```
