<script lang="ts">
	import CloseButton from '$lib/components/pure/Button/CloseButton.svelte';
	import MenuTab from '$lib/components/pure/Tab/MenuTab.svelte';
	import { modal } from '$lib/stores/modal.svelte.js';
	import { cn } from '$lib/utils/ClassMerge';
	import type { Component } from 'svelte';

	interface Props {
		title?: string;
		tabs?: { title: string; content: string }[];
		confirmText?: string;
		onOk?: () => void;
		bottomComponent?: Component;
		bottomProps?: Record<string, any>;
	}

	let {
		title,
		tabs = [],
		confirmText = '확인',
		onOk,
		bottomComponent: BottomComponent,
		bottomProps = {}
	}: Props = $props();

	let activeIndex = $state(0);
	let dialog: HTMLDialogElement;

	$effect(() => {
		if (dialog && !dialog.open) {
			dialog.showModal();
		}
	});

	function requestClose() {
		// 1. 다이얼로그 닫기 애니메이션 등을 위해 먼저 native close 호출
		dialog?.close();
		// 2. 전역 스토어 상태 초기화
		modal.close();
	}

	function handleNativeClose() {
		// Esc 키 등으로 닫혔을 때 스토어 동기화
		modal.close();
	}

	function handleConfirm() {
		if (onOk) onOk();
		requestClose();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialog) {
			requestClose();
		}
	}
</script>

<dialog
	bind:this={dialog}
	class={cn(
		'w-100 max-w-[calc(100%-32px)] overflow-hidden overflow-y-auto rounded-2xl p-4',
		'bg-bg-main backdrop:bg-black/50',
		'm-auto',
		'sm:rounded-3xl sm:p-6'
	)}
	onclose={handleNativeClose}
	onclick={handleBackdropClick}
>
	<section>
		<div class={cn('flex flex-row-reverse items-center justify-between')}>
			<CloseButton
				className="shrink-0 -mt-1 sm:-mr-2"
				variant="inverted"
				size={40}
				onclick={requestClose}
			/>

			{#if title}
				<div class="overflow-hidden text-xl font-bold text-gray-900">
					<h2 class="truncate">{title}</h2>
				</div>
			{/if}
		</div>
		{#if tabs.length > 1}
			<div class="pt-3">
				<MenuTab
					items={tabs.map((t) => t.title)}
					bind:current={activeIndex}
				/>
			</div>
		{:else if tabs.length === 1}
			<h3
				class={cn(
					'bg-gray-50 py-4',
					'border-b border-gray-100',
					'text-center text-lg font-bold text-gray-800'
				)}
			>
				{tabs[0].title}
			</h3>
		{/if}
		<div
			class={cn(
				'relative -mx-4 sm:-mx-6',
				'before:pointer-events-none before:absolute before:top-0 before:right-(--scrollbar-gap) before:left-0 before:z-10 before:h-8',
				'before:from-bg-main before:bg-linear-to-b before:from-[0.5rem] before:to-transparent',
				'after:pointer-events-none after:absolute after:right-(--scrollbar-gap) after:bottom-0 after:left-0 after:z-10 after:h-8',
				'after:from-bg-main after:bg-linear-to-t after:from-[0.5rem] after:to-transparent'
			)}
		>
			<div
				style="scrollbar-gutter: stable;"
				class={cn(
					'max-h-[400px] overflow-y-auto',
					'py-8 pl-4 sm:pl-6',
					'pr-[calc(1rem-var(--scrollbar-gap))] sm:pr-[calc(1.5rem-var(--scrollbar-gap))]',
					'text-sm text-gray-700'
				)}
			>
				{#if tabs[activeIndex]}
					{@html tabs[activeIndex].content}
				{/if}
			</div>
		</div>
		{#if BottomComponent}
			<BottomComponent
				onCancel={requestClose}
				onConfirm={handleConfirm}
				{confirmText}
				{...bottomProps}
			/>
		{/if}
	</section>
</dialog>
