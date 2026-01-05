<script lang="ts">
	import ArrowButton from '$lib/components/pure/Button/ArrowButton.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import { cn } from '$lib/utils/ClassMerge';
	import { capitalizeFirst } from '$lib/utils/string';

	interface Props {
		items: string[];
		selectedIndex?: number;
	}

	let { items, selectedIndex = $bindable(0) }: Props = $props();

	let scrollContainer: HTMLDivElement;

	function scrollLeft() {
		if (selectedIndex > 0) {
			selectedIndex--;
			scrollToIndex(selectedIndex);
		}
	}

	function scrollRight() {
		if (selectedIndex < items.length - 1) {
			selectedIndex++;
			scrollToIndex(selectedIndex);
		}
	}

	function scrollToIndex(index: number) {
		const container = scrollContainer;
		if (!container) return;

		const children = container.children;
		if (children[index]) {
			children[index].scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
				inline: 'center'
			});
		}
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
				'text-sm font-semibold',
				CommonStyles.DEFAULT_TRANSITION_COLOR,
				selectedIndex === index
					? 'bg-neutral-800 text-gray-100 shadow-sm' // 선택됨
					: 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300' // 선택 안 됨
			)}
		>
			{capitalizeFirst(item)}
		</button>
	</div>
{/snippet}

<div class="flex">
	{#if items.length > 1}
		<div class={cn('hidden shrink-0 sm:block', 'p-3')}>
			<ArrowButton
				direction="left"
				onclick={scrollLeft}
				disabled={!canScrollLeft}
			/>
		</div>
	{/if}
	<div
		bind:this={scrollContainer}
		class="flex h-16 flex-1 gap-3 overflow-x-auto"
	>
		{#each items as item, index}
			{@render scrollChip(item, index)}
		{/each}
	</div>
	{#if items.length > 1}
		<div class={cn('hidden shrink-0 sm:block', 'p-3')}>
			<ArrowButton
				onclick={scrollRight}
				disabled={!canScrollRight}
			/>
		</div>
	{/if}
</div>
