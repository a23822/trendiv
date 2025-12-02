import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// 초기값 설정 로직
const getInitialTheme = () => {
	if (!browser) return false; // SSR 환경에선 기본 라이트

	// 1. 저장된 설정 확인
	const stored = localStorage.getItem('theme');
	if (stored) return stored === 'dark';

	// 2. 시스템 설정 확인
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const isDarkTheme = writable<boolean>(getInitialTheme());

if (browser) {
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
	}, 3000);
}
