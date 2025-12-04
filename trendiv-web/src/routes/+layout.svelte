<script>
	import favicon from '$lib/assets/favicon.svg';
	import { modalState } from '$lib/stores/modal';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

{#if $modalState.component}
	{@const ActiveModal = $modalState.component}

	<ActiveModal {...$modalState.props} />
{/if}
