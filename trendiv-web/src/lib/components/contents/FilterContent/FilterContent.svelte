<script
	module
	lang="ts"
>
	import type { ArticleStatusFilter } from '$lib/types';
	import type { Component } from 'svelte';

	export interface FilterContentProps {
		tags?: string[];
		selectedTags?: string[];
		categoryList?: string[];
		selectedCategory?: string[];
		/** 개인화 필터 상태 */
		statusFilter?: ArticleStatusFilter;
		onselectCategory?: (category: string) => void;
		onresetCategory?: () => void;
		onchange?: (selectedTags: string[]) => void;
		/** 개인화 필터 변경 콜백 */
		onstatusChange?: (status: ArticleStatusFilter) => void;
		variant?: 'collapsible' | 'flat';
		defaultOpenSections?: string[];
	}

	// 필터 상태 캐싱
	const STORAGE_KEY = 'trendiv_main_filter_open_sections';
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import SearchChip from '$lib/components/pure/Chip/SearchChip.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import IconArrowVertical from '$lib/icons/icon_arrow_vertical.svelte';
	import IconBookmark from '$lib/icons/icon_bookmark.svelte';
	import IconDocument from '$lib/icons/icon_document.svelte';
	import IconHide from '$lib/icons/icon_hide.svelte';
	import IconRefresh from '$lib/icons/icon_refresh.svelte';
	import IconTag from '$lib/icons/icon_tag.svelte';
	import IconUser from '$lib/icons/icon_user.svelte';
	import { cn } from '$lib/utils/ClassMerge';
	import { onMount, tick, onDestroy } from 'svelte';

	let {
		tags = [],
		selectedTags = [],
		categoryList = [],
		selectedCategory = [],
		statusFilter = 'all',
		onselectCategory,
		onresetCategory,
		onchange,
		onstatusChange,
		variant = 'collapsible',
		defaultOpenSections
	}: FilterContentProps = $props();

	// ─────────────────────────────────────────
	// 애니메이션 전용 상태 (UI only)
	// ─────────────────────────────────────────

	type AnimatedTag = {
		name: string;
		is_showing: boolean;
		is_hiding: boolean;
		is_initial: boolean;
	};

	const ANIMATION_DURATION = 450;

	let animatedSelectedTags = $state<AnimatedTag[]>([]);
	let animatedUnselectedTags = $state<AnimatedTag[]>([]);

	let containerState = $state<'hidden' | 'showing' | 'visible' | 'hiding'>(
		'hidden'
	);
	let activeTimers = new Set<ReturnType<typeof setTimeout>>();
	let animatingTags = new Set<string>();
	let isResetting = $state(false);

	// ─────────────────────────────────────────
	// props 변경 감지하여 애니메이션 상태 동기화
	// ─────────────────────────────────────────

	function syncAnimationState(selected: string[]) {
		animatedSelectedTags = selected.map((name) => ({
			name,
			is_showing: false,
			is_hiding: false,
			is_initial: false
		}));

		animatedUnselectedTags = tags
			.filter((tag) => !selected.includes(tag))
			.map((name) => ({
				name,
				is_showing: false,
				is_hiding: false,
				is_initial: false
			}));

		containerState = selected.length > 0 ? 'visible' : 'hidden';
	}

	// 초기 마운트 시 동기화
	$effect(() => {
		if (
			tags.length > 0 &&
			animatedSelectedTags.length === 0 &&
			animatedUnselectedTags.length === 0
		) {
			syncAnimationState(selectedTags);
		}
	});

	// 외부에서 selectedTags가 변경되었을 때 동기화 (애니메이션 중이 아닐 때만)
	let lastSyncedTags = $state<string[]>([]);

	$effect(() => {
		const currentKey = selectedTags.join(',');
		const lastKey = lastSyncedTags.join(',');

		if (currentKey !== lastKey && animatingTags.size === 0 && !isResetting) {
			syncAnimationState(selectedTags);
			lastSyncedTags = [...selectedTags];
		}
	});

	// ─────────────────────────────────────────
	// 유틸리티
	// ─────────────────────────────────────────

	function safeTimeout(callback: () => void, delay: number) {
		const id = setTimeout(() => {
			activeTimers.delete(id);
			callback();
		}, delay);
		activeTimers.add(id);
		return id;
	}

	onDestroy(() => {
		activeTimers.forEach((id) => clearTimeout(id));
		activeTimers.clear();
	});

	// ─────────────────────────────────────────
	// 태그 선택/해제 (즉시 부모에게 알림 + 애니메이션)
	// ─────────────────────────────────────────

	async function showContainer() {
		containerState = 'showing';
		await tick();
		requestAnimationFrame(() => {
			containerState = 'visible';
		});
	}

	async function selectTag(tag: string) {
		if (animatingTags.has(tag)) return;
		animatingTags.add(tag);

		// 내부 상태 기준으로 계산 (hiding 중인 것 제외)
		const currentSelected = animatedSelectedTags
			.filter((t) => !t.is_hiding)
			.map((t) => t.name);
		const newSelected = [...currentSelected, tag];

		lastSyncedTags = newSelected;
		onchange?.(newSelected);

		const isFirstTag =
			animatedSelectedTags.length === 0 ||
			animatedSelectedTags.every((t) => t.is_hiding);

		if (isFirstTag) {
			await showContainer();
		}

		animatedUnselectedTags = animatedUnselectedTags.map((t) =>
			t.name === tag ? { ...t, is_hiding: true, is_showing: false } : t
		);

		animatedSelectedTags = [
			...animatedSelectedTags,
			{ name: tag, is_showing: false, is_hiding: false, is_initial: true }
		];

		await tick();
		requestAnimationFrame(() => {
			animatedSelectedTags = animatedSelectedTags.map((t) =>
				t.name === tag ? { ...t, is_initial: false, is_showing: true } : t
			);
		});

		safeTimeout(() => {
			animatedSelectedTags = animatedSelectedTags.map((t) =>
				t.name === tag ? { ...t, is_showing: false } : t
			);
			animatedUnselectedTags = animatedUnselectedTags.filter(
				(t) => t.name !== tag
			);
			animatingTags.delete(tag);
		}, ANIMATION_DURATION);
	}

	async function unselectTag(tag: string) {
		if (animatingTags.has(tag)) return;
		animatingTags.add(tag);

		// 내부 상태 기준으로 계산 (해제할 태그와 hiding 중인 것 제외)
		const currentSelected = animatedSelectedTags
			.filter((t) => !t.is_hiding && t.name !== tag)
			.map((t) => t.name);

		lastSyncedTags = currentSelected;
		onchange?.(currentSelected);

		const isLastTag =
			animatedSelectedTags.filter((t) => !t.is_hiding).length === 1;

		if (isLastTag) {
			containerState = 'hiding';
		}

		animatedSelectedTags = animatedSelectedTags.map((t) =>
			t.name === tag ? { ...t, is_hiding: true, is_showing: false } : t
		);

		animatedUnselectedTags = [
			...animatedUnselectedTags,
			{ name: tag, is_showing: false, is_hiding: false, is_initial: true }
		];

		await tick();
		requestAnimationFrame(() => {
			animatedUnselectedTags = animatedUnselectedTags.map((t) =>
				t.name === tag ? { ...t, is_initial: false, is_showing: true } : t
			);
		});

		safeTimeout(() => {
			animatedUnselectedTags = animatedUnselectedTags.map((t) =>
				t.name === tag ? { ...t, is_showing: false } : t
			);
			animatedSelectedTags = animatedSelectedTags.filter((t) => t.name !== tag);
			animatingTags.delete(tag);

			if (isLastTag) {
				containerState = 'hidden';
			}
		}, ANIMATION_DURATION);
	}

	async function resetAll() {
		if (isResetting) return;
		isResetting = true;

		// 빈 배열로 초기화
		lastSyncedTags = [];
		onchange?.([]);

		const currentSelectedNames = animatedSelectedTags.map((t) => t.name);

		containerState = 'hiding';

		animatedSelectedTags = animatedSelectedTags.map((tag) => ({
			...tag,
			is_hiding: true,
			is_showing: false
		}));

		const tagsToMove = currentSelectedNames.map((name) => ({
			name,
			is_showing: false,
			is_hiding: false,
			is_initial: true
		}));

		animatedUnselectedTags = [...animatedUnselectedTags, ...tagsToMove];

		await tick();
		requestAnimationFrame(() => {
			animatedUnselectedTags = animatedUnselectedTags.map((t) =>
				currentSelectedNames.includes(t.name) && t.is_initial
					? { ...t, is_initial: false, is_showing: true }
					: t
			);
		});

		safeTimeout(() => {
			animatedSelectedTags = [];
			animatedUnselectedTags = animatedUnselectedTags.map((t) => ({
				...t,
				is_showing: false
			}));
			animatingTags.clear();
			isResetting = false;
			containerState = 'hidden';
		}, ANIMATION_DURATION);
	}

	// ─────────────────────────────────────────
	// 개인화 필터 핸들러
	// ─────────────────────────────────────────

	function handleStatusChange(status: ArticleStatusFilter) {
		onstatusChange?.(status);
	}

	// ─────────────────────────────────────────
	// 캐싱 및 상태 로직 통합
	// ─────────────────────────────────────────

	// 1. 초기 상태 설정 헬퍼
	const initOpenState = (key: string) => {
		const defaults = defaultOpenSections ?? [];
		return defaults.includes(key);
	};

	// 2. 통합된 UI 상태 (초기값은 props 기준)
	let uiState = $state({
		tag: initOpenState('tag'),
		source: initOpenState('source'),
		personal: initOpenState('personal')
	});

	function toggleSection(section: keyof typeof uiState) {
		uiState[section] = !uiState[section];
	}

	let isLoaded = $state(false);
	// 마운트 시 로컬 스토리지 로드 및 애니메이션 제어
	onMount(() => {
		if (!browser) return;

		const cached = localStorage.getItem(STORAGE_KEY);
		if (cached) {
			try {
				// 저장된 설정 덮어씌우기
				uiState = { ...uiState, ...JSON.parse(cached) };
			} catch (e) {
				console.error('Failed to parse filter state', e);
			}
		}
		isLoaded = true; // 로딩 완료
	});

	$effect(() => {
		if (browser && isLoaded) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(uiState));
		}
	});

	// ─────────────────────────────────────────
	// 파생 상태
	// ─────────────────────────────────────────

	let isPersonalOpen = $derived(variant === 'flat' || uiState.personal);
	let isTagOpen = $derived(variant === 'flat' || uiState.tag);
	let isSourceOpen = $derived(variant === 'flat' || uiState.source);
