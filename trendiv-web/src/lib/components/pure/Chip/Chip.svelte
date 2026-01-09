<script
	module
	lang="ts"
>
	import type { Snippet } from 'svelte';

	export interface ChipProps {
		active?: boolean;
		disabled?: boolean;
		element?: 'button' | 'label' | 'div';
		class?: string;
		onclick?: () => void;
		children: Snippet;
		[key: string]: any;
	}
</script>

<script lang="ts">
	import { CommonStyles } from '$lib/constants/styles';
	import { cn } from '$lib/utils/ClassMerge';

	let {
		active = false,
		disabled = false,
		element = 'div',
		class: className,
		onclick,
		children,
		...rest
	}: ChipProps = $props();

	const baseClass = $derived(
		cn(
			// 1. 공통 레이아웃 & 모양
			'group/chip relative min-h-10 px-4 inline-flex items-center justify-center gap-1.5',
			'rounded-full border border-gray-200',
			'bg-gray-300/40',
			CommonStyles.DEFAULT_TRANSITION,

			// 2. 텍스트 스타일
			'text-sm font-semibold text-gray-700',

			// 3. 인터랙션
			'sm:hover:border-gray-500 sm:hover:text-gray-900',
			'disabled:cursor-not-allowed disabled:opacity-50',

			// 4. 활성화 상태
			active &&
				'bg-forest-300 sm:bg-forest-300/80 text-gray-0-fixed sm:hover:bg-forest-300 sm:hover:text-gray-0-fixed',
			className
		)
	);
</script>

<svelte:element
	this={element}
	role={element === 'button' ? 'button' : undefined}
	type={element === 'button' ? 'button' : undefined}
	class={baseClass}
	{onclick}
	{disabled}
	{...rest}
>
	{@render children()}
</svelte:element>
