# 프론트엔드 공통 검사 규칙

`trendiv-web/` 내 모든 파일에 적용.

---

## SVELTE_5_RUNES

### MUST_FLAG

```
PATTERN: Legacy 반응성 문법
DETECT: `export let`, `$:`, `$: {`
OUTPUT: "🔴 Svelte 4 문법 금지. $state(), $derived(), $effect() 사용"
```

```
PATTERN: Legacy 이벤트 핸들러
DETECT: `on:click`, `on:input`, `on:change`, `on:submit`, `on:keydown`
OUTPUT: "🔴 on: 디렉티브 금지. onclick, oninput, onchange 사용"
```

```
PATTERN: Legacy slot
DETECT: `<slot`, `<slot>`, `<slot />`
OUTPUT: "🔴 slot 금지. Snippet + {@render children()} 사용"
```

```
PATTERN: Legacy store 구독
DETECT: `$storeName` ($ 접두사로 스토어 자동 구독)
OUTPUT: "🔴 자동 구독 금지. store.subscribe() 또는 $derived() 사용"
```

### CORRECT_PATTERNS

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    value: string;
    disabled?: boolean;
    children: Snippet;
  }

  let { value, disabled = false, children }: Props = $props();
</script>
```

```svelte
let count = $state(0);
let doubled = $derived(count * 2);

$effect(() => {
  console.log('count changed:', count);
});
```

```svelte
<button onclick={handleClick}>Click</button>
<input oninput={handleInput} />
```

```svelte
{#if children}
  {@render children()}
{/if}
```

---

## TAILWIND_V4

### MUST_FLAG

```
PATTERN: 하드코딩 색상
DETECT: `#[0-9a-fA-F]{3,6}`, `rgb(`, `rgba(`, `hsl(`
OUTPUT: "🔴 하드코딩 색상 금지. CSS 변수 클래스 사용 (bg-primary, text-gray-800 등)"
```

```
PATTERN: 괄호 형식 CSS 변수
DETECT: `bg-(--`, `text-(--`, `border-(--`
OUTPUT: "🔴 v3 문법. bg-bg-main, text-primary 형식 사용"
```

```
PATTERN: 컴포넌트 내 z-index
DETECT: `z-[`, `z-10`, `z-20`, `z-30`, `z-40`, `z-50`
OUTPUT: "🔴 z-index는 컴포넌트 내부 정의 금지. 개발자가 필요 시 직접 부여"
```

```
PATTERN: 컴포넌트 내 min/max 크기
DETECT: `min-w-`, `max-w-`, `min-h-`, `max-h-`
OUTPUT: "🔴 min/max 크기는 컴포넌트 내부 정의 금지. 개발자가 필요 시 직접 부여"
```

---

## COLOR_SYSTEM

모든 컬러는 `variables_color.scss` + `app.css @theme`에 정의됨.

### HEX → TAILWIND 매핑 (필수 참조)

```
PRIMARY (민트 계열)
#1ba896 → bg-primary, text-primary, border-primary
#148a7d → bg-primary-hover
#0d6b63 → bg-primary-active
#e0f7f4 → bg-primary-subtle

BACKGROUND
#f8fafc → bg-bg-body
#ffffff → bg-bg-main, bg-bg-elevated
#f1f5f9 → bg-bg-surface, bg-bg-hover
#e2e8f0 → bg-bg-active
#e0f7f4 → bg-bg-selected

BORDER
#e2e8f0 → border-border-default
#f1f5f9 → border-border-subtle
#cbd5e1 → border-border-strong
#1ba896 → border-border-focus

STATUS
#10b981 → bg-confirm, text-confirm
#f59e0b → bg-caution, text-caution
#ef4444 → bg-alert, text-alert
#0ea5e9 → bg-info, text-info

GRAY (다크모드 자동 반전)
#ffffff → bg-gray-0, text-gray-0
#fafafa → bg-gray-100
#f5f5f5 → bg-gray-200
#e5e5e5 → bg-gray-300
#d4d4d4 → bg-gray-400
#a3a3a3 → bg-gray-500
#737373 → bg-gray-600
#525252 → bg-gray-700
#404040 → bg-gray-800
#262626 → bg-gray-900
#171717 → bg-gray-950
#000000 → bg-gray-1000
```

### 사용 규칙

- 시맨틱 컬러 우선 (bg-bg-_, border-border-_, bg-confirm 등)
- 다크모드: 일반 변수 자동 반전, -fixed는 고정

### SHOULD_FLAG

```
PATTERN: 임의값 사용
DETECT: `p-[`, `m-[`, `w-[`, `h-[`, `text-[`, `gap-[`
OUTPUT: "🟡 임의값보다 표준 클래스 권장 (p-4, text-sm 등)"
```

```
PATTERN: @apply 사용
DETECT: `@apply`
OUTPUT: "🟡 @apply 지양. 인라인 Tailwind 클래스 사용"
```

### MUST_FLAG

```
PATTERN: div에 클릭 이벤트
DETECT: `<div` ... `onclick=`
OUTPUT: "🔴 클릭 가능 요소는 <button> 또는 <a> 사용"
```

```
PATTERN: img alt 누락
DETECT: `<img` ... `/>` (alt 속성 없음)
OUTPUT: "🔴 img에 alt 필수"
```

```
PATTERN: {@html} 미소독
DETECT: `{@html` ... `}` (DOMPurify 없이)
OUTPUT: "🔴 XSS 위험. DOMPurify.sanitize() 필수"
```

### SHOULD_FLAG

```
PATTERN: button type 누락
DETECT: `<button` (type 속성 없음)
OUTPUT: "🟡 button에 type='button' 명시 권장"
```

```
PATTERN: 인터랙티브 요소 aria 누락
DETECT: `aria-label`, `aria-expanded`, `aria-controls` 없는 버튼/토글
OUTPUT: "🟡 접근성 속성 권장"
```

---

## ICONS

### MUST_FLAG

```
PATTERN: 아이콘 클래스로 크기 조절
DETECT: `<Icon` ... `class="w-`, `class="h-`
OUTPUT: "🔴 아이콘 크기는 size prop만 사용. <IconName size={16} />"
```

```
PATTERN: 아이콘에 직접 margin
DETECT: `<Icon` ... `class="m`, `class="mr-`, `class="ml-`
OUTPUT: "🔴 아이콘 간격은 부모 gap으로 처리"
```

### CORRECT_PATTERNS

```svelte
<div class="flex items-center gap-2">
  <IconSearch size={16} />
  <span>검색</span>
</div>
```

---

## IMPORTS

### MUST_FLAG

```
PATTERN: 상대 경로 과다 사용
DETECT: `from '../../../`, `from '../../../../`
OUTPUT: "🔴 $lib alias 사용. import X from '$lib/...'"
```

### CORRECT_PATTERNS

```typescript
import Button from "$lib/components/pure/Button/Button.svelte";
import { cn } from "$lib/utils/ClassMerge";
import type { Trend } from "$lib/types";
```
