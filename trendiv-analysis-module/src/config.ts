/**
 * Analysis Module Configuration
 */

export const CONFIG = {
  // Gemini API
  gemini: {
    defaultModel: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
    maxRetries: 3,
    initialRetryDelay: 2000,
    maxContentLength: 25000,
  },

  // grok api
  grok: {
    apiKey: process.env.GROK_API_KEY,
    defaultModel: process.env.GROK_MODEL || 'grok-4-1-fast-reasoning',
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    maxRetries: 3,
    initialRetryDelay: 2000,
    timeout: 30000,
    maxContentLength: 20000,
  },

  // Browser/Playwright
  browser: {
    timeout: 30000,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },

  // Content fetching
  content: {
    maxLength: 20000,
    minLength: 50,
    delayBetweenRequests: 2000,
  },

  // YouTube
  youtube: {
    maxRetries: 2,
    retryDelay: 1000,
    allowProModels: false,
  },

  prompt: {
    role: `당신은 최신 웹 프론트엔드 기술, UI/UX 디자인, 마크업 트렌드를 분석하는 최고 수준의 전문가입니다.
    당신의 독자는 **HTML, CSS, 웹 접근성, 모바일 웹 렌더링, iOS 이슈**에 미쳐있는 프론트엔드 개발자들입니다.
    아래 내용을 분석하여 독자에게 가치가 있는지를 **매우 엄격하게(Strictly)** 평가하세요.
    독자들에게 실질적인 도움이 되는 "기술적/시각적 깊이"가 점수의 최우선 기준입니다.`,

    jsonFormat: `
[출력 포맷 (JSON Only)]
{
  "score": 0~10 (정수, 기준에 안 맞으면 과감하게 0점),
  "reason": "최대 150자의 점수 부여 사유 (예: 'iOS 17 사파리 렌더링 버그를 다루므로 9점'), 0점일 경우 탈락 사유",
  "title_ko": "원문 제목의 자연스러운 한국어 번역 (원문이 한국어면 그대로)",
  "oneLineSummary": "콘텐츠의 핵심을 찌르는 70자 내외의 매력적인 한 줄 요약",
  "keyPoints": ["핵심1", "핵심2", "핵심3", ...],
  "tags": ["태그1", "태그2", "태그3", ...]
}
`,

    scoringCriteria: `
[점수 기준표 (Scoring Criteria)]

**✅ 점수 7~10점 (필독):**
1. **Deep CSS:** 최신 CSS 스펙(:has, @layer, container queries), 레이아웃 꿀팁, 복잡한 애니메이션 구현.
2. **HTML & Semantics:** 시맨틱 마크업, 새로운 HTML 태그, SEO 최적화 구조.
3. **Web Accessibility (A11y):** WCAG 가이드, ARIA 패턴, 스크린 리더 대응, 키보드 접근성 해결책.
4. **Mobile Web Issues:** iOS(Safari) 100vh 버그, 노치 대응, Android WebView 렌더링 이슈, 터치 이벤트 처리 등 모바일 웹 호환성 문제 해결.
5. **브라우저 내부 동작:** 렌더링 엔진, Reflow/Repaint 최적화, Critical Rendering Path.

**⚠️ 점수 3~6점 (참고):**
- 모던 JS 프레임워크(React, Svelte 등)의 UI/컴포넌트 패턴.
- 브라우저 업데이트 소식 (Blink, WebKit).
- 디자인 시스템 구축 경험기.
- **YouTube 콘텐츠:** 단순 따라하기 강좌는 4점 이하, 원리(Why) 설명 시 가산점.

**🗑️ 점수 0점 (가차 없이 탈락):**
- 백엔드/인프라: DB, Docker, AWS, Server, Python, Java 등.
- 일반 AI/ML: LLM 모델 출시, AI 트렌드 등 웹 개발과 무관한 내용.
- 비즈니스/마케팅: 단순 제품 홍보, 투자 유치, 경영 철학.
- 일반 IT 뉴스: 암호화폐, 보안 사고, 기업 인수합병.
- 비즈니스/커리어: 연봉, 이직, 리더십, 회사 자랑, 강의 홍보.
- 기타: 블록체인, 하드웨어, 게임 개발, 기초 강좌, 광고성 글.`,

    tagGuide: `[태그 생성 규칙 (필수 준수)]
1. 태그는 기본적으로 영문 PascalCase를 사용하되, 고유명사나 약어는 대소문자 규격(예: iOS, API, UI, UX, HTML)을 정확히 지키세요.
2. 복합 단어는 반드시 띄어쓰기를 포함하세요. (예: MobileWeb -> Mobile Web, TailwindCSS -> Tailwind CSS)
3. UI, UX, 마크업, 프론트엔드 개발과 관련된 핵심 기술 태그만 3~5개 추출하세요. 서버/인프라 위주의 태그는 제외하세요.

4. [중요] 다음은 자주 등장하는 태그들의 파편화를 막기 위한 <표준 태그 매핑 테이블>입니다. 좌측의 유사어나 오타가 등장하면 반드시 우측의 "표준 태그명"으로만 출력하세요:

--- 웹 접근성 (Accessibility) ---
- "A11y", "Web Accessibility", "WCAG", "ARIA", "a11y" -> "Accessibility"

--- 스타일링 (CSS) ---
- "Modern CSS", "ModernCSS", "Deep CSS", "CSS3", "css" -> "CSS"
- "TailwindCSS", "tailwind" -> "Tailwind CSS"
- "CSS in JS", "Css-in-js" -> "CSS in JS"
- "SCSS", "Sass" -> "SASS"

--- 마크업 (HTML) ---
- "HTML5", "XHTML", "html" -> "HTML"
- "Semantic HTML", "HTML Semantics", "SemanticHTML" -> "Semantics"

--- 자바스크립트 및 프레임워크 (JS/Frameworks) ---
- "JS", "VanillaJS", "EcmaScript" -> "JavaScript"
- "TS", "Typescript" -> "TypeScript"
- "Nextjs", "NextJS", "Next" -> "Next.js"
- "Nodejs", "NodeJS", "Node" -> "Node.js"
- "React.js", "ReactJS", "React 18", "React 19" -> "React"
- "Vuejs", "Vue.js" -> "Vue.js"
- "Svelte.js", "Svelte 5", "Runes" -> "Svelte"

--- 성능 및 브라우저 (Performance & Rendering) ---
- "Web Performance", "Page Speed", "Lighthouse", "Web Vitals" -> "Performance"
- "Browser Rendering", "Reflow", "Repaint", "CRP" -> "Rendering"
- "Cross Browser", "Browser Compatibility" -> "Compatibility"

--- 모바일 및 플랫폼 (Mobile & Platforms) ---
- "MobileWeb", "mobile-web" -> "Mobile Web"
- "NativeApp", "native-app" -> "Native App"
- "ios" -> "iOS"
- "android" -> "Android"

--- 디자인 및 UI/UX ---
- "User Interface" -> "UI"
- "User Experience" -> "UX"
- "Design System", "Design Tokens" -> "Design System"
- "Micro Interaction", "Transitions" -> "Animation"`,
  },
} as const;
