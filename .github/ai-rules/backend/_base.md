# 백엔드 검사 규칙

`trendiv-web/` 제외 모든 모듈에 적용.

- trendiv-pipeline-controller
- trendiv-scraper-module
- trendiv-analysis-module
- trendiv-result-module
- trendiv-code-reviewer-module

---

## ASYNC_PATTERNS

### MUST_FLAG

```
PATTERN: await 없는 Promise 반환
DETECT: `return fetch(`, `return axios.`, `return supabase.` (await 없이)
OUTPUT: "🔴 Promise 반환 시 await 또는 명시적 Promise<T> 타입 필요"
```

```
PATTERN: 병렬 처리 가능한 순차 await
DETECT: 연속된 `await` (서로 의존성 없음)
OUTPUT: "🟡 Promise.all() 또는 Promise.allSettled() 사용 권장"
```

```
PATTERN: 무한 루프 가능성
DETECT: `while (true)`, `for (;;)` (명확한 break 조건 없음)
OUTPUT: "🔴 무한 루프 위험. 명시적 종료 조건 또는 최대 반복 횟수 설정"
```

### CORRECT_PATTERNS

병렬 처리:

```typescript
// ❌ 순차 (느림)
const users = await fetchUsers();
const posts = await fetchPosts();

// ✅ 병렬 (빠름)
const [users, posts] = await Promise.all([fetchUsers(), fetchPosts()]);
```

안전한 반복:

```typescript
const MAX_ITERATIONS = 1000;
let count = 0;

while (condition && count < MAX_ITERATIONS) {
  // 로직
  count++;
}
```

---

## ERROR_HANDLING

### MUST_FLAG

```
PATTERN: 빈 catch 블록
DETECT: `catch (e) { }`, `catch { }`
OUTPUT: "🔴 에러 무시 금지. 최소 로깅 필수"
```

```
PATTERN: 에러 재던지기 없는 catch
DETECT: `catch` 블록에서 `throw` 없이 종료 (API 핸들러 제외)
OUTPUT: "🟡 에러 전파가 필요한지 검토. 필요시 throw"
```

### CORRECT_PATTERNS

```typescript
try {
  await riskyOperation();
} catch (error) {
  console.error("[ModuleName] Operation failed:", error);

  // 선택 1: 에러 전파
  throw error;

  // 선택 2: 래핑 후 전파
  throw new CustomError("Operation failed", { cause: error });

  // 선택 3: 기본값 반환 (명시적 이유 필요)
  return { success: false, error: "Operation failed" };
}
```

---

## API_CALLS

### MUST_FLAG

```
PATTERN: 하드코딩된 URL
DETECT: `'https://`, `'http://`, `"https://`, `"http://`
OUTPUT: "🔴 URL 하드코딩 금지. 환경변수 또는 상수 사용"
```

```
PATTERN: API 키 하드코딩
DETECT: `apiKey: '`, `token: '`, `secret: '`
OUTPUT: "🔴 API 키 하드코딩 금지. 환경변수 사용"
```

```
PATTERN: 타임아웃 설정 누락
DETECT: `fetch(`, `axios.` (timeout 옵션 없음)
OUTPUT: "🟡 외부 API 호출에 timeout 설정 권장"
```

### CORRECT_PATTERNS

```typescript
const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

const response = await fetch(API_URL, {
  headers: { Authorization: `Bearer ${API_KEY}` },
  signal: AbortSignal.timeout(30000), // 30초 타임아웃
});
```

---

## DATABASE_QUERIES

### MUST_FLAG

```
PATTERN: SQL 인젝션 위험
DETECT: 문자열 템플릿으로 SQL 조합 (`SELECT * FROM ${table}`)
OUTPUT: "🔴 SQL 인젝션 위험. 파라미터화된 쿼리 사용"
```

```
PATTERN: 트랜잭션 없는 복수 쿼리
DETECT: 연속된 `await supabase.from().insert/update/delete` (트랜잭션 없음)
OUTPUT: "🟡 여러 쓰기 작업은 트랜잭션 고려"
```

### SHOULD_FLAG

```
PATTERN: SELECT * 사용
DETECT: `.select('*')`, `SELECT *`
OUTPUT: "🟡 필요한 컬럼만 명시적 선택 권장"
```

---

## LOGGING

### SHOULD_FLAG

```
PATTERN: console.log 프로덕션 코드
DETECT: `console.log(` (테스트 파일 제외)
OUTPUT: "🟡 프로덕션에서는 구조화된 로깅 권장"
```

### CORRECT_PATTERNS

```typescript
// 모듈별 prefix
console.log("[Scraper] Starting fetch:", url);
console.error("[Analysis] Failed:", error);
console.warn("[Pipeline] Rate limit approaching");
```

---

## RATE_LIMITING

### SHOULD_FLAG

```
PATTERN: API 호출 루프
DETECT: `for` 또는 `while` 내 API 호출 (delay 없음)
OUTPUT: "🟡 Rate limit 방지를 위해 delay 또는 배치 처리 권장"
```

### CORRECT_PATTERNS

```typescript
async function processWithDelay<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  delayMs: number = 1000,
): Promise<void> {
  for (const item of items) {
    await processor(item);
    await sleep(delayMs);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```
