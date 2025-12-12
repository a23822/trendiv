<script lang="ts">
	import SideMenu from '$lib/components/layout/Aside/SideMenu.svelte';
	import MenuButton from '$lib/components/pure/Button/MenuButton.svelte';
	import IconLogo from '$lib/icons/icon_logo.svelte';
	import { isSideMenuOpen } from '$lib/stores/state';

	function toggleMenu() {
		isSideMenuOpen.update((v) => !v);
	}

	function closeMenu() {
		isSideMenuOpen.set(false);
	}
</script>

<header
	class="bg-bg-body/70 sticky left-0 right-0 top-0 z-[90] backdrop-blur-md"
>
	<div
		class="h-header-height flex items-center justify-between gap-2 px-4 md:px-6 xl:px-8"
	>
		<IconLogo
			width="76"
			height="44"
		/>
		<h1 class="text-primary mr-auto font-mono text-xl font-bold tracking-tight">
			Trendiv
		</h1>
		<MenuButton
			isOpen={$isSideMenuOpen}
			onClick={toggleMenu}
		/>
	</div>
</header>
<SideMenu
	isOpen={$isSideMenuOpen}
	{closeMenu}
/>
