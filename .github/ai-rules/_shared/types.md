# 공유 타입 검사 규칙

`AnalysisResult`, `Trend` 등 프로젝트 공유 타입 사용 코드에 적용.

---

## TYPE_DEFINITIONS (검사 기준)

```typescript
// AnalysisResult - 배열 필드 주의
interface AnalysisResult {
  id?: number;
  aiModel: string;
  score: number;
  reason: string;
  title_ko: string;
  oneLineSummary: string;
  keyPoints: string[]; // undefined 가능
  tags: string[]; // undefined 가능
  analyzedAt: string;
  content?: string;
}

// Trend - optional 필드 주의
interface Trend {
  id: number;
  title: string;
  link: string;
  date: string;
  source: string;
  category: string;
  analysis_results?: AnalysisResult[]; // undefined 가능
  represent_result?: AnalysisResult | null; // null 가능
  content?: string;
}
```

---

## MUST_FLAG (반드시 지적)

```
PATTERN: 공유 타입 재정의
DETECT: `interface Trend {`, `interface AnalysisResult {` (import 없이 파일 내 정의)
OUTPUT: "🔴 공유 타입 재정의 금지. import type { Trend } from '$lib/types' 사용"
```

```
PATTERN: 배열 필드 직접 접근
DETECT: `keyPoints.map`, `keyPoints.forEach`, `tags.map`, `tags.length`, `analysis_results.map`, `analysis_results[0]` (?? 또는 ?. 없이)
OUTPUT: "🔴 배열 필드는 undefined 가능. (field ?? []) 또는 field?. 사용"
```

```
PATTERN: represent_result 직접 접근
DETECT: `represent_result.score`, `represent_result.title_ko` 등 (?. 없이)
OUTPUT: "🔴 represent_result는 null 가능. ?. 또는 null 체크 필요"
```

```
PATTERN: Date 타입 사용
DETECT: `createdAt: Date`, `updatedAt: Date`, `date: Date` (interface/type 내)
OUTPUT: "🔴 날짜는 string (ISO format) 사용. Supabase/JSON 호환"
```

---

## SHOULD_FLAG (권장 지적)

```
PATTERN: 타입 복사 확장
DETECT: interface 내 id, title, link, date, source, category 필드가 모두 있음 (Trend 복붙 의심)
OUTPUT: "🟡 타입 복사 대신 extends 사용. interface X extends Trend { }"
```

```
PATTERN: source 문자열 비교
DETECT: `source === 'youtube'`, `source === 'reddit'` 등
OUTPUT: "🟡 TrendSource 유니온 타입 정의 권장. 오타 방지"
```

```
PATTERN: optional 필드 기본값 없음
DETECT: `result.content`, `trend.content` (optional 필드를 ?? 없이 사용)
OUTPUT: "🟡 optional 필드는 ?? '' 기본값 권장"
```

---

## CORRECT_PATTERNS (참고)

배열 안전 접근:

```typescript
const tags = (result.tags ?? []).map((t) => t.toLowerCase());
const results = trend.analysis_results ?? [];
```

null 안전 접근:

```typescript
const score = trend.represent_result?.score ?? 0;
```
