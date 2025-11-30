<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { IDs } from '$lib/constants/ids';

	import ThemeSwitch from '$lib/components/pure/ToggleSwitch/ThemeSwitch.svelte';
	import CloseButton from '$lib/components/pure/Button/CloseButton.svelte';

	export let isOpen = false;
	export let closeMenu: () => void;
	export let isDark = false;

	let dialog: HTMLDialogElement;

	$: if (dialog) {
		if (isOpen) {
			dialog.showModal();
		} else {
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
>
	{#if isOpen}
		<!-- <div 
    class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
    transition:fade={{ duration: 200 }}
    on:click={closeMenu}
  ></div> -->

		<aside
			id={IDs.LAYOUT.SIDE_MENU}
			class="fixed right-0 top-0 z-40 flex h-full w-80 flex-col bg-white shadow-2xl"
			transition:fly={{ x: 300, duration: 300 }}
		>
			<div class="flex justify-end">
				<CloseButton onClick={closeMenu} />
			</div>

			<nav class="flex-1 overflow-y-auto px-6 py-4">
				<ul class="space-y-4">
					<li>
						<a
							href="/"
							class="block text-lg font-bold text-slate-800 transition-colors hover:text-blue-600"
							on:click={closeMenu}
						>
							🏠 홈으로
						</a>
					</li>
					<li>
						<a
							href="/about"
							class="block text-lg font-medium text-slate-600 transition-colors hover:text-blue-600"
							on:click={closeMenu}
						>
							👋 소개 (About)
						</a>
					</li>
					<li>
						<a
							href="/archive"
							class="block text-lg font-medium text-slate-600 transition-colors hover:text-blue-600"
							on:click={closeMenu}
						>
							📚 지난 뉴스레터
						</a>
					</li>
				</ul>
			</nav>

			<div class="border-t border-slate-100 bg-slate-50 p-6">
				<div class="mb-4 flex items-center justify-between">
					<span class="text-sm font-medium text-slate-500">다크 모드</span>
					<ThemeSwitch bind:isDark />
				</div>
				<p class="text-center text-xs text-slate-400">© 2025 Trendiv. All rights reserved.</p>
			</div>
		</aside>
	{/if}
</dialog>

<style lang="scss">
	.side_menu {
	}
</style>
