<script lang="ts">
	import CloseButton from '$lib/components/pure/Button/CloseButton.svelte';
	import MenuTab from '$lib/components/pure/Tab/MenuTab.svelte';
	import { closeModal } from '$lib/stores/modal';
	import { cn } from '$lib/utils/ClassMerge';
	import type { Component } from 'svelte';

	interface Props {
		title?: string;
		tabs?: { title: string; content: string }[];
		confirmText?: string;
		onConfirm?: () => void;
		confirmIcon?: Component;
	}

	let {
		title,
		tabs = [],
		confirmText = '확인',
		onConfirm,
		confirmIcon: ConfirmIcon
	}: Props = $props();

	let activeIndex = $state(0);
	let dialog: HTMLDialogElement;

	$effect(() => {
		if (dialog && !dialog.open) {
			dialog.showModal();
		}
	});

	function requestClose() {
		dialog?.close();
	}

	function handleNativeClose() {
		closeModal();
	}

	function handleConfirm() {
		if (onConfirm) onConfirm();
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
		'w-[400px] max-w-[calc(100%_-_32px)] overflow-hidden rounded-2xl p-4',
		'bg-bg-body backdrop:bg-black/50',
		'sm:rounded-3xl sm:p-6'
	)}
	onclose={handleNativeClose}
	onclick={handleBackdropClick}
>
	<div class="flex flex-col">
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
				'relative',
				'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-6',
				'before:from-bg-body before:bg-gradient-to-b before:to-transparent',
				'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:z-10 after:h-6',
				'after:from-bg-body after:bg-gradient-to-t after:to-transparent'
			)}
		>
			<div
				style="scrollbar-gutter: stable; margin-right: calc(var(--scrollbar-gap) * -1);"
				class={cn(
					'max-h-[400px] overflow-y-auto',
					'pt-6',
					'text-sm text-gray-700'
				)}
			>
				{#if tabs[activeIndex]}
					{@html tabs[activeIndex].content}
				{/if}
			</div>
		</div>
		<div class={cn('flex justify-center gap-2 pt-4')}>
			<button
				class={cn(
					'h-[40px] flex-1 rounded-xl',
					'bg-gray-300',
					'text-xl font-semibold text-gray-600'
				)}
				onclick={requestClose}
			>
				취소
			</button>
			{#if onConfirm}
				<button
					class={cn(
						'flex items-center justify-center',
						'h-[40px] flex-1 rounded-xl',
						'bg-gray-900',
						'text-xl font-semibold text-gray-600'
					)}
					onclick={handleConfirm}
				>
					{#if ConfirmIcon}
						<ConfirmIcon class="h-6 w-6 fill-current" />
					{/if}
					{confirmText}
				</button>
			{/if}
		</div>
	</div>
</dialog>
