<script lang="ts">
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		direction?: 'left' | 'right';
		class?: string;
		onclick?: () => void;
		disabled?: boolean;
	}

	let {
		direction = 'right',
		class: className,
		onclick,
		disabled
	}: Props = $props();
</script>

<button
	type="button"
	aria-label={direction === 'left' ? '이전' : '다음'}
	{onclick}
	{disabled}
	class={cn(
		'flex items-center justify-center',
		'h-10 w-10 rounded-xl',
		'bg-gray-300/60 text-gray-800 sm:hover:bg-neutral-300/80',
		className
	)}
>
	<svg
		class={cn(direction === 'left' && 'rotate-180')}
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M9 18L15 12L9 6"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</button>
