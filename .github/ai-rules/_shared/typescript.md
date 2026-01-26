# TypeScript 검사 규칙

`.ts`, `.tsx` 파일에 적용.

---

## MUST_FLAG (반드시 지적)

```
PATTERN: any 타입
DETECT: `: any`, `as any`, `any[]`, `any>`
OUTPUT: "🔴 any 타입 금지. unknown + 타입 가드 또는 구체적 타입 사용"
```

```
PATTERN: 타입 무시 주석
DETECT: `@ts-ignore`, `@ts-nocheck`
OUTPUT: "🔴 타입 에러 무시 금지. 타입 문제 해결 필요"
```

```
PATTERN: 옵셔널 체이닝 누락
DETECT: `a.b.c.d` (3단계 이상 체이닝, ?. 없음)
OUTPUT: "🔴 런타임 에러 위험. 옵셔널 체이닝(?.) 또는 null 체크 필요"
```

```
PATTERN: catch error 직접 접근
DETECT: `catch (error)` 블록 내 `error.message`, `error.code` 등 (instanceof 체크 없이)
OUTPUT: "🔴 error는 unknown. instanceof Error 체크 후 사용"
```

---

## SHOULD_FLAG (권장 지적)

```
PATTERN: non-null assertion
DETECT: `!.`, `]!`, 변수명 뒤 `!`
OUTPUT: "🟡 ! 대신 명시적 null 체크 권장"
```

```
PATTERN: 배열 인덱스 직접 접근
DETECT: `[0]`, `[index]` (length 체크 없이)
OUTPUT: "🟡 .at() 또는 length 체크 권장"
```

```
PATTERN: export 함수 반환 타입 누락
DETECT: `export function name(...)` 또는 `export const name =` 에서 `: ReturnType` 없음
OUTPUT: "🟡 export 함수는 반환 타입 명시 권장"
```

```
PATTERN: enum 사용
DETECT: `enum Name {`
OUTPUT: "🟡 enum 대신 as const 객체 권장"
```

---

## CORRECT_PATTERNS (참고)

타입 가드:

```typescript
function isX(data: unknown): data is X {
  return typeof data === "object" && data !== null && "field" in data;
}
```

에러 처리:

```typescript
catch (error) {
  if (error instanceof Error) { error.message }
}
```
