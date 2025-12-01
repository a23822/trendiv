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

export const isDarkTheme = writable(getInitialTheme());

if (browser) {
	isDarkTheme.subscribe((value) => {
		if (value) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	});
}
