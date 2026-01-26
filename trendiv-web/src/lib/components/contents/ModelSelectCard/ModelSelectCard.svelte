<script
	module
	lang="ts"
>
	export interface AiModelPickerProps {
		items: string[];
		selectedIndex?: number;
		class?: string;
	}

	// 모델명에서 시리즈 추출
	function getSeriesKey(aiModel: string | undefined | null): string {
		if (!aiModel) return 'unknown';

		const lowerModel = aiModel.toLowerCase();
		if (lowerModel.startsWith('gemini')) return 'Gemini';
		if (lowerModel.startsWith('grok')) return 'Grok';
		return 'unknown';
	}
</script>

<script lang="ts">
	import { CommonStyles } from '$lib/constants/styles';
	import IconArrowVertical from '$lib/icons/icon_arrow_vertical.svelte';
	import IconLogoModel from '$lib/icons/icon_logo_model.svelte';
	import { cn } from '$lib/utils/ClassMerge';
	import { capitalizeFirst } from '$lib/utils/string';

	let {
		items,
		selectedIndex = $bindable(0),
		class: className
	}: AiModelPickerProps = $props();

	// selectedIndex 범위 보정
	const safeSelectedIndex = $derived(
		items.length === 0
			? 0
			: Math.min(Math.max(0, selectedIndex), items.length - 1)
	);

	// --- State ---
	let isOpen = $state(false);
	let isClosing = $state(false);
	let viewingSeries = $state<string | null>(null);

	// --- Derived: 시리즈별 모델 그룹화 ---
	const groupedModels = $derived.by(() => {
		const groups: Record<
			string,
			{ models: { id: string; displayName: string; originalIndex: number }[] }
		> = {};

		items.forEach((aiModel, index) => {
			const seriesKey = getSeriesKey(aiModel);
			if (!groups[seriesKey]) {
				groups[seriesKey] = { models: [] };
			}
			groups[seriesKey].models.push({
				id: `${seriesKey}-${index}`, // crypto.randomUUID() 대신 안정적인 키
				displayName: aiModel,
				originalIndex: index
			});
		});

		return groups;
	});

	// 실제 선택된 모델 정보 (빈 배열 방어)
	const selectedaiModel = $derived(items[safeSelectedIndex] ?? null);
	const selectedSeriesKey = $derived(getSeriesKey(selectedaiModel));

	// 선택된 모델의 id (groupedModels에서 가져옴)
	const selectedModelId = $derived.by(() => {
		const models = groupedModels[selectedSeriesKey]?.models || [];
		const found = models.find((m) => m.originalIndex === safeSelectedIndex);
		return found?.id || '';
	});

	// 선택된 모델의 표시명
	const selectedDisplayName = $derived(selectedaiModel ?? '모델 없음');

	// 현재 보고 있는 시리즈 (펼쳤을 때 휠에 표시)
	const activeSeriesKey = $derived(viewingSeries || selectedSeriesKey);

	// 현재 보고 있는 시리즈의 모델 목록
	const viewingSeriesModels = $derived(
		groupedModels[activeSeriesKey]?.models || []
	);

	// 사용 가능한 시리즈 목록
	const availableSeries = $derived(Object.keys(groupedModels));

	// 모델이 있는지 여부
	const canChangeModel = $derived(items.length > 1);

	// --- Effects ---
	$effect(() => {
		if (!isOpen) {
			viewingSeries = null;
		}
	});

	// selectedIndex가 범위를 벗어나면 보정
	$effect(() => {
		if (items.length > 0 && selectedIndex !== safeSelectedIndex) {
			selectedIndex = safeSelectedIndex;
		}
	});

	// --- Handlers ---
	function handleSeriesClick(seriesKey: string) {
		viewingSeries = seriesKey;
	}

	function handleModelClick(originalIndex: number) {
		selectedIndex = originalIndex;
		viewingSeries = null;
	}

	function removeSeriesPrefix(aiModel: string): string {
		const seriesKey = getSeriesKey(aiModel);
		if (seriesKey === 'unknown') return aiModel;

		let result = aiModel.replace(new RegExp(`^${seriesKey}`, 'i'), '');
		result = result.replace(/^[\s\-_:]+/, '');

		return result || aiModel;
	}

	function toggleDetails(e: Event) {
		e.preventDefault();

		// 모델이 없으면 열지 않음
		if (!canChangeModel) return;

		if (isClosing) return;

		if (isOpen) {
			isClosing = true;
			setTimeout(() => {
				isOpen = false;
				isClosing = false;
			}, 400);
		} else {
			isOpen = true;
		}
	}
</script>

<details
	bind:open={isOpen}
	class={cn('details', 'relative', className)}
