import { writable } from 'svelte/store';

// 사이드메뉴
export const isSideMenuOpen = writable(false);

// 스크롤바
export const scrollbarWidth = writable(0);
