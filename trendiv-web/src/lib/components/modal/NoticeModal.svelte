<script lang="ts">
	import CloseButton from '$lib/components/pure/Button/CloseButton.svelte';
	import MenuTab from '$lib/components/pure/Tab/MenuTab.svelte';
	import { closeModal } from '$lib/stores/modal';

	interface Props {
		title?: string;
		tabs?: { title: string; content: string }[];
		confirmText?: string;
		onConfirm?: () => void;
	}

	let { title, tabs = [], confirmText = '확인', onConfirm }: Props = $props();

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
	class="w-[400px] max-w-[calc(100%_-_32px)] overflow-hidden rounded-2xl backdrop:bg-black/50 sm:rounded-3xl"
	onclose={handleNativeClose}
	onclick={handleBackdropClick}
>
	<div class="bg-bg-body flex flex-col">
		<div class="flex flex-row-reverse items-center justify-between pl-4 sm:pl-6">
			<CloseButton variant="inverted" size={40} onclick={requestClose} />

			{#if title}
				<div class="text-gray-900">
					<h2 class="">{title}</h2>
				</div>
			{/if}
		</div>
		{#if tabs.length > 1}
			<div class="p-4 sm:p-6">
				<MenuTab items={tabs.map((t) => t.title)} bind:current={activeIndex} />
			</div>
		{:else if tabs.length === 1}
			<h3
				class="border-b border-gray-100 bg-gray-50 p-4 text-center text-lg font-bold text-gray-800"
			>
				{tabs[0].title}
			</h3>
		{/if}

		<div
			style="scrollbar-gutter: stable; padding-right: calc(1.5rem - var(--scrollbar-gap));"
			class="max-h-[400px] overflow-y-auto px-6 pb-4 text-sm text-gray-700"
		>
			{#if tabs[activeIndex]}
				{@html tabs[activeIndex].content}
			{/if}
		</div>

		<div class="flex justify-center gap-3 border-t border-gray-100 p-4">
			{#if onConfirm}
				<button
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
					onclick={requestClose}
				>
					취소
				</button>
				<button
					class="rounded-md bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600"
					onclick={handleConfirm}
				>
					{confirmText}
				</button>
			{:else}
				<button
					class="rounded-md bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
					onclick={requestClose}
				>
					닫기
				</button>
			{/if}
		</div>
	</div>
</dialog>
