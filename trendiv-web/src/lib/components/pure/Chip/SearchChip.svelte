<script lang="ts">
	/**
	 * Chip - 선택 가능한 칩/태그 버튼
	 *
	 * @prop active - 활성화 상태 (기본: false)
	 * @prop disabled - 비활성화 상태 (기본: false)
	 */
	import { CommonStyles } from '$lib/constants/styles';
	import IconClose from '$lib/icons/icon_close.svelte';
	import { cn } from '$lib/utils/ClassMerge';
	import type { Snippet } from 'svelte';

	interface Props {
		active?: boolean;
		disabled?: boolean;
		hasClose?: boolean;
		onclick?: () => void;
		children: Snippet;
	}

	let {
		active = false,
		disabled = false,
		hasClose = false,
		onclick,
		children
	}: Props = $props();
</script>

<button
	type="button"
	class={cn(
		'group/chip min-h-10 px-4',
		'rounded-full border border-gray-200',
		'bg-gray-300/40',
		CommonStyles.DEFAULT_TRANSITION,
		'bg-gray-300/50 text-sm font-semibold text-gray-700',
		'sm:hover:border-gray-500 sm:hover:text-gray-900',
		'disabled:cursor-not-allowed disabled:opacity-50',
		`${active && 'bg-forest-300 sm:bg-forest-300/80 text-gray-0-fixed sm:hover:bg-forest-300 sm:hover:text-gray-0-fixed'}`
	)}
	aria-pressed={active}
	{disabled}
	{onclick}
>
	<span class="flex items-center justify-center gap-1">
		<span class="flex-1">
			{@render children()}
		</span>
		{#if hasClose}
			<span
				class={cn(
					'flex shrink-0 items-center justify-center',
					'h-4 w-4 rounded-full',
					'bg-gray-200/40',
					CommonStyles.DEFAULT_TRANSTION_COLOR,
					'group-hover/chip:bg-gray-0/40'
				)}
			>
				<IconClose size={12} />
			</span>
		{/if}
	</span>
</button>
