# Stores 폴더 검사 규칙

`trendiv-web/src/lib/stores/` 내 `.svelte.ts` 파일에 적용.

---

## SVELTE_5_STORE_PATTERNS

Svelte 5에서는 `.svelte.ts` 파일에서 Runes 사용.
`svelte/store`의 `writable`, `derived` 사용 금지.

### MUST_FLAG

```
PATTERN: Legacy store import
DETECT: `from 'svelte/store'`, `import { writable`, `import { derived`, `import { readable`
OUTPUT: "🔴 svelte/store 금지. .svelte.ts 파일에서 $state, $derived 사용"
```

```
PATTERN: writable/derived 사용
DETECT: `writable<`, `writable(`, `derived(`, `readable(`
OUTPUT: "🔴 Runes 패턴 사용. $state(), $derived() 로 전환"
```

```
PATTERN: $ 접두사 자동 구독
DETECT: `$storeName` (컴포넌트에서 $ 접두사로 스토어 구독)
OUTPUT: "🔴 자동 구독 문법 금지. store.value 또는 getter 사용"
```

### CORRECT_PATTERNS

**패턴 1: Class 기반 Store (복잡한 로직)**

```typescript
// auth.svelte.ts
import { browser } from "$app/environment";

class AuthStore {
  user = $state<User | null>(null);
  isLoading = $state(false);

  constructor() {
    if (browser) {
      // 초기화 로직
    }
  }

  async signIn() {
    this.isLoading = true;
    try {
      // 로직
    } finally {
      this.isLoading = false;
    }
  }
}

export const auth = new AuthStore();
```

**패턴 2: Object 기반 Store (간단한 상태)**

```typescript
// modal.svelte.ts
let component = $state<Component | null>(null);
let props = $state<Record<string, unknown>>({});

export const modal = {
  get component() {
    return component;
  },
  get props() {
    return props;
  },

  open(newComponent: Component, newProps = {}) {
    component = newComponent;
    props = newProps;
  },

  close() {
    component = null;
    props = {};
  },
};
```

**패턴 3: 단순 $state 객체**

```typescript
// state.svelte.ts
export const uiState = $state({
  isSideMenuOpen: false,
  scrollbarWidth: 0,

  toggleSideMenu() {
    this.isSideMenuOpen = !this.isSideMenuOpen;
  },
});
```

---

## ASYNC_STORES

### MUST_FLAG

```
PATTERN: 에러 처리 누락
DETECT: `async` 메서드에 try-catch 없음
OUTPUT: "🔴 비동기 작업에 에러 처리 필수"
```

```
PATTERN: 로딩 상태 누락
DETECT: API 호출하는 async 메서드에 isLoading 상태 없음
OUTPUT: "🟡 로딩 상태 관리 권장"
```

### CORRECT_PATTERNS

Optimistic UI + Rollback:

```typescript
async toggle(item: Item) {
  // 1. 낙관적 업데이트
  const prevState = this.items;
  this.items = this.items.filter(i => i.id !== item.id);

  try {
    // 2. 서버 요청
    await api.delete(item.id);
  } catch (e) {
    // 3. 실패 시 롤백
    console.error('삭제 오류:', e);
    this.items = prevState;
  }
}
```

중복 요청 방지:

```typescript
private processingIds = new Set<string>();

async toggle(id: string) {
  if (this.processingIds.has(id)) return;
  this.processingIds.add(id);

  try {
    // 로직
  } finally {
    this.processingIds.delete(id);
  }
}
```

---

## SSR_SAFETY

### MUST_FLAG

```
PATTERN: browser 체크 없이 DOM/localStorage 접근
DETECT: `document.`, `window.`, `localStorage.` (browser 체크 없이)
OUTPUT: "🔴 SSR 에러 위험. if (browser) 체크 필수"
```

### CORRECT_PATTERNS

```typescript
import { browser } from "$app/environment";

class ThemeStore {
  isDark = $state(false);

  constructor() {
    if (browser) {
      this.isDark = document.documentElement.classList.contains("dark");
    }
  }
}
```

---

## FILE_NAMING

```
RULE: Store 파일 확장자
USE: .svelte.ts (Runes 사용 가능)
AVOID: .ts (Runes 사용 불가)

CORRECT: auth.svelte.ts, modal.svelte.ts
WRONG: auth.ts, modal.ts
```
