<script>
	import favicon from '$lib/assets/favicon.svg';
	import { modalState } from '$lib/stores/modal';
	import BodyScrollLock from '$lib/utils/BodyScrollLock.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

{#if $modalState.component}
	<BodyScrollLock />
	{@const ActiveModal = $modalState.component}

	<ActiveModal {...$modalState.props} />
{/if}
