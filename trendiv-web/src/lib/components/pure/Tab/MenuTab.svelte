<script lang="ts">
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		items: string[];
		current?: number;
		className?: string;
	}

	let { items, current = $bindable(0), className = '' }: Props = $props();

	let tabCount = $derived(Math.max(items.length, 1));
	let tabWidth = $derived(100 / tabCount);
	let leftPos = $derived(current * tabWidth);
</script>

<div class="w-full rounded-xl bg-gray-800 px-1 {className}">
	<div class="relative flex">
		<div
			class={cn(
				'absolute bottom-1 top-1',
				'from-mint-300 to-mint-500 bg-gradient-to-r',
				'rounded-lg opacity-50 blur-sm',
				'transition-all duration-300 ease-out'
			)}
			style="width: {tabWidth}%; left: {leftPos}%;"
		></div>

		<div
			class={cn(
				'absolute bottom-1 top-1',
				'from-mint-400 to-mint-600 bg-gradient-to-r',
				'rounded-lg shadow-sm',
				'transition-all duration-300 ease-out'
			)}
			style="width: {tabWidth}%; left: {leftPos}%;"
		></div>

		{#each items as item, i}
			<button
				onclick={() => (current = i)}
				type="button"
				class={cn(
					'relative z-10 flex-1 rounded-lg py-3 capitalize',
					'transition-colors duration-200',
					'text-md font-bold sm:text-lg',

					'text-gray-100',
					current === i
						? 'dark:text-gray-800'
						: 'sm:text-gray-300 sm:hover:text-gray-100'
				)}
			>
				{item}
			</button>
		{/each}
	</div>
</div>
