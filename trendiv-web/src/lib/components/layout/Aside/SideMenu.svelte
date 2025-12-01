<script lang="ts">
	import { browser } from '$app/environment';
	import AuthButton from '$lib/components/pure/Button/AuthButton.svelte';
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

	$: if (browser && document.body) {
		if (isOpen) {
			const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

			document.body.style.paddingRight = `${scrollbarWidth}px`;

			document.body.classList.add('overflow-hidden');
		} else {
			document.body.style.paddingRight = '';

			document.body.classList.remove('overflow-hidden');
		}
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
			class="bg-bg-body fixed right-0 top-0 z-40 flex h-dvh w-96 max-w-full flex-col justify-between shadow-2xl"
			transition:fly={{ x: 300, duration: 300 }}
			on:outroend={handleClose}
		>
			<div class="shrink-0">
				<ThemeSwitch className="align-top" />
			</div>
			<div class="absolute right-0 top-0">
				<CloseButton onClick={closeMenu} />
			</div>
			<div class="border-border-default shrink-0 border-b p-4">
				<AuthButton onClick={closeMenu} />
			</div>
			<nav class="flex-1 overflow-hidden">
				<ul>
					<li>1</li>
					<li>2</li>
					<li>3</li>
				</ul>
			</nav>
			<div class="bg-bg-surface border-border-default shrink-0 border-t">
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
