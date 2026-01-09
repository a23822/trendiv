<script lang="ts">
	import { CommonStyles } from '$lib/constants/styles';
	import IconClose from '$lib/icons/icon_close.svelte';
	import { cn } from '$lib/utils/ClassMerge';
	import Chip, { type ChipProps } from './Chip.svelte';

	interface Props extends ChipProps {
		hasClose?: boolean;
	}

	let {
		hasClose = false,
		children,
		class: className,
		active = false,
		disabled = false,
		...rest
	}: Props = $props();
</script>

<Chip
	element="button"
	{active}
	{disabled}
	class={className}
	{...rest}
>
	<span class="flex items-center justify-center gap-1">
		<span class="flex-1">
			{#if children}
				{@render children()}
			{/if}
		</span>

		{#if hasClose}
			<span
				class={cn(
					'flex shrink-0 items-center justify-center',
					'h-4 w-4 rounded-full',
					'bg-gray-200/40',
					CommonStyles.DEFAULT_TRANSITION_COLOR,
					'group-hover/chip:bg-gray-0/40'
				)}
			>
				<IconClose size={12} />
			</span>
		{/if}
	</span>
</Chip>
