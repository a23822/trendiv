import { browser } from '$app/environment';

class ThemeStore {
	// 1. 반응형 상태 선언 ($state)
	isDark = $state(false);

	constructor() {
		if (browser) {
			// 초기값 설정: HTML 태그의 class 확인
			this.isDark = document.documentElement.classList.contains('dark');

			// 시스템 설정 변경 감지 리스너
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			mediaQuery.addEventListener('change', (e) => {
				this.setTheme(e.matches);
			});
		}
	}

	// 2. 테마 변경 로직 (내부 메서드로 통합)
	setTheme(isDark: boolean) {
		this.isDark = isDark;
		this.applyTheme();
	}

	toggle = () => {
		if (!browser) return;

		document.documentElement.classList.add('theme-transitioning');

		this.isDark = !this.isDark;
		this.applyTheme();

		setTimeout(() => {
			document.documentElement.classList.remove('theme-transitioning');
		}, 300);
	};

	// 실제 DOM과 로컬스토리지에 반영하는 헬퍼 함수
	private applyTheme() {
		if (this.isDark) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}
}

// 전역에서 사용할 수 있도록 인스턴스 export
export const theme = new ThemeStore();
