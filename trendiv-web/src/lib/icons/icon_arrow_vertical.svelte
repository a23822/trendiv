<script lang="ts">
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 16, class: className = '' }: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size * 0.5}
	viewBox="0 0 16 8"
	fill="none"
	stroke="currentColor"
	stroke-linecap="round"
	stroke-linejoin="round"
	stroke-width="2"
	class={cn('shrink-0', className)}
>
	<path d="m3 2.5 5 4 5-4" />
</svg>
