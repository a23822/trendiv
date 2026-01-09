<script lang="ts">
	import ArrowButton from '$lib/components/pure/Button/ArrowButton.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import { cn } from '$lib/utils/ClassMerge';
	import { capitalizeFirst } from '$lib/utils/string';

	interface Props {
		items: string[];
		selectedIndex?: number;
		class?: string;
	}

	let {
		items,
		selectedIndex = $bindable(0),
		class: className
	}: Props = $props();

	let scrollContainer: HTMLDivElement;
	let isDragging = false;
	let startX: number;
	let scrollLeftStart: number;

	// --- [1] 스마트 중앙 스크롤 로직 ---
	function smartScrollTo(index: number) {
		if (!scrollContainer) return;
		const targetNode = scrollContainer.children[index] as HTMLElement;
		if (!targetNode) return;

		const containerWidth = scrollContainer.clientWidth;
		const targetLeft = targetNode.offsetLeft;
		const targetWidth = targetNode.offsetWidth;
		const maxScroll = scrollContainer.scrollWidth - containerWidth;

		let targetScroll = targetLeft - containerWidth / 2 + targetWidth / 2;
		targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

		scrollContainer.scrollTo({
			left: targetScroll,
			behavior: 'smooth'
		});
	}

	$effect(() => {
		smartScrollTo(selectedIndex);
	});

	// --- [2] 이동 핸들러 ---
	function move(dir: 1 | -1) {
		const next = selectedIndex + dir;
		if (next >= 0 && next < items.length) {
			selectedIndex = next;
		}
	}

	function goFirst() {
		selectedIndex = 0;
	}

	function goLast() {
		selectedIndex = items.length - 1;
	}

	// --- [3] 드래그 스크롤 ---
	function onMouseDown(e: MouseEvent) {
		isDragging = true;
		startX = e.pageX - scrollContainer.offsetLeft;
		scrollLeftStart = scrollContainer.scrollLeft;
		scrollContainer.style.cursor = 'grabbing';
	}

	function onMouseUp() {
		isDragging = false;
		scrollContainer.style.cursor = 'grab';
	}

	function onMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		e.preventDefault();
		const x = e.pageX - scrollContainer.offsetLeft;
		const walk = (x - startX) * 1.5;
		scrollContainer.scrollTo({
			left: scrollLeftStart - walk,
			behavior: 'auto'
		});
	}

	let canScrollLeft = $derived(selectedIndex > 0);
	let canScrollRight = $derived(selectedIndex < items.length - 1);
</script>

{#snippet scrollChip(item: string, index: number)}
	<div class="shrink-0 self-center">
		<button
			type="button"
			onclick={() => (selectedIndex = index)}
			class={cn(
				'rounded-2xl px-3 py-2',
				'text-sm font-semibold whitespace-nowrap',
				'transition-colors duration-200',
				selectedIndex === index
					? 'bg-neutral-800 text-gray-100 shadow-sm'
					: 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
			)}
		>
			{capitalizeFirst(item)}
		</button>
	</div>
{/snippet}

{#snippet doubleArrowIcon(direction: 'left' | 'right')}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		{#if direction === 'left'}
			<path d="m11 17-5-5 5-5" />
			<path d="m18 17-5-5 5-5" />
		{:else}
			<path d="m13 17 5-5-5-5" />
			<path d="m6 17 5-5-5-5" />
		{/if}
	</svg>
{/snippet}

<div class={cn('flex flex-col gap-3', className)}>
	<div
		bind:this={scrollContainer}
		onmousedown={onMouseDown}
		onmouseleave={onMouseUp}
		onmouseup={onMouseUp}
		onmousemove={onMouseMove}
		class={cn(
			'scrollbar-hide flex w-full gap-3 overflow-x-auto',
			'cursor-grab px-1 py-1',
			'scroll-smooth'
		)}
	>
		{#each items as item, index}
			{@render scrollChip(item, index)}
		{/each}
	</div>

	<div class="flex items-center justify-center gap-4 py-1">
		<button
			type="button"
			onclick={goFirst}
			disabled={!canScrollLeft}
			class="text-gray-400 transition-colors hover:text-gray-800 disabled:opacity-30"
			aria-label="맨 처음으로"
		>
			{@render doubleArrowIcon('left')}
		</button>

		<ArrowButton
			direction="left"
			onclick={() => move(-1)}
			disabled={!canScrollLeft}
			class="border border-gray-200 shadow-sm"
		/>

		<ArrowButton
			direction="right"
			onclick={() => move(1)}
			disabled={!canScrollRight}
			class="border border-gray-200 shadow-sm"
		/>

		<button
			type="button"
			onclick={goLast}
			disabled={!canScrollRight}
			class="text-gray-400 transition-colors hover:text-gray-800 disabled:opacity-30"
			aria-label="맨 끝으로"
		>
			{@render doubleArrowIcon('right')}
		</button>
	</div>
</div>
