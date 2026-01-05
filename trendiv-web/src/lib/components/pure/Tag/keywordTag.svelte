<script lang="ts">
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		tag: string;
		class?: string;
	}

	let { tag, class: className }: Props = $props();
</script>

<span
	class={cn(
		'inline-flex items-center justify-center rounded-md px-2 py-1',
		'bg-neutral-300/50 text-neutral-700',
		'text-[11px] leading-relaxed font-medium tracking-tight',
		className
	)}
>
	{tag}
</span>
