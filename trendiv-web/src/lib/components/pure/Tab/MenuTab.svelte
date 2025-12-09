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

<div
	class={cn(
		'border-mint-200 bg-forest-100/50 rounded-lg border p-1',
		className
	)}
>
	<div class="relative flex">
		<div
			class={cn(
				'absolute inset-y-0',
				'border-mint-200 rounded-md border',
				'shadow-mint-100 bg-gray-fixed-0 shadow-sm',
				'transition-all duration-300 ease-out'
			)}
			style="width: {tabWidth}%; left: {leftPos}%;"
		></div>

		{#each items as item, i}
			<button
				onclick={() => (current = i)}
				type="button"
				class={cn(
					'relative z-10 flex-1 rounded-md px-3 py-2',
					'truncate text-sm font-medium',
					'transition-colors duration-300',
					current === i
						? 'text-forest-fixed-800 font-bold'
						: 'text-neutral-700 hover:font-bold hover:text-neutral-800'
				)}
			>
				{item}
			</button>
		{/each}
	</div>
</div>
