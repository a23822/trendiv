<script
	module
	lang="ts"
>
	import type { Component } from 'svelte';

	export interface FilterContentProps {
		tags?: string[];
		selectedTags?: string[];
		categoryList?: string[];
		selectedCategory?: string[];
		onselectCategory?: (category: string) => void;
		onchange?: (selectedTags: string[]) => void;
		variant?: 'collapsible' | 'flat';
		defaultOpenSections?: string[];
	}
</script>

<script lang="ts">
	import SearchChip from '$lib/components/pure/Chip/SearchChip.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import IconArrowVertical from '$lib/icons/icon_arrow_vertical.svelte';
	import IconDocument from '$lib/icons/icon_document.svelte';
	import IconRefresh from '$lib/icons/icon_refresh.svelte';
	import IconTag from '$lib/icons/icon_tag.svelte';
	import { cn } from '$lib/utils/ClassMerge';
	import { tick, onDestroy } from 'svelte';

	let {
		tags = [],
		selectedTags = [],
		categoryList = [],
		selectedCategory = [],
		onselectCategory,
		onchange,
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
	let openSections = $state(
		new Set<string>(
			defaultOpenSections?.length ? defaultOpenSections : ['tag', 'source']
		)
	);
	let containerState = $state<'hidden' | 'showing' | 'visible' | 'hiding'>(
		'hidden'
	);
	let activeTimers = new Set<ReturnType<typeof setTimeout>>();
	let animatingTags = new Set<string>();
	let isResetting = $state(false);

	// ─────────────────────────────────────────
	// props 변경 감지하여 애니메이션 상태 동기화
	// ─────────────────────────────────────────

	let prevSelectedTags = $state<string[]>([]);

	$effect(() => {
		// props가 외부에서 변경되었을 때 애니메이션 상태 동기화
		const currentSelected = selectedTags;
		const prev = prevSelectedTags;

		// 초기화 또는 외부 변경 감지
		if (JSON.stringify(currentSelected) !== JSON.stringify(prev)) {
			// 애니메이션 중이 아닐 때만 즉시 동기화
			if (animatingTags.size === 0 && !isResetting) {
				syncAnimationState(currentSelected);
			}
			prevSelectedTags = [...currentSelected];
		}
	});

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
			prevSelectedTags = [...selectedTags];
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

	function toggleSection(id: string) {
		openSections = new Set(openSections);
		openSections.has(id) ? openSections.delete(id) : openSections.add(id);
	}

	// ─────────────────────────────────────────
	// 태그 선택/해제 (애니메이션 + 부모에게 위임)
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

		const isFirstTag =
			animatedSelectedTags.length === 0 ||
			animatedSelectedTags.every((t) => t.is_hiding);

		if (isFirstTag) {
			await showContainer();
		}

		// 애니메이션 상태 업데이트
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
			// 애니메이션 완료 후 정리
			animatedSelectedTags = animatedSelectedTags.map((t) =>
				t.name === tag ? { ...t, is_showing: false } : t
			);
			animatedUnselectedTags = animatedUnselectedTags.filter(
				(t) => t.name !== tag
			);
			animatingTags.delete(tag);

			// ✅ 부모에게 변경 위임
			const newSelected = [...selectedTags, tag];
			prevSelectedTags = newSelected;
			onchange?.(newSelected);
		}, ANIMATION_DURATION);
	}

	async function unselectTag(tag: string) {
		if (animatingTags.has(tag)) return;
		animatingTags.add(tag);

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

			// ✅ 부모에게 변경 위임
			const newSelected = selectedTags.filter((t) => t !== tag);
			prevSelectedTags = newSelected;
			onchange?.(newSelected);
		}, ANIMATION_DURATION);
	}

	async function resetAll() {
		if (isResetting) return;
		isResetting = true;

		const currentSelectedNames = [...selectedTags];

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

			// ✅ 부모에게 변경 위임
			prevSelectedTags = [];
			onchange?.([]);
		}, ANIMATION_DURATION);
	}

	// ─────────────────────────────────────────
	// 파생 상태
	// ─────────────────────────────────────────

	let isTagOpen = $derived(variant === 'flat' || openSections.has('tag'));
	let isSourceOpen = $derived(variant === 'flat' || openSections.has('source'));
</script>

{#snippet sectionHeader(
	id: string,
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
				size={12}
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
			<div class="border-default flex items-center border-b-2 py-4">
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
			variant === 'collapsible' && 'border-border-default mt-4 border-t-2'
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
			'border-border-default mt-4 border-t-2',
			variant === 'flat' && 'pt-4'
		)}
	>
		{@render sectionHeader('source', '출처', IconDocument, isSourceOpen)}
		{@render sectionWrapper(isSourceOpen, sourceChips)}
	</div>
{/if}
