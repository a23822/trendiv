# UI 생성 규칙

> 트리거: Scaffold + Figma → Svelte 컴포넌트 생성 시 적용하세요. (ai-ui-generator 전용)

---

## SVELTE_5_SYNTAX

```
RULE: Runes 문법만 사용
USE: $state(), $derived(), $effect(), $props()
AVOID: export let, $:, <slot>
```

```
RULE: 이벤트 핸들러
USE: onclick, oninput, onchange
AVOID: on:click, on:input, on:change
```

```
RULE: Snippet 렌더링
USE: {@render children()}
AVOID: <slot />, <slot name="x">
```

---

## TAILWIND_V4_COLORS

```
RULE: CSS 변수 클래스 사용
Figma/SVG에서 받은 컬러를 Tailwind 클래스로 변환:

HEX → TAILWIND 변환표:

PRIMARY
#1ba896, #1BA896 → bg-primary, text-primary
#148a7d → bg-primary-hover
#0d6b63 → bg-primary-active
#e0f7f4 → bg-primary-subtle

BACKGROUND
#f8fafc → bg-bg-body
#ffffff → bg-bg-main
#f1f5f9 → bg-bg-surface
#e2e8f0 → bg-bg-active

BORDER
#e2e8f0 → border-border-default
#cbd5e1 → border-border-strong
#1ba896 → border-border-focus

GRAY
#ffffff → text-gray-0, bg-gray-0
#f5f5f5 → bg-gray-200
#a3a3a3 → text-gray-500
#737373 → text-gray-600
#525252 → text-gray-700
#404040 → text-gray-800
#262626 → text-gray-900
#000000 → text-gray-1000

MINT
#e0f7f4 → bg-mint-50
#4dd0bd → bg-mint-300
#1ba896 → bg-mint-500
#0d6b63 → bg-mint-700

STATUS
#10b981 → bg-confirm
#f59e0b → bg-caution
#ef4444 → bg-alert
#0ea5e9 → bg-info

AVOID:
- bg-[#1ba896] → bg-primary 또는 bg-mint-500 사용
- text-[#404040] → text-gray-800 사용
- bg-(--bg-main) → bg-bg-main 사용
```

```
RULE: 표준 클래스 우선
MAPPING:
- text-[12px] → text-xs
- text-[14px] → text-sm
- text-[16px] → text-base
- p-[4px] → p-1
- p-[8px] → p-2
- p-[16px] → p-4
- gap-[8px] → gap-2
- rounded-[8px] → rounded-lg
```

---

## FORBIDDEN_PROPERTIES

```
RULE: 절대 사용 금지
- z-index (z-10, z-20, z-[100] 등)
- min-width (min-w-[200px] 등)
- max-width (max-w-[400px] 등)
- min-height (min-h-[100px] 등)
- max-height (max-h-[300px] 등)

EXCEPTION: relative 단독 사용은 허용
```

---

## ICON_RULES

```
RULE: 아이콘 크기 유지
- 기존 scaffold의 아이콘 size prop 그대로 유지
- 클래스로 크기 조절 금지 (w-5, h-5 금지)

CORRECT:
<IconSearch size={16} />

WRONG:
<IconSearch class="w-4 h-4" />
```

---

## PSEUDO_ELEMENTS

```
RULE: Divider/Indicator는 가상요소 또는 근접 선택자로
USE: before:, after: 또는 [&+*]:, [&>*+*]: 등

방법 1. 가상요소 (단일 요소 기준)
<div class="relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-px before:bg-border-default">

방법 2. 근접 선택자 (리스트 아이템 사이)
<ul class="flex [&>li+li]:border-l [&>li+li]:border-border-default [&>li+li]:pl-2 [&>li+li]:ml-2">
  <li>Item 1</li>
  <li>Item 2</li>  <!-- 자동으로 왼쪽 border -->
  <li>Item 3</li>
</ul>

방법 3. divide 유틸리티 (간단한 경우)
<div class="flex divide-x divide-border-default">
  <span>A</span>
  <span>B</span>
</div>

WRONG:
<span class="w-px h-4 bg-border-default"></span>  <!-- 빈 요소 금지 -->
```

---

## GRADIENT_SHADOW

```
RULE: SVG 그라데이션 변환
SVG linearGradient → Tailwind gradient

CORRECT:
bg-gradient-to-b from-[#start] to-[#end]

RULE: SVG filter/shadow 변환
feDropShadow → shadow-sm, shadow-md, shadow-lg
```

---

## STRUCTURE_PRESERVATION

```
RULE: Scaffold 구조 최대한 유지
- import 문 유지
- $props 정의 유지
- 함수/로직 유지
- HTML 구조 최대한 유지 (태그, 중첩 구조)
- Tailwind 클래스만 수정/추가

변경 허용:
- class 속성 내용
- aria-* 속성 추가
- data-* 속성 추가

변경 금지:
- 태그 종류 변경 (div→section 등)
- 중첩 구조 변경
- 요소 추가/삭제
- 이벤트 핸들러 변경
```

---

## OUTPUT_FORMAT

```
RULE: 출력 형식
- 완성된 Svelte 코드만 출력
- 마크다운 코드 블록 내부
- 설명, 주석, 부가 텍스트 절대 금지
- 불필요한 wrapper 금지
- "여기서는...", "이렇게 구현했습니다" 등 설명 금지
- 코드만 출력하세요
```

---

## CN_UTILITY

```
RULE: 조건부 클래스는 cn() 사용
IMPORT: import { cn } from '$lib/utils/ClassMerge';

CORRECT:
class={cn(
  'base-class',
  isActive && 'active-class',
  className
)}

WRONG:
class={`base-class ${isActive ? 'active-class' : ''} ${className}`}
```
