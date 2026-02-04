import type { Component } from 'svelte';

// 1. 상태 (State)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let component = $state<Component<any> | null>(null);
let props = $state<Record<string, unknown>>({});

// 2. Export
export const modal = {
	// Getter (읽기 전용)
	get component() {
		return component;
	},
	get props() {
		return props;
	},
	get isOpen() {
		return component !== null;
	},

	// Actions (열기)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	open(newComponent: Component<any>, newProps: Record<string, unknown> = {}) {
		component = newComponent;
		props = newProps;
	},

	// Actions (닫기)
	close() {
		component = null;
		props = {};
	}
};
