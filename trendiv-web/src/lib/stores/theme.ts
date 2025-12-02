import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// 초기값 설정 로직
const getInitialTheme = browser ? document.documentElement.classList.contains('dark') : false;

export const isDarkTheme = writable<boolean>(getInitialTheme);

if (browser) {
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

	const handleSystemChange = (e: MediaQueryListEvent) => {
		isDarkTheme.set(e.matches);
	};

	mediaQuery.addEventListener('change', handleSystemChange);

	isDarkTheme.subscribe((isDark) => {
		if (isDark) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	});
}

export function toggleTheme() {
	if (!browser) return;

	document.documentElement.classList.add('theme-transitioning');

	isDarkTheme.update((current) => !current);

	setTimeout(() => {
		document.documentElement.classList.remove('theme-transitioning');
	}, 300);
}
