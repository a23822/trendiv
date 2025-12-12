<script lang="ts">
	import AuthButton from '$lib/components/pure/Button/AuthButton.svelte';
	import CloseButton from '$lib/components/pure/Button/CloseButton.svelte';
	import ThemeSwitch from '$lib/components/pure/ToggleSwitch/ThemeSwitch.svelte';
	import { IDs } from '$lib/constants/ids';
	import BodyScrollLock from '$lib/utils/BodyScrollLock.svelte';
	import { cn } from '$lib/utils/ClassMerge';
	import { fly } from 'svelte/transition';

	interface Props {
		closeMenu: () => void;
		isOpen: boolean;
	}

	let { isOpen = false, closeMenu }: Props = $props();

	let dialog = $state<HTMLDialogElement>();

	$effect(() => {
		if (dialog && isOpen && !dialog.open) {
			dialog.showModal();
		}
	});

	function handleClose() {
		if (dialog && !isOpen) {
			// isOpen이 false일 때만 닫기
			dialog.close();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialog) {
			closeMenu();
		}
	}
</script>

<dialog
	bind:this={dialog}
	id={IDs.LAYOUT.SIDE_MENU}
	onclick={handleBackdropClick}
	onclose={closeMenu}
	class="side_menu"
	class:closed={!isOpen}
>
	{#if isOpen}
		<BodyScrollLock />
		<aside
			id={IDs.LAYOUT.SIDE_MENU}
			class={cn(
				'z-100 fixed right-0 top-0',
				' flex flex-col justify-between',
				'w-sidemenu h-dvh max-w-full',
				'bg-bg-body shadow-2xl'
			)}
			transition:fly={{ x: 300, duration: 300 }}
			onoutroend={handleClose}
		>
			<div class="shrink-0">
				<ThemeSwitch className="align-top" />
			</div>
			<div class="absolute right-0 top-0">
				<CloseButton onclick={closeMenu} />
			</div>
			<div class={cn('mb-auto shrink-0 p-4', 'border-border-default border-b')}>
				<AuthButton />
			</div>
			<!-- <nav class="flex-1 overflow-hidden">
				<ul>
					<li>1</li>
					<li>2</li>
					<li>3</li>
				</ul>
			</nav> -->
			<div class="bg-bg-surface border-border-default shrink-0 border-t">
				<p class="py-10 text-center text-xs text-gray-700">
					© 2025 Trendiv. All rights reserved.
				</p>
			</div>
		</aside>
	{/if}
</dialog>

<style lang="scss">
	.side_menu {
		&::backdrop {
			background-color: rgba(0, 0, 0, 0.5);
			transition: background-color 0.3s ease-in-out;
		}
		&.closed {
			&::backdrop {
				background-color: transparent;
			}
		}
	}
</style>
