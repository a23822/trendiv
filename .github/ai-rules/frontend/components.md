# Components 폴더 검사 규칙

`trendiv-web/src/lib/components/` 내 파일에 적용.

---

## COMPONENT_STRUCTURE

### MUST_FLAG

```
PATTERN: Props 인터페이스 누락
DETECT: `$props()` 사용하지만 interface/type 정의 없음
OUTPUT: "🔴 Props 인터페이스 필수 정의"
```

```
PATTERN: class prop 누락
DETECT: interface Props에 `class?: string` 없음
OUTPUT: "🔴 외부 스타일 주입을 위해 class prop 필수"
```

```
PATTERN: rest props 미전달
DETECT: `{...rest}` 없이 루트 요소에 props 전달
OUTPUT: "🟡 ...rest로 추가 속성 전달 권장"
```

### CORRECT_PATTERNS

rest props 전달:

```svelte
<div class={cn('base', className)} {...rest}>
  {@render children()}
</div>
```

---

## CN_UTILITY

### MUST_FLAG

```
PATTERN: 클래스 문자열 직접 조합
DETECT: `class={`...` + `...`}`, `class={\`${...}\`}`
OUTPUT: "🔴 cn() 유틸리티 사용. 클래스 충돌 자동 병합"
```

### CLASS_ORDER (참고)

cn() 내 클래스 순서:

1. Layout: `flex`, `grid`, `items-center`, `justify-between`
2. Box Model: `p-4`, `m-2`, `w-full`, `h-10`, `border`, `rounded`
3. Typography: `text-sm`, `font-medium`, `leading-tight`
4. Colors: `bg-primary`, `text-gray-800`, `border-border-default`
5. Transitions: `transition-colors`, `duration-200`
6. States: `hover:bg-primary-hover`, `disabled:opacity-50`
7. Conditionals: `active && 'ring-2'`, `className`

예시:

```typescript
const buttonClass = cn(
  // Layout
  "inline-flex items-center justify-center gap-2",
  // Box Model
  "px-4 py-2 rounded-lg border",
  // Typography
  "text-sm font-medium",
  // Colors
  "bg-primary text-primary-text border-transparent",
  // Transitions
  "transition-colors duration-200",
  // States
  "hover:bg-primary-hover",
  "disabled:opacity-50 disabled:cursor-not-allowed",
  // Conditionals
  isActive && "ring-2 ring-primary",
  className,
);
```

---

## PSEUDO_ELEMENTS

### SHOULD_FLAG

```
PATTERN: Divider/Indicator용 빈 요소
DETECT: `<span class="w-px`, `<div class="h-px`, `<span class="rounded-full`
OUTPUT: "🟡 구분선/인디케이터는 가상요소(before:/after:) 권장"
```

### CORRECT_PATTERNS

Divider:

```svelte
<div class="relative before:absolute before:left-0 before:top-1/2 before:h-4 before:w-px before:bg-border-default before:-translate-y-1/2">
```

Indicator dot:

```svelte
<div class="relative after:absolute after:right-0 after:top-0 after:size-2 after:rounded-full after:bg-alert">
```

---

## CONDITIONAL_RENDERING

### SHOULD_FLAG

```
PATTERN: 삼항연산자 과다 사용
DETECT: `{condition ? <ComponentA /> : <ComponentB />}` (복잡한 JSX)
OUTPUT: "🟡 복잡한 조건부 렌더링은 {#if} 블록 사용"
```

### CORRECT_PATTERNS

```svelte
{#if isLoading}
  <Spinner />
{:else if error}
  <ErrorMessage {error} />
{:else}
  <Content {data} />
{/if}
```

---

## EVENT_HANDLERS

### MUST_FLAG

```
PATTERN: 인라인 복잡 로직
DETECT: `onclick={() => { ... }}` (3줄 이상 로직)
OUTPUT: "🔴 복잡한 로직은 별도 함수로 분리"
```

### CORRECT_PATTERNS

```svelte
<script lang="ts">
  function handleClick() {
    // 로직
  }
</script>

<button onclick={handleClick}>Click</button>
```

단순 상태 토글은 인라인 허용:

```svelte
<button onclick={() => isOpen = !isOpen}>Toggle</button>
```
