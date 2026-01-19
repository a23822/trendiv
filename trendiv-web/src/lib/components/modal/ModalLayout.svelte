<script lang="ts">
	import CloseButton from '$lib/components/pure/Button/CloseButton.svelte';
	import { cn } from '$lib/utils/ClassMerge';
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		onclose?: () => void;
		class?: string;
		children: Snippet;
		headerComponent?: Snippet;
		footerComponent?: Snippet;
	}

	let {
		open = $bindable(),
		onclose,
		class: className,
		children,
		headerComponent,
		footerComponent
	}: Props = $props();

	let dialog: HTMLDialogElement;

	// open 상태에 따라 dialog 열기/닫기 동기화
	$effect(() => {
		if (open && dialog && !dialog.open) {
			dialog.showModal();
		} else if (!open && dialog && dialog.open) {
			dialog.close();
		}
	});

	// 내부에서 닫기 요청 (버튼 클릭 등) -> dialog.close()
	function requestClose() {
		dialog?.close();
	}

	// ESC 키 또는 dialog.close() 호출 시 실행
	function handleNativeClose() {
		open = false;
		onclose?.();
	}

	// 배경 클릭 시 닫기
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialog) {
			dialog.close();
		}
	}
</script>

<dialog
	bind:this={dialog}
	onclose={handleNativeClose}
	onclick={handleBackdropClick}
	class={cn('m-auto', 'modal-transition', className)}
>
	<div
		class={cn(
			'flex flex-col',
			'max-h-[inherit]',
			'bg-bg-main rounded-2xl shadow-xl',
			'p-4 sm:p-6'
		)}
	>
		<div
			class={cn(
				'shrink-0',
				'flex flex-row-reverse items-center justify-between'
			)}
		>
			<CloseButton
				class="ml-auto shrink-0"
				variant="inverted"
				size={40}
				onclick={requestClose}
			/>
			{#if headerComponent}
				{@render headerComponent()}
			{/if}
		</div>
		<div
			class={cn(
				'flex-1 overflow-x-visible overflow-y-auto',
				'-mx-4 px-4 sm:-mx-6 sm:px-6'
			)}
		>
			{@render children()}
		</div>
		{#if footerComponent}
			<div class="shrink-0">
				{@render footerComponent()}
			</div>
		{/if}
	</div>
</dialog>

<style>
	/* Native Dialog의 등장/퇴장 애니메이션을 위한 설정입니다.
       display 속성의 변화(none <-> block)를 allow-discrete로 지연시켜 애니메이션을 가능하게 합니다.
    */
	.modal-transition {
		opacity: 0;
		transform: scale(0.95); /* zoom-in-95 효과 */
		transition:
			opacity 0.2s ease-out,
			transform 0.2s ease-out,
			overlay 0.2s ease-out allow-discrete,
			display 0.2s ease-out allow-discrete;
	}

	/* 모달이 열려있을 때 (open 속성 존재) */
	.modal-transition[open] {
		opacity: 1;
		transform: scale(1);
	}

	/* 초기 등장 시점 설정 (@starting-style) */
	@starting-style {
		.modal-transition[open] {
			opacity: 0;
			transform: scale(0.95);
		}
	}

	/* Backdrop (배경) 애니메이션 
       Tailwind 클래스(backdrop:...)로는 닫힐 때 애니메이션이 끊기므로 여기서 함께 처리
    */
	.modal-transition::backdrop {
		background-color: transparent;
		backdrop-filter: blur(0);
		transition:
			display 0.2s allow-discrete,
			overlay 0.2s allow-discrete,
			background-color 0.2s ease-out,
			backdrop-filter 0.2s ease-out;
	}

	.modal-transition[open]::backdrop {
		background-color: rgb(var(--gray-900-fixed) / 0.6); /* gray-900/60 */
		backdrop-filter: blur(4px); /* blur-sm */
	}

	@starting-style {
		.modal-transition[open]::backdrop {
			background-color: transparent;
			backdrop-filter: blur(0);
		}
	}
</style>
