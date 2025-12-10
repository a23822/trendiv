<script lang="ts">
	import DotLoading from '$lib/components/pure/Load/DotLoading.svelte';
	import { IDs } from '$lib/constants/ids';
	import { CommonStyles } from '$lib/constants/styles';
	import IconArrow from '$lib/icons/icon_arrow.svelte';
	import IconClose from '$lib/icons/icon_close.svelte';
	import IconSearch from '$lib/icons/icon_search.svelte';
	import { cn } from '$lib/utils/ClassMerge';

	let {
		value = $bindable(''),
		placeholder = '검색어를 입력해주세요.',
		isLoading = false,
		label = '트렌드 검색',
		onsearch,
		onclear
	}: {
		value?: string;
		placeholder?: string;
		isLoading?: boolean;
		label?: string;
		onsearch?: (value: string) => void;
		onclear?: () => void;
	} = $props();

	let inputElement: HTMLInputElement;
	let isFocused = $state(false);

	let hasValue = $derived(value.length > 0);
	let isActive = $derived(isFocused || hasValue);

	function handleSearch() {
		if (value.trim()) {
			onsearch?.(value.trim());
		}
	}

	function handleClear() {
		value = '';
		onclear?.();
		inputElement?.focus();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSearch();
		}
		if (e.key === 'Escape') {
			handleClear();
		}
	}
</script>

<div
	class={cn(
		'group/input relative z-20 flex items-center gap-3',
		'rounded-xl px-4 py-1',
		CommonStyles.DEFAULT_TRANSITION,
		'border-mint-200/50 border-2 bg-gray-100',
		isActive && 'border-forest-200 shadow-forest-200/30 bg-gray-0 shadow-md'
	)}
>
	<label
		for={IDs.CARD.SEARCH_INPUT}
		class={cn(
			'pointer-events-none absolute flex items-center gap-1',
			CommonStyles.DEFAULT_TRANSITION,
			isActive
				? [
						'bottom-[100%] left-3 translate-y-1/2',
						'text-mint-600 text-xs font-semibold',
						'bg-gray-0 px-1'
					]
				: [
						'bottom-1/2 left-4 translate-y-1/2',
						'text-base font-medium text-gray-500'
					]
		)}
	>
		<div
			class={cn('transition-transform duration-200', isActive && 'scale-90')}
		>
			<IconSearch size={16} />
		</div>
		<span>{label}</span>
	</label>

	<div class="flex-1 basis-full overflow-hidden">
		<input
			bind:this={inputElement}
			bind:value
			type="text"
			id={IDs.CARD.SEARCH_INPUT}
			{placeholder}
			onfocus={() => (isFocused = true)}
			onblur={() => (isFocused = false)}
			onkeydown={handleKeydown}
			class={cn(
				'w-full truncate bg-transparent py-4 text-base text-gray-800 outline-none',
				'placeholder:transition-colors placeholder:duration-300 placeholder:ease-in-out',
				isActive ? 'placeholder:text-gray-500' : 'placeholder:text-transparent'
			)}
			aria-label={label}
		/>
	</div>

	<div class="flex shrink-0 items-center gap-2">
		<button
			type="button"
			class={cn(
				'flex h-9 w-9 items-center justify-center rounded-lg',
				CommonStyles.DEFAULT_TRANSTION_COLOR,
				'bg-gray-300/50 text-gray-700',
				'sm:bg-transparent sm:text-gray-500',
				'sm:hover:bg-gray-300/50 sm:hover:text-gray-700',
				hasValue
					? 'pointer-events-auto opacity-100'
					: 'pointer-events-none opacity-0'
			)}
			onclick={handleClear}
			aria-label="검색어 초기화"
			tabindex={hasValue ? 0 : -1}
		>
			<IconClose size={18} />
		</button>

		<button
			type="button"
			class={cn(
				'flex h-12 w-12 items-center justify-center rounded-xl',
				CommonStyles.DEFAULT_TRANSTION_COLOR,
				'bg-mint-200 text-gray-800',
				'active:scale-95 sm:hover:translate-x-0.5',
				'disabled:bg-mint-200/50 disabled:cursor-not-allowed disabled:text-gray-800/50'
			)}
			onclick={handleSearch}
			disabled={isLoading || !value.trim()}
			aria-label="검색"
		>
			{#if isLoading}
				<DotLoading
					withBackground={false}
					size="sm"
				/>
			{:else}
				<IconArrow
					size={20}
					strokeWidth={2.5}
				/>
			{/if}
		</button>
	</div>
</div>
