# Icons 폴더 검사 규칙

`trendiv-web/src/lib/icons/` 내 파일에 적용.

---

## ICON_COMPONENT

### MUST_FLAG

```
PATTERN: size prop 누락
DETECT: 아이콘 컴포넌트에 `size` prop 없음
OUTPUT: "🔴 아이콘은 size prop 필수. 기본값 포함"
```

```
PATTERN: 고정 크기 하드코딩
DETECT: `width="24"`, `height="24"`, `w-6`, `h-6` (고정값)
OUTPUT: "🔴 크기는 size prop으로 동적 처리"
```

```
PATTERN: 불필요한 wrapper
DETECT: `<span>` 또는 `<div>`로 svg 감싸기
OUTPUT: "🔴 svg 직접 반환. wrapper 불필요"
```

### CORRECT_PATTERNS

아이콘 컴포넌트:

```svelte
<script lang="ts">
  interface Props {
    size?: number;
    class?: string;
    [key: string]: unknown;
  }

  let { size = 24, class: className, ...rest }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  {...rest}
>
  <!-- paths -->
</svg>
```

---

## SVG_ATTRIBUTES

### SHOULD_FLAG

```
PATTERN: fill 하드코딩
DETECT: `fill="#`, `fill="rgb`
OUTPUT: "🟡 fill='currentColor' 또는 CSS 변수 사용 권장"
```

```
PATTERN: stroke 하드코딩
DETECT: `stroke="#`, `stroke="rgb`
OUTPUT: "🟡 stroke='currentColor' 권장"
```

### CORRECT_PATTERNS

색상 상속:

```svelte
<svg fill="currentColor" stroke="currentColor">
```

부모에서 색상 제어:

```svelte
<div class="text-primary">
  <IconCheck size={16} />
</div>
```
