<script lang="ts">
	import IconArrow from '$lib/icons/icon_arrow.svelte';
	import { cn } from '$lib/utils/ClassMerge';
	import Chip, { type ChipProps } from './Chip.svelte';

	interface Option {
		label: string;
		value: string;
	}

	// children은 사용하지 않으므로 제외
	interface Props extends Omit<ChipProps, 'children'> {
		value: string;
		options: Option[];
		placeholder?: string;
		onchange?: (newValue: string) => void;
	}

	let {
		value = $bindable(),
		options,
		placeholder = '선택',
		onchange,
		active = false,
		disabled = false, // 여기도 명시적으로 선언
		class: className,
		...rest
	}: Props = $props();

	// 값이 선택되었거나, 외부에서 active를 줬을 때 활성화
	const isActive = $derived(active || !!value);

	function handleChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		value = target.value;
		onchange?.(value);
	}
</script>

<Chip
	element="label"
	active={isActive}
	{disabled}
	class={cn('relative cursor-pointer hover:bg-gray-200/50', className)}
	{...rest}
>
	<select
		bind:value
		onchange={handleChange}
		{disabled}
		class={cn(
			'z-10 h-full w-full cursor-pointer appearance-none border-none bg-transparent py-0 pr-6 pl-0 text-inherit outline-none focus:ring-0',
			disabled && 'cursor-not-allowed'
		)}
	>
		{#if !value && placeholder}
			<option
				value=""
				disabled
				selected
				hidden>{placeholder}</option
			>
		{/if}
		{#each options as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>

	<div
		class="pointer-events-none absolute right-3 z-0 flex items-center justify-center"
	>
		<div class="transition-transform duration-200 {value ? 'rotate-180' : ''}">
			<IconArrow size={12} />
		</div>
	</div>
</Chip>
