<script lang="ts">
	import { CommonStyles } from '$lib/constants/styles';
	import IconClose from '$lib/icons/icon_close.svelte';
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		open?: boolean;
		onclose?: () => void;
		class?: string;
	}

	let { open = $bindable(false), onclose, class: className }: Props = $props();

	let dialogElement: HTMLDialogElement;

	$effect(() => {
		if (open) {
			dialogElement?.showModal();
		} else {
			dialogElement?.close();
		}
	});

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialogElement) {
			handleClose();
		}
	}
</script>

<dialog
	bind:this={dialogElement}
	onclose={handleClose}
	onclick={handleBackdropClick}
	class={cn(
		'modal-dialog',
		'w-full max-w-lg rounded-2xl',
		'bg-bg-main p-0',
		'border-border-default border',
		'shadow-xl',
		'backdrop:bg-gray-1000/50 backdrop:backdrop-blur-sm',
		'open:scale-100 open:opacity-100',
		className
	)}
>
	<!-- Header -->
	<header
		class={cn(
			'flex items-center justify-between',
			'border-border-default border-b',
			'px-5 py-4'
		)}
	>
		<h2 class="text-lg font-bold text-gray-900">필터</h2>
		<button
			type="button"
			onclick={handleClose}
			class={cn(
				'flex h-9 w-9 items-center justify-center',
				'rounded-full',
				'hover:bg-bg-hover text-gray-500 hover:text-gray-700',
				CommonStyles.DEFAULT_TRANSITION
			)}
		>
			<IconClose size={20} />
			<span class="sr-only">닫기</span>
		</button>
	</header>

	<!-- Body -->
	<div class="max-h-[60vh] overflow-y-auto px-5 py-4">asd</div>

	<!-- Footer -->
	<footer
		class={cn(
			'flex items-center justify-end gap-3',
			'border-border-default border-t',
			'px-5 py-4'
		)}
	>
		<button
			type="button"
			onclick={handleClose}
			class={cn(
				'rounded-lg px-4 py-2',
				'bg-mint-500 text-white',
				'hover:bg-mint-600',
				CommonStyles.DEFAULT_TRANSITION
			)}
		>
			적용
		</button>
	</footer>
</dialog>

<style>
	.modal-dialog {
		opacity: 0;
		scale: 0.95;
		transition:
			opacity 0.2s ease-out,
			scale 0.2s ease-out,
			overlay 0.2s ease-out allow-discrete,
			display 0.2s ease-out allow-discrete;
	}

	.modal-dialog[open] {
		opacity: 1;
		scale: 1;
	}

	.modal-dialog::backdrop {
		opacity: 0;
		transition:
			opacity 0.2s ease-out,
			display 0.2s ease-out allow-discrete;
	}

	.modal-dialog[open]::backdrop {
		opacity: 1;
	}

	@starting-style {
		.modal-dialog[open] {
			opacity: 0;
			scale: 0.95;
		}

		.modal-dialog[open]::backdrop {
			opacity: 0;
		}
	}
</style>
