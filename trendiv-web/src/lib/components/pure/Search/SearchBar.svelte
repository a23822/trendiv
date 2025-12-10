<script lang="ts">
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
	class="input-wrapper group/input duration-250 relative flex items-center gap-3 rounded-[14px] px-4 py-1.5 transition-all ease-out"
	class:is-active={isActive}
>
	<!-- 플로팅 라벨 -->
	<label
		for={IDs.CARD.SEARCH_INPUT}
		class={cn(
			'floating-label',
			'absolute left-4 z-10',
			'flex items-center gap-2',
			'bg-gray-100 px-1.5',
			'font-medium text-gray-500',
			'pointer-events-none',
			CommonStyles.DEFAULT_TRANSITION,
			'dark:bg-neutral-800 dark:text-gray-500',
			`${isActive && 'is-active'}`
		)}
	>
		<IconSearch
			className={cn(
				CommonStyles.DEFAULT_TRANSITION,
				`${isActive && 'scale-90'}`
			)}
			size={16}
		/>
		<span>{label}</span>
	</label>

	<!-- 입력 필드 -->
	<input
		bind:this={inputElement}
		bind:value
		type="text"
		id={IDs.CARD.SEARCH_INPUT}
		{placeholder}
		onfocus={() => (isFocused = true)}
		onblur={() => (isFocused = false)}
		onkeydown={handleKeydown}
		class="
			z-20 flex-1 bg-transparent
			py-4 text-[15px] font-medium
			text-gray-900 outline-none
			placeholder:text-transparent
			dark:text-gray-100
		"
		class:show-placeholder={isActive}
		aria-label={label}
	/>

	<!-- 액션 버튼들 -->
	<div class="z-20 flex items-center gap-1">
		<!-- 초기화 버튼 -->
		<button
			type="button"
			class="
				flex h-9 w-9 items-center justify-center
				rounded-[10px] text-gray-500
				opacity-0 transition-all duration-200
				hover:bg-black/5 hover:text-gray-700
				dark:hover:bg-white/10 dark:hover:text-gray-300
			"
			class:show-clear={hasValue}
			onclick={handleClear}
			aria-label="검색어 초기화"
			tabindex={hasValue ? 0 : -1}
		>
			<IconClose size={18} />
		</button>

		<!-- 검색 버튼 -->
		<button
			type="button"
			class="
				bg-primary text-primary-text duration-250 hover:bg-primary-hover dark:bg-mint-400
				dark:hover:bg-mint-300 flex h-12
				w-12 items-center justify-center
				rounded-xl transition-all
				ease-out
				hover:translate-x-0.5 active:scale-95
				disabled:cursor-not-allowed disabled:opacity-50
				dark:text-neutral-900
			"
			onclick={handleSearch}
			disabled={isLoading || !value.trim()}
			aria-label="검색"
		>
			{#if isLoading}
				<div class="spinner h-5 w-5" />
			{:else}
				<IconArrow
					size={20}
					strokeWidth={2.5}
				/>
			{/if}
		</button>
	</div>
</div>

<style>
	.input-wrapper {
		background: rgb(var(--gray-100));
	}

	.input-wrapper.is-active {
		background: rgb(var(--mint-50));
	}

	:global(.dark) .input-wrapper {
		background: rgb(var(--neutral-800));
	}

	:global(.dark) .input-wrapper.is-active {
		background: rgba(27, 168, 150, 0.1);
	}

	/* 플로팅 라벨 */
	.floating-label {
		top: 50%;
		transform: translateY(-50%);
		font-size: 15px;
	}

	.floating-label.is-active {
		top: 0;
		left: 12px;
		font-size: 12px;
		font-weight: 600;
		color: rgb(var(--mint-600));
		background: linear-gradient(
			180deg,
			rgb(var(--bg-main)) 50%,
			rgb(var(--mint-50)) 50%
		);
	}

	:global(.dark) .floating-label.is-active {
		color: rgb(var(--mint-400));
		background: linear-gradient(
			180deg,
			rgb(var(--neutral-900)) 50%,
			rgba(27, 168, 150, 0.1) 50%
		);
	}

	.floating-label.is-active :global(svg) {
		transform: scale(0.9);
	}

	/* placeholder */
	.show-placeholder::placeholder {
		color: rgb(var(--gray-400));
	}

	:global(.dark) .show-placeholder::placeholder {
		color: rgb(var(--gray-600));
	}

	/* 초기화 버튼 */
	.show-clear {
		opacity: 1;
		pointer-events: auto;
	}

	/* 로딩 스피너 */
	.spinner {
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	:global(.dark) .spinner {
		border-color: rgba(0, 0, 0, 0.2);
		border-top-color: rgb(var(--neutral-900));
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
