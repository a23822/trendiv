<script lang="ts">
	import CloseButton from '$lib/components/pure/Button/CloseButton.svelte';
	import ThemeSwitch from '$lib/components/pure/ToggleSwitch/ThemeSwitch.svelte';
	import { IDs } from '$lib/constants/ids';
	import { fly } from 'svelte/transition';

	export let isOpen = false;
	export let closeMenu: () => void;

	let dialog: HTMLDialogElement;

	$: if (dialog && isOpen && !dialog.open) {
		dialog.showModal();
	}

	function handleClose() {
		if (dialog && dialog.open) {
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
	on:click={handleBackdropClick}
	on:close={closeMenu}
	class="side_menu"
	class:closed={!isOpen}
>
	{#if isOpen}
		<aside
			id={IDs.LAYOUT.SIDE_MENU}
			class="fixed right-0 top-0 z-40 flex h-dvh w-96 max-w-full flex-col justify-between bg-white shadow-2xl"
			transition:fly={{ x: 300, duration: 300 }}
			on:outroend={handleClose}
		>
			<div class="shrink-0">
				<ThemeSwitch />
			</div>
			<div class="absolute right-0 top-0">
				<CloseButton onClick={closeMenu} />
			</div>
			<nav class="flex-1 overflow-hidden">
				<ul>
					<li>1</li>
					<li>2</li>
					<li>3</li>
				</ul>
			</nav>
			<div class="shrink-0 border-t bg-neutral-100">
				<p class="py-10 text-center text-xs text-gray-700">© 2025 Trendiv. All rights reserved.</p>
			</div>
		</aside>
	{/if}
</dialog>

<style lang="scss">
	.side_menu {
		&::backdrop {
			background-color: rgba(0, 0, 0, 0.4);
			transition: background-color 0.3s ease-in-out;
		}
		&.closed {
			&::backdrop {
				background-color: transparent;
			}
		}
	}
</style>
