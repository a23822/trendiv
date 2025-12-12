<script lang="ts">
	import SideMenu from '$lib/components/layout/Aside/SideMenu.svelte';
	import MenuButton from '$lib/components/pure/Button/MenuButton.svelte';
	import IconLogo from '$lib/icons/icon_logo.svelte';
	import { uiState } from '$lib/stores/state.svelte.js';

	function toggleMenu() {
		uiState.toggleSideMenu();
	}

	function closeMenu() {
		uiState.closeSideMenu();
	}
</script>

<header
	class="bg-bg-body/70 sticky left-0 right-0 top-0 z-[90] backdrop-blur-md"
>
	<div
		class="h-header-height flex items-center justify-between gap-2 px-4 md:px-6 xl:px-8"
	>
		<IconLogo />
		<h1 class="text-primary mr-auto font-mono text-xl font-bold tracking-tight">
			Trendiv
		</h1>
		<MenuButton
			isOpen={uiState.isSideMenuOpen}
			onclick={toggleMenu}
		/>
	</div>
</header>
<SideMenu
	isOpen={uiState.isSideMenuOpen}
	{closeMenu}
/>
