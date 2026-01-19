<script lang="ts">
	import { CommonStyles } from '$lib/constants/styles';
	import IconArrowVertical from '$lib/icons/icon_arrow_vertical.svelte';
	import IconFilter from '$lib/icons/icon_filter.svelte';
	import { modal } from '$lib/stores/modal.svelte.js';
	import { uiState } from '$lib/stores/state.svelte';
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		onfilter?: () => void;
		class?: string;
	}

	let { onfilter, class: className }: Props = $props();

	let isOpen = $state(false);
	let popoverElement: HTMLDivElement;

	function handleToggle(e: ToggleEvent) {
		isOpen = e.newState === 'open';
	}

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
		popoverElement?.hidePopover();
	}

	function handleFilter() {
		onfilter?.();
		popoverElement?.hidePopover();
	}
</script>

<div
	class={cn('fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6', className)}
	style:margin-right={modal.component
		? `${uiState.scrollbarWidth}px`
		: undefined}
>
	<!-- Main FAB Button (Anchor) -->
	<button
		type="button"
		popovertarget="fab-menu"
		class={cn(
			'[anchor-name:--fab-anchor]',
			'flex h-14 w-14 items-center justify-center',
			'rounded-full shadow-md',
			CommonStyles.DEFAULT_TRANSITION,
			'hover:scale-105 active:scale-95',
			isOpen
				? 'bg-alert shadow-alert/30 text-white'
				: 'bg-mint-500 shadow-mint-500/30 text-white'
		)}
	>
		<div
			class={cn(
				'relative flex h-6 w-6 items-center justify-center',
				isOpen ? 'rotate-135' : 'rotate-0'
			)}
			style="transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);"
		>
			<span class="absolute h-1 w-5 rounded-full bg-current"></span>
			<span class="absolute h-1 w-5 rotate-90 rounded-full bg-current"></span>
		</div>
		<span class="sr-only">{isOpen ? '닫기' : '메뉴 열기'}</span>
	</button>

	<!-- Popover Panel -->
	<div
		bind:this={popoverElement}
		id="fab-menu"
		popover="auto"
		ontoggle={handleToggle}
		class={cn(
			'[position-anchor:--fab-anchor]',
			'top-[anchor(top)] left-[anchor(center)]',
			'-translate-x-1/2 -translate-y-[calc(100%+0.75rem)]',
			'flex flex-col items-center gap-3',
			'opacity-0',
			CommonStyles.DEFAULT_TRANSITION,
			'transition-opacity transition-discrete',
			'[&:popover-open]:opacity-100'
		)}
	>
		<button
			type="button"
			onclick={handleFilter}
			class={cn(
				'flex h-12 w-12 items-center justify-center',
				'rounded-full shadow-md',
				'bg-bg-elevated text-mint-600',
				'border-border-default border',
				'hover:bg-bg-hover hover:text-mint-500',
				'active:scale-95',
				'translate-y-4 scale-50 opacity-0',
				CommonStyles.DEFAULT_TRANSITION,
				'[[popover]:popover-open_&]:translate-y-0',
				'[[popover]:popover-open_&]:scale-100',
				'[[popover]:popover-open_&]:opacity-100',
				'[[popover]:popover-open_&]:delay-100'
			)}
		>
			<IconFilter size={18} />
			<span class="sr-only">필터</span>
		</button>

		<button
			type="button"
			onclick={scrollToTop}
			class={cn(
				'flex h-12 w-12 flex-col items-center justify-center',
				'rounded-full shadow-md',
				'bg-bg-elevated text-mint-600',
				'border-border-default border',
				'hover:bg-bg-hover hover:text-mint-500',
				'active:scale-95',
				'translate-y-4 scale-50 opacity-0',
				CommonStyles.DEFAULT_TRANSITION,
				'[[popover]:popover-open_&]:translate-y-0',
				'[[popover]:popover-open_&]:scale-100',
				'[[popover]:popover-open_&]:opacity-100',
				'[[popover]:popover-open_&]:delay-50'
			)}
		>
			<IconArrowVertical
				size={20}
				class="rotate-180"
			/>
			<IconArrowVertical
				size={20}
				class="-mt-1 rotate-180"
			/>
			<span class="sr-only">맨 위로</span>
		</button>
	</div>
</div>

<style>
	/* @starting-style - Tailwind로 대체 불가 */
	@starting-style {
		[popover]:popover-open {
			opacity: 0;
		}
	}
</style>
