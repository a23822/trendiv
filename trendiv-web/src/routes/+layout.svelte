<script>
	import favicon from '$lib/assets/favicon.svg';
	import { modal } from '$lib/stores/modal.svelte.js';
	import { scrollbarWidth } from '$lib/stores/state';
	import BodyScrollLock from '$lib/utils/BodyScrollLock.svelte';
	import '../app.css';

	let { children } = $props();

	function getScrollbarWidth() {
		if (typeof document === 'undefined') return 0; // SSR 방어

		const el = document.createElement('div');
		el.style.cssText = `
            position: absolute; 
            top: -9999px; 
            width: 100px; 
            height: 100px; 
            overflow: scroll; 
            scrollbar-width: thin;
        `;
		document.body.appendChild(el);

		const width = el.offsetWidth - el.clientWidth;

		document.body.removeChild(el);
		return width;
	}

	function updateScrollbarWidth() {
		const width = getScrollbarWidth();
		scrollbarWidth.set(width);
		document.documentElement.style.setProperty('--scrollbar-gap', `${width}px`);
	}

	$effect(() => {
		updateScrollbarWidth();

		const observer = new ResizeObserver(() => {
			updateScrollbarWidth();
		});

		observer.observe(document.documentElement);

		return () => {
			observer.disconnect();
		};
	});
</script>

<svelte:head>
	<link
		rel="icon"
		href={favicon}
	/>
</svelte:head>

{@render children()}

{#if modal.component}
	<BodyScrollLock />

	<modal.component {...modal.props} />
{/if}