>
	<summary
		class={cn(
			'bg-bg-main',
			'cursor-pointer list-none [&::-webkit-details-marker]:hidden',
			!canChangeModel && 'pointer-events-none'
		)}
		onclick={toggleDetails}
	>
		<div
			class={cn(
				'group',
				'flex items-center justify-between gap-2',
				'h-15 p-4',
				'border-border-default rounded-xl border',
				'transition-all duration-300 ease-in-out',
				isOpen && 'rounded-b-none border-b-transparent'
			)}
		>
			<div class={cn('flex items-center gap-2 overflow-hidden')}>
				{#if selectedaiModel}
					<IconLogoModel
						model={selectedaiModel}
						size={16}
						id={selectedModelId}
					/>
				{/if}
				<span class="truncate text-lg">
					{capitalizeFirst(selectedDisplayName)}
				</span>
			</div>
			<div
				class={cn(
					'shrink-0',
					'flex items-center gap-1',
					'text-gray-500 group-hover:text-gray-700'
				)}
			>
				{#if canChangeModel}
					<span class="text-sm">{isOpen ? '접기' : '변경'}</span>
					<IconArrowVertical
						size={16}
						class={cn(
							'transition-transform duration-300',
							isOpen && 'rotate-180'
						)}
					/>
				{/if}
			</div>
		</div>
		<!-- 높이 애니메이션용 div -->
		<div
			aria-hidden="true"
			class={cn(
				'overflow-hidden',
				'grid',
				'transition-all duration-300',
				'border-border-default rounded-b-xl border border-t-0',
				isOpen ? 'opacity-100' : 'border-x-0 opacity-0',
				isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
			)}
		>
			<div class={cn('overflow-hidden')}>
				<div class="flex h-50">
					<div class={cn('flex-1')}></div>
					<div class={cn('flex-1')}></div>
				</div>
			</div>
		</div>
	</summary>
	<div
		class={cn(
			'details_picker',
			'absolute inset-x-0 bottom-0',
			'flex gap-2',
			'h-50 p-2'
		)}
		data-closing={isClosing}
	>
		<div
			class={cn('flex-1', 'overflow-hidden', 'bg-bg-surface rounded-lg p-2')}
		>
			<div class="flex h-full flex-col gap-2">
				<em class="ml-1 shrink-0 text-xs font-semibold sm:text-sm">AI 모델</em>
				<div
					class={cn(
						'relative h-full flex-1 overflow-hidden',
						'before:from-bg-surface before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-6 before:bg-linear-to-b before:to-transparent',
						'after:from-bg-surface after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-6 after:bg-linear-to-t after:to-transparent'
					)}
				>
					<div class="scrollbar-hide h-full overflow-y-auto py-6">
						{#each availableSeries as seriesKey (seriesKey)}
							{@const isViewing = seriesKey === activeSeriesKey}
							{@const isSelected = seriesKey === selectedSeriesKey}
							<button
								type="button"
								class={cn(
									'flex w-full items-center justify-center',
									CommonStyles.DEFAULT_TRANSITION_COLOR,
									'rounded-lg',
									isSelected && 'bg-bg-main shadow-xs'
								)}
								onclick={() => handleSeriesClick(seriesKey)}
							>
								<span
									class={cn(
										'block truncate',
										CommonStyles.DEFAULT_TRANSITION,
										'text-lg',
										'p-2',
										isViewing
											? 'scale-105 font-semibold text-gray-900'
											: 'scale-90 text-gray-500'
									)}
								>
									{seriesKey}
								</span>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
		<div
			class={cn('flex-1', 'overflow-hidden', 'bg-bg-surface rounded-lg p-2')}
		>
			<div class="flex h-full flex-col gap-2">
				<em class="ml-1 shrink-0 text-xs font-semibold sm:text-sm">버전</em>
				<div
					class={cn(
						'relative h-full flex-1 overflow-hidden',
						'before:from-bg-surface before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-6 before:bg-linear-to-b before:to-transparent',
						'after:from-bg-surface after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-6 after:bg-linear-to-t after:to-transparent'
					)}
				>
					<div class="scrollbar-hide h-full overflow-y-auto py-6">
						{#each viewingSeriesModels as model (model.id)}
							{@const isSelected = model.originalIndex === safeSelectedIndex}
							<button
								type="button"
								class={cn(
									'flex w-full items-center justify-center',
									CommonStyles.DEFAULT_TRANSITION_COLOR,
									'rounded-lg',
									isSelected && 'bg-bg-main shadow-xs'
								)}
								onclick={() => handleModelClick(model.originalIndex)}
							>
								<span
									class={cn(
										'block truncate',
										CommonStyles.DEFAULT_TRANSITION,
										'text-lg',
										'p-2',
										isSelected ? 'font-semibold text-gray-900' : 'text-gray-500'
									)}
								>
									{capitalizeFirst(removeSeriesPrefix(model.displayName))}
								</span>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</details>

<style lang="scss">
	.details_picker {
		opacity: 0;
		transition: opacity 0.4s ease-in-out;
		pointer-events: none;
	}
	.details[open] {
		.details_picker[data-closing='false'] {
			opacity: 1;
			pointer-events: auto;
			transition-delay: 0.2s;

			@starting-style {
				opacity: 0;
			}
		}
	}
</style>
