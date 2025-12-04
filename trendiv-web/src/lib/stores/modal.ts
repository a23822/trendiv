import { writable } from 'svelte/store';
import type { Component } from 'svelte';

export interface ModalTab {
	title: string;
	component: Component;
	props?: Record<string, unknown>;
}

// 스토어 상태: 현재 열려있는 컴포넌트와 그 컴포넌트의 props
interface ModalState {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: Component<any> | null;
	props: Record<string, unknown>;
}

// 스토어 생성
export const modalState = writable<ModalState>({
	component: null,
	props: {}
});

/**
 * 모달 열기
 * @param component 보여줄 모달 컴포넌트 (import 해온 것)
 * @param props 그 컴포넌트에 넘겨줄 데이터 객체
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function openModal(component: Component<any>, props: Record<string, unknown> = {}) {
	modalState.set({ component, props });
}

/**
 * 모달 닫기
 */
export function closeModal() {
	modalState.set({ component: null, props: {} });
}
