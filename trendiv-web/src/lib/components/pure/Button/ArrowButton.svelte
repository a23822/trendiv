<script lang="ts">
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		direction?: 'left' | 'right';
		class?: string;
		onclick?: () => void;
		disabled?: boolean;
		bgColor?: string;
	}

	let {
		direction = 'right',
		class: className,
		onclick,
		disabled,
		bgColor = 'var(--color-bg-main)'
	}: Props = $props();

	const gradientValue = $derived(
		`linear-gradient(to ${direction === 'left' ? 'right' : 'left'}, ${bgColor}, transparent)`
	);
</script>

<button
	type="button"
	aria-label={direction === 'left' ? '이전' : '다음'}
	{onclick}
	{disabled}
	style:--btn-gradient={gradientValue}
	class={cn(
		'group relative flex items-center justify-center',
		'h-10 w-10 rounded-2xl',
		'bg-neutral-300 text-gray-800 transition-colors sm:hover:bg-neutral-400/80',
		// Disabled State
		'disabled:cursor-not-allowed disabled:bg-gray-900/30 disabled:text-gray-400 disabled:hover:bg-gray-900/30',
		'before:pointer-events-none before:absolute before:top-0 before:h-full before:w-10',
		'before:bg-(image:--btn-gradient)',
		'disabled:before:hidden',
		direction === 'left' ? 'before:left-full' : 'before:right-full',
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
			d="M10.5 18L16.5 12L10.5 6"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</button>
