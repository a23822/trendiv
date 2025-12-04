<script lang="ts">
	import { closeModal } from '$lib/stores/modal';

	// Props 정의
	interface Props {
		tabs?: { title: string; content: string }[];
		confirmText?: string;
		onConfirm?: () => void;
	}

	let { tabs = [], confirmText = '확인', onConfirm }: Props = $props();

	let activeIndex = $state(0);
	let dialog: HTMLDialogElement; // dialog 엘리먼트 참조

	// 컴포넌트가 마운트되면 자동으로 모달을 엽니다.
	// (+layout.svelte에서 조건부 렌더링을 하고 있기 때문에 마운트 시점이 곧 열리는 시점입니다)
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

	// 확인(로그인) 동작
	function handleConfirm() {
		if (onConfirm) onConfirm();
		requestClose();
	}

	// 배경 클릭 시 닫기 (Dialog 백드롭 클릭 감지)
	function handleBackdropClick(e: MouseEvent) {
		// 클릭된 타겟이 dialog 태그 자체라면(내부 컨텐츠가 아니라면) 백드롭을 클릭한 것임
		if (e.target === dialog) {
			requestClose();
		}
	}
</script>

<dialog
	bind:this={dialog}
	class="w-[400px] max-w-[90%] overflow-hidden rounded-lg p-0 backdrop:bg-black/50 open:shadow-xl"
	onclose={handleNativeClose}
	onclick={handleBackdropClick}
>
	<div class="flex flex-col bg-white">
		{#if tabs.length > 1}
			<div class="flex border-b border-gray-200 bg-gray-50">
				{#each tabs as tab, i}
					<button
						class="flex-1 p-3 text-sm font-bold transition-colors
                        {i === activeIndex
							? 'border-b-2 border-blue-500 bg-white text-gray-900'
							: 'text-gray-500 hover:text-gray-700'}"
						onclick={() => (activeIndex = i)}
					>
						{tab.title}
					</button>
				{/each}
			</div>
		{:else if tabs.length === 1}
			<h3
				class="border-b border-gray-100 bg-gray-50 p-4 text-center text-lg font-bold text-gray-800"
			>
				{tabs[0].title}
			</h3>
		{/if}

		<div
			class="max-h-[400px] overflow-y-auto whitespace-pre-wrap p-5 text-sm leading-relaxed text-gray-700"
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
