<script lang="ts">
	import SearchChip from '$lib/components/pure/Chip/SearchChip.svelte';
	import SearchBar from '$lib/components/pure/Search/SearchBar.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import IconDocument from '$lib/icons/icon_document.svelte';
	import IconFilter from '$lib/icons/icon_filter.svelte';
	import IconRefresh from '$lib/icons/icon_refresh.svelte';
	import IconTag from '$lib/icons/icon_tag.svelte';
	import { cn } from '$lib/utils/ClassMerge';
	import { tick, onDestroy } from 'svelte';

	interface Props {
		tags?: string[];
		selectedTags?: string[];
		searchKeyword?: string;
		isLoadingMore?: boolean;
		categoryList: string[];
		selectedCategory?: string[];
		onselectCategory?: (category: string) => void;
		onsearch?: (value: string) => void;
		onclear?: () => void;
		onchange?: (selectedTags: string[]) => void;
	}

	let {
		tags = [],
		selectedTags = [],
		searchKeyword = $bindable(''),
		categoryList,
		selectedCategory = [],
		onselectCategory,
		isLoadingMore = false,
		onsearch,
		onclear,
		onchange
	}: Props = $props();

	type AnimatedTag = {
		name: string;
		is_showing: boolean;
		is_hiding: boolean;
		is_initial: boolean;
	};

	let isInitialized = false;

	const ANIMATION_DURATION = 450;

	let animatedSelectedTags = $state<AnimatedTag[]>([]);
	let animatedUnselectedTags = $state<AnimatedTag[]>([]);

	// 컨테이너 애니메이션 상태
	let containerState = $state<'hidden' | 'showing' | 'visible' | 'hiding'>(
		'hidden'
	);

	// 타이머 관리 (메모리 누수 방지)
	let activeTimers = new Set<ReturnType<typeof setTimeout>>();

	// 애니메이션 중인 태그 추적 (빠른 클릭 방지)
	let animatingTags = new Set<string>();

	// 안전한 setTimeout (자동 정리)
	function safeTimeout(
		callback: () => void,
		delay: number
	): ReturnType<typeof setTimeout> {
		const id = setTimeout(() => {
			activeTimers.delete(id);
			callback();
		}, delay);
		activeTimers.add(id);
		return id;
	}

	// 컴포넌트 언마운트 시 모든 타이머 정리
	onDestroy(() => {
		activeTimers.forEach((id) => clearTimeout(id));
		activeTimers.clear();
	});

	$effect(() => {
		if (!isInitialized && tags.length > 0) {
			isInitialized = true;

			internalSelectedTags = [...selectedTags];

			animatedSelectedTags = selectedTags.map((name) => ({
				name,
				is_showing: false,
				is_hiding: false,
				is_initial: false
			}));
			animatedUnselectedTags = tags
				.filter((tag) => !selectedTags.includes(tag))
				.map((name) => ({
					name,
					is_showing: false,
					is_hiding: false,
					is_initial: false
				}));

			// 초기 상태 설정
			containerState = selectedTags.length > 0 ? 'visible' : 'hidden';
		}
	});

	let internalSelectedTags = $state<string[]>([]);

	async function showContainer() {
		containerState = 'showing';
		await tick();
		requestAnimationFrame(() => {
			containerState = 'visible';
		});
	}

	async function selectTag(tag: string) {
		// 이미 애니메이션 중이면 무시
		if (animatingTags.has(tag)) return;
		animatingTags.add(tag);

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

		// safeTimeout 사용
		safeTimeout(() => {
			internalSelectedTags = [...internalSelectedTags, tag];
			animatedSelectedTags = animatedSelectedTags.map((t) =>
				t.name === tag ? { ...t, is_showing: false } : t
			);
			animatedUnselectedTags = animatedUnselectedTags.filter(
				(t) => t.name !== tag
			);
			animatingTags.delete(tag); // 애니메이션 완료
			onchange?.(internalSelectedTags);
		}, ANIMATION_DURATION);
	}

	async function unselectTag(tag: string) {
		// 이미 애니메이션 중이면 무시
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

		// safeTimeout 사용
		safeTimeout(() => {
			internalSelectedTags = internalSelectedTags.filter((t) => t !== tag);
			animatedUnselectedTags = animatedUnselectedTags.map((t) =>
				t.name === tag ? { ...t, is_showing: false } : t
			);
			animatedSelectedTags = animatedSelectedTags.filter((t) => t.name !== tag);
			animatingTags.delete(tag); // 애니메이션 완료
			onchange?.(internalSelectedTags);

			if (isLastTag) {
				containerState = 'hidden';
			}
		}, ANIMATION_DURATION);
	}

	// 리셋 중 플래그
	let isResetting = $state(false);

	async function resetAll() {
		// 이미 리셋 중이면 무시
		if (isResetting) return;
		isResetting = true;

		const currentSelectedNames = internalSelectedTags.slice(); // internalSelectedTags 사용

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

		// safeTimeout 사용
		safeTimeout(() => {
			internalSelectedTags = [];
			animatedSelectedTags = [];
			animatedUnselectedTags = animatedUnselectedTags.map((t) => ({
				...t,
				is_showing: false
			}));
			animatingTags.clear(); // 모든 애니메이션 상태 초기화
			isResetting = false; // 리셋 완료
			onchange?.(internalSelectedTags);

			containerState = 'hidden';
		}, ANIMATION_DURATION);
	}
</script>

<!-- 템플릿은 동일 -->
<section
	class={cn(
		CommonStyles.CARD,
		'mb-4 sm:mb-6',
		'top-header-height sticky right-0 left-0 z-999'
	)}
>
	<h2 class="sr-only">검색 카드</h2>
	<SearchBar
		{onsearch}
		{onclear}
		bind:value={searchKeyword}
	/>
	<div class="border-border-default mt-4 border-t-2">
		<div>
			<div
				class={cn(
					'flex items-center gap-1',
					'text-mint-700/70 mt-4 text-lg font-bold'
				)}
			>
				<IconFilter
					class="shrink-0"
					size={20}
				/><span class="truncate">필터</span>
			</div>
			<div
				class={cn(
					'flex items-center gap-1',
					'text-mint-700/70 mt-4 text-sm font-bold'
				)}
			>
				<IconTag
					class="shrink-0"
					size={12}
				/><span class="truncate">태그</span>
			</div>
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
		</div>
	</div>

	{#if categoryList.length > 0}
		<div class="border-border-default mt-4 border-t-2">
			<div
				class={cn(
					'flex items-center gap-1',
					'text-mint-700/70 mt-4 text-sm font-bold'
				)}
			>
				<IconDocument
					class="shrink-0"
					size={12}
				/><span class="truncate">출처</span>
			</div>

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
		</div>
	{/if}
</section>
