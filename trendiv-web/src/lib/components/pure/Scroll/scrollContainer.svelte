<script
	module
	lang="ts"
>
	export interface ScrollContainerProps {
		items: string[];
		selectedIndex?: number;
		class?: string;
	}
</script>

<script lang="ts">
	import { CommonStyles } from '$lib/constants/styles';
	import { cn } from '$lib/utils/ClassMerge';
	import { capitalizeFirst } from '$lib/utils/string';

	let {
		items,
		selectedIndex = $bindable(0),
		class: className
	}: ScrollContainerProps = $props();

	let containerRef: HTMLDivElement;
	let trackRef: HTMLDivElement;
	let chipRefs: HTMLButtonElement[] = $state([]);
	let translateX = $state(0);
	let isInitialized = $state(false);
	let isManualScroll = $state(false);

	function calculateTranslateX(index: number): number {
		if (!containerRef || !chipRefs[index] || !trackRef) return 0;

		const containerWidth = containerRef.clientWidth;
		const chip = chipRefs[index];
		const chipLeft = chip.offsetLeft;
		const chipWidth = chip.offsetWidth;
		const trackWidth = trackRef.scrollWidth;

		let targetX = -(chipLeft - containerWidth / 2 + chipWidth / 2);

		const minX = -(trackWidth - containerWidth);
		const maxX = 0;

		return Math.max(minX, Math.min(targetX, maxX));
	}

	function getScrollBounds() {
		if (!containerRef || !trackRef) return { minX: 0, maxX: 0 };
		const minX = -(trackRef.scrollWidth - containerRef.clientWidth);
		const maxX = 0;
		return { minX, maxX };
	}

	// 초기화
	$effect(() => {
		if (containerRef && trackRef && chipRefs.length > 0 && !isInitialized) {
			setTimeout(() => {
				translateX = calculateTranslateX(selectedIndex);
				isInitialized = true;
			}, 50);
		}
	});

	// selectedIndex 변경 시 (수동 스크롤 중이 아닐 때만)
	$effect(() => {
		if (isInitialized && !isManualScroll) {
			translateX = calculateTranslateX(selectedIndex);
		}
	});

	// 칩 클릭 - 선택 변경 + 중앙 정렬
	function handleChipClick(index: number) {
		isManualScroll = false;
		selectedIndex = index;
	}

	// 스크롤만 (선택 변경 없음)
	function scroll(direction: number) {
		if (!containerRef || !trackRef) return;

		isManualScroll = true;

		const containerWidth = containerRef.clientWidth;
		const pageAmount = containerWidth * 0.8;
		const { minX, maxX } = getScrollBounds();

		let newX = translateX - direction * pageAmount;
		newX = Math.max(minX, Math.min(newX, maxX));

		translateX = newX;
	}

	// ✅ 스크롤 가능 여부 - 값으로 평가
	let canScrollLeft = $derived(translateX < 0);

	// ✅ 수정: 함수가 아닌 값으로
	let canScrollRight = $derived.by(() => {
		const { minX } = getScrollBounds();
		// 소수점 오차 대응
		return translateX > minX + 1;
	});
</script>

{#snippet scrollChip(item: string, index: number)}
	<button
		type="button"
		bind:this={chipRefs[index]}
		onclick={() => handleChipClick(index)}
		class={cn(
			'shrink-0 rounded-full px-4 py-2',
			'text-sm whitespace-nowrap',
			'border-[1.5px]',
			CommonStyles.DEFAULT_TRANSITION,
			selectedIndex === index
				? 'bg-mint-500 text-gray-0-fixed border-mint-500'
				: 'border-neutral-300 bg-transparent text-neutral-600 hover:border-neutral-400'
		)}
	>
		{capitalizeFirst(item)}
	</button>
{/snippet}

<div class={cn('bg-gray-0', className)}>
	<!-- 칩 컨테이너 -->
	<div
		bind:this={containerRef}
		class="overflow-hidden"
	>
		<div
			bind:this={trackRef}
			class="flex gap-2 transition-transform duration-300 ease-out"
			style:transform="translateX({translateX}px)"
		>
			{#each items as item, index}
				{@render scrollChip(item, index)}
			{/each}
		</div>
	</div>

	<!-- 네비게이션 -->
	{#if items.length > 1}
		<div
			class="mt-6 flex items-center justify-center gap-3 border-t border-neutral-200 py-4"
		>
			<!-- 왼쪽 스크롤 -->
			<button
				type="button"
				onclick={() => scroll(-1)}
				disabled={!canScrollLeft}
				aria-label="왼쪽으로 스크롤"
				class={cn(
					'flex h-8 w-8 items-center justify-center rounded-full',
					'border border-neutral-300 text-neutral-500',
					CommonStyles.DEFAULT_TRANSITION,
					'hover:bg-neutral-100',
					'disabled:cursor-not-allowed disabled:opacity-30'
				)}
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="m15 18-6-6 6-6" />
				</svg>
			</button>

			<span class="px-2 text-xs text-neutral-500 tabular-nums">
				{selectedIndex + 1} / {items.length}
			</span>

			<!-- 오른쪽 스크롤 -->
			<button
				type="button"
				onclick={() => scroll(1)}
				disabled={!canScrollRight}
				aria-label="오른쪽으로 스크롤"
				class={cn(
					'flex h-8 w-8 items-center justify-center rounded-full',
					'bg-mint-500 text-gray-0-fixed',
					CommonStyles.DEFAULT_TRANSITION,
					'disabled:cursor-not-allowed disabled:opacity-30'
				)}
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
			</button>
		</div>
	{/if}
</div>
