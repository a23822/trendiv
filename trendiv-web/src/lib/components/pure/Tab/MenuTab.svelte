<script lang="ts">
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
			class="from-mint-300 to-mint-500 absolute bottom-1 top-1 rounded-lg bg-gradient-to-r opacity-50 blur-sm transition-all duration-300 ease-out"
			style="width: {tabWidth}%; left: {leftPos}%;"
		></div>

		<div
			class="from-mint-400 to-mint-600 absolute bottom-1 top-1 rounded-lg bg-gradient-to-r shadow-sm transition-all duration-300 ease-out"
			style="width: {tabWidth}%; left: {leftPos}%;"
		></div>

		{#each items as item, i}
			<button
				onclick={() => (current = i)}
				type="button"
				class="relative z-10 flex-1 rounded-lg py-2 text-sm font-bold capitalize transition-colors duration-200
            {current === i ? 'text-white' : 'text-gray-500 hover:text-gray-700'}"
			>
				{item}
			</button>
		{/each}
	</div>
</div>