</script>

{#snippet sectionHeader(
	id: keyof typeof uiState,
	label: string,
	icon: Component<{ size?: number; class?: string }>,
	isOpen: boolean
)}
	{@const Icon = icon}
	{#if variant === 'collapsible'}
		<button
			type="button"
			class={cn(
				'mt-4 flex items-center gap-1',
				'max-w-full overflow-hidden',
				'text-mint-700/70 text-sm font-bold'
			)}
			aria-expanded={isOpen}
			onclick={() => toggleSection(id)}
		>
			<Icon
				class="shrink-0"
				size={16}
			/>
			<span class="truncate">{label}</span>
			<IconArrowVertical
				size={16}
				class={cn('transition-transform duration-300', isOpen && '-rotate-180')}
			/>
		</button>
	{:else}
		<div
			class={cn(
				'flex items-center gap-1',
				'text-mint-700/70 text-sm font-bold'
			)}
		>
			<Icon
				class="shrink-0"
				size={12}
			/>
			<span class="truncate">{label}</span>
		</div>
	{/if}
{/snippet}

{#snippet sectionWrapper(isOpen: boolean, children: import('svelte').Snippet)}
	{#if variant === 'collapsible'}
		<div
			class={cn(
				'grid overflow-hidden',
				'transition-[grid-template-rows] duration-300 ease-in-out',
				isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
			)}
		>
			<div
				class={cn(
					'self-start overflow-hidden',
					CommonStyles.DEFAULT_TRANSITION,
					isOpen ? 'opacity-100 delay-200' : 'opacity-0'
				)}
			>
				{@render children()}
			</div>
		</div>
	{:else}
		{@render children()}
	{/if}
{/snippet}

{#snippet personalChips()}
	<div class="mt-4 flex flex-wrap gap-2">
		<SearchChip
			active={statusFilter === 'all'}
			onclick={() => handleStatusChange('all')}
		>
			전체
		</SearchChip>
		<SearchChip
			active={statusFilter === 'bookmarked'}
			onclick={() => handleStatusChange('bookmarked')}
		>
			<span class="flex items-center gap-1.5">
				<IconBookmark
					size={14}
					filled={statusFilter === 'bookmarked'}
				/>
				<span>북마크</span>
			</span>
		</SearchChip>
		<SearchChip
			active={statusFilter === 'hidden'}
			onclick={() => handleStatusChange('hidden')}
		>
			<span class="flex items-center gap-1.5">
				<IconHide size={14} />
				<span>숨김 목록</span>
			</span>
		</SearchChip>
	</div>
{/snippet}

{#snippet tagChips()}
	<!-- Selected Tags -->
	<div
		class={cn(
			'grid overflow-hidden',
			'transition-[grid-template-rows] duration-150 ease-out',
			(containerState === 'hidden' ||
				containerState === 'showing' ||
				containerState === 'hiding') &&
				'grid-rows-[0fr]',
			containerState === 'visible' && 'grid-rows-[1fr]'
		)}
	>
		<div class="overflow-hidden">
			<div class="border-border-default flex items-center border-b py-4">
				<div class="-ml-2 flex flex-wrap gap-y-2">
					{#each animatedSelectedTags as tag (tag.name)}
						<div
							class={cn(
								'inline-grid overflow-hidden',
								'transition-[grid-template-columns,margin] duration-150 ease-out',
								(tag.is_initial || tag.is_hiding) && 'ml-0 grid-cols-[0fr]',
								tag.is_showing && 'ml-2 grid-cols-[1fr]',
								!tag.is_initial &&
									!tag.is_hiding &&
									!tag.is_showing &&
									'ml-2 grid-cols-[1fr]'
							)}
						>
							<div
								class={cn(
									'self-center overflow-hidden',
									'transition-[opacity,transform] duration-400 ease-out',
									(tag.is_initial || tag.is_hiding) && 'scale-0 opacity-0',
									tag.is_showing && 'scale-100 opacity-100 delay-150',
									!tag.is_initial &&
										!tag.is_hiding &&
										!tag.is_showing &&
										'scale-100 opacity-100'
								)}
							>
								<SearchChip
									active={true}
									onclick={() => unselectTag(tag.name)}
									hasClose={true}
								>
									{tag.name}
								</SearchChip>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Unselected Tags -->
	<div class="mt-4 -ml-2 flex flex-wrap gap-y-2">
		<div class="ml-2">
			<SearchChip
				onclick={resetAll}
				active={false}
			>
				<span class="flex items-center gap-1">
					<IconRefresh size={16} />
					<span>초기화</span>
				</span>
			</SearchChip>
		</div>
		{#each animatedUnselectedTags as tag (tag.name)}
			<div
				class={cn(
					'inline-grid overflow-hidden',
					'transition-[grid-template-columns,margin] duration-150 ease-out',
					(tag.is_initial || tag.is_hiding) && 'ml-0 grid-cols-[0fr]',
					tag.is_showing && 'ml-2 grid-cols-[1fr]',
					!tag.is_initial &&
						!tag.is_hiding &&
						!tag.is_showing &&
						'ml-2 grid-cols-[1fr]'
				)}
			>
				<div
					class={cn(
						'self-center overflow-hidden',
						'transition-[opacity,transform] duration-400 ease-out',
						(tag.is_initial || tag.is_hiding) && 'scale-0 opacity-0',
						tag.is_showing && 'scale-100 opacity-100 delay-150',
						!tag.is_initial &&
							!tag.is_hiding &&
							!tag.is_showing &&
							'scale-100 opacity-100'
					)}
				>
					<SearchChip
						active={false}
						onclick={() => selectTag(tag.name)}
					>
						{tag.name}
					</SearchChip>
				</div>
			</div>
		{/each}
	</div>
{/snippet}

{#snippet sourceChips()}
	<div class="mt-4 flex flex-wrap gap-2">
		{#if categoryList.length > 0}
			<SearchChip
				onclick={() => onresetCategory?.()}
				active={false}
			>
				<span class="flex items-center gap-1">
					<IconRefresh size={16} />
					<span>초기화</span>
				</span>
			</SearchChip>
		{/if}
		{#each categoryList as category}
			<SearchChip
				active={selectedCategory.includes(category)}
				onclick={() => onselectCategory?.(category)}
			>
				{category}
			</SearchChip>
		{/each}
	</div>
{/snippet}

<!-- 태그 섹션 -->
{#if tags.length > 0}
	<div
		class={cn(
			variant === 'collapsible' && 'border-border-default mt-4 border-t'
		)}
	>
		{@render sectionHeader('tag', '태그', IconTag, isTagOpen)}
		{@render sectionWrapper(isTagOpen, tagChips)}
	</div>
{/if}

<!-- 출처 섹션 -->
{#if categoryList.length > 0}
	<div
		class={cn(
			'border-border-default mt-4 border-t',
			variant === 'flat' && 'pt-4'
		)}
	>
		{@render sectionHeader('source', '출처', IconDocument, isSourceOpen)}
		{@render sectionWrapper(isSourceOpen, sourceChips)}
	</div>
{/if}

<!-- 개인화 섹션 -->
<div
	class={cn(
		'border-border-default mt-4 border-t',
		variant === 'flat' && 'pt-4'
	)}
>
	{@render sectionHeader('personal', '개인화', IconUser, isPersonalOpen)}
	{@render sectionWrapper(isPersonalOpen, personalChips)}
</div>
