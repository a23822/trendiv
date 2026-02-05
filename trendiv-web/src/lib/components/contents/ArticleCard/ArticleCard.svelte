<!-- https://www.figma.com/design/jxEwxoZSxmKtjMzQkeKkcP/Trendiv?node-id=12-5&t=OpHyXleilZSkLFzr-4  -->
<script lang="ts">
	import KeywordTag from '$lib/components/pure/Tag/keywordTag.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import IconBookmark from '$lib/icons/icon_bookmark.svelte';
	import IconHide from '$lib/icons/icon_hide.svelte';
	import IconLink from '$lib/icons/icon_link.svelte';
	import IconLogoModel from '$lib/icons/icon_logo_model.svelte';
	import IconLogoSource from '$lib/icons/icon_logo_source.svelte';
	import { bookmarks } from '$lib/stores/bookmarks.svelte.ts';
	import { hiddenArticles } from '$lib/stores/hiddenarticles.svelte.ts';
	import type { Trend } from '$lib/types';
	import { cn } from '$lib/utils/ClassMerge';
	import { formatDate } from '$lib/utils/date';
	import { capitalizeFirst } from '$lib/utils/string';
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		trend: Trend;
		onclick?: () => void;
		isForceExpand?: boolean;
		statusFilter?: string;
	}

	let {
		trend,
		onclick,
		isForceExpand = false,
		statusFilter = 'all'
	}: Props = $props();

	// 분석 결과
	const analysis = $derived(
		trend.represent_result ||
			(trend.analysis_results && trend.analysis_results.length > 0
				? trend.analysis_results[0]
				: null)
	);

	const extraModelCount = $derived(
		Math.max(0, (trend.analysis_results?.length ?? 0) - 1)
	);

	// 표시 데이터
	const iconId = $derived(`article-${trend.id}`);
	const displayTitle = $derived(analysis?.title_ko || trend.title || '');
	const displaySummary = $derived(analysis?.oneLineSummary || '');
	const displayScore = $derived(analysis?.score ?? 0);
	const displayTags = $derived(analysis?.tags || []);
	const displayModel = $derived(analysis?.aiModel || 'AI Analysis');
	const displayLink = $derived(trend.link || '');
	const displayCategory = $derived(trend.category || 'General');
	const displayDate = $derived(trend.date ? formatDate(trend.date) : '');

	// 스토어 상태
	const isBookmarked = $derived(bookmarks.isBookmarked(trend.link));
	const isHiddenInStore = $derived(hiddenArticles.list.includes(trend.link));

	// 애니메이션 상태 (전체 목록에서 숨김 추가 시)
	const isRecentlyHidden = $derived(
		hiddenArticles.recentlyHidden.includes(trend.link)
	);

	// 컴포넌트 내부 상태
	let isCollapsed = $state(false);
	let isHiddenHovered = $state(false);
	let isAnimating = $state(false);

	// 이전 상태 추적
	let prevHiddenState: boolean | null = null;
	let isMounted = false;

	onMount(() => {
		// 마운트 시 상태 결정
		if (isRecentlyHidden) {
			// 방금 숨김 처리됨: 펼친 상태에서 시작 → 애니메이션
			prevHiddenState = false;
			isCollapsed = false;
		} else {
			// 기존 상태: 숨김이면 접힌 상태로
			prevHiddenState = isHiddenInStore;
			isCollapsed = isHiddenInStore && !isForceExpand;
		}
		isMounted = true;
	});

	// 상태 변화 감지 및 애니메이션
	$effect(() => {
		if (!isMounted) return;

		const currentHidden = isHiddenInStore;
		const forceExpand = isForceExpand;

		// 방금 숨김 처리됨 → 접기 애니메이션
		if (isRecentlyHidden && currentHidden && !isCollapsed && !forceExpand) {
			requestAnimationFrame(() => {
				isCollapsed = true;
			});
			prevHiddenState = true;
			return;
		}

		// 일반적인 상태 변경 처리
		if (currentHidden !== prevHiddenState) {
			prevHiddenState = currentHidden;

			if (currentHidden && !forceExpand) {
				requestAnimationFrame(() => {
					isCollapsed = true;
				});
			} else {
				isCollapsed = false;
			}
		}

		// forceExpand 처리
		if (forceExpand && isCollapsed) {
			isCollapsed = false;
		}
	});

	onDestroy(() => {
		isMounted = false;
	});

	function handleBookmark(e: MouseEvent) {
		e.stopPropagation();
		bookmarks.toggle(trend);
	}

	function handleHide(e: MouseEvent) {
		e.stopPropagation();
		hiddenArticles.toggle(trend);
	}
</script>

<div
	class={cn(
		CommonStyles.CARD,
		'group relative flex h-full flex-col overflow-hidden bg-(--color-gray-0)'
	)}
>
	<!-- Gradient Overlay -->
	<div
		class="pointer-events-none absolute top-0 right-0 left-0 h-40 bg-linear-to-b from-(--color-mint-200)/20 to-transparent"
	></div>

	<div
		class={cn(
			'grid',
			(isCollapsed || isAnimating) && 'overflow-hidden',
			'transition-[grid-template-rows] duration-500 ease-in-out',
			isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
		)}
		ontransitionstart={(e) => {
			if (e.propertyName === 'grid-template-rows') isAnimating = true;
		}}
		ontransitionend={(e) => {
			if (e.propertyName === 'grid-template-rows') isAnimating = false;
		}}
	>
		<div
			class={cn(
				'min-h-0',
				(isCollapsed || isAnimating) && 'overflow-hidden',
				'transition-opacity duration-500 ease-in-out',
				isCollapsed ? 'opacity-0' : 'opacity-100'
			)}
		>
			<!-- articleCard - header -->
			<div class="relative z-10 mb-4 flex flex-col gap-2">
				<!-- aiInfoArea -->
				<div class="flex h-5 items-center justify-between gap-1">
					<div class="flex items-center gap-2 overflow-hidden">
						<!-- Score -->
						<div
							class={cn(
								'flex shrink-0 items-center gap-1.5 text-xs font-bold tabular-nums',
								displayScore >= 8
									? 'text-(--color-primary)'
									: displayScore >= 4
										? 'text-(--color-caution)'
										: 'text-(--color-alert)'
							)}
						>
							<span class="h-1.5 w-1.5 rounded-full bg-current opacity-80"
							></span>
							<span class="whitespace-nowrap">{displayScore}점</span>
						</div>
						<div class="h-3 w-px shrink-0 bg-(--color-gray-300)"></div>
						<!-- Model Info -->
						<div
							class="flex items-center gap-1.5 truncate overflow-hidden text-[11px] font-medium text-(--color-gray-500)"
						>
							<div class="shrink-0">
								<IconLogoModel
									model={displayModel}
									id={iconId}
									size={12}
								/>
							</div>
							<span class="truncate tracking-tight"
								>{capitalizeFirst(displayModel)}</span
							>
						</div>
					</div>
					{#if statusFilter !== 'hidden'}
						<!-- Bookmark Button -->
						<button
							type="button"
							onclick={handleBookmark}
							title={isBookmarked ? '북마크 해제' : '북마크 추가'}
							class={cn(
								'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
								'ml-auto',
								'hover:bg-primary-subtle hover:text-primary text-gray-400',
								CommonStyles.DEFAULT_TRANSITION_COLOR,
								isBookmarked && 'text-primary'
							)}
						>
							<span class="sr-only">
								{isBookmarked ? '북마크 해제' : '북마크 추가'}
							</span>
							<div>
								<IconBookmark filled={isBookmarked} />
							</div>
						</button>
					{/if}
					{#if statusFilter !== 'bookmarked'}
						<button
							type="button"
							onclick={handleHide}
							title={isHiddenInStore ? '숨김 해제' : '숨김 추가'}
							class={cn(
								'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
								'hover:bg-alert-subtle hover:text-alert text-gray-400',
								CommonStyles.DEFAULT_TRANSITION_COLOR,
								isHiddenInStore && 'text-alert'
							)}
							><span class="sr-only"
								>{isHiddenInStore ? '숨김 해제' : '숨김 추가'}</span
							>
							<div><IconHide /></div></button
						>
					{/if}
				</div>

				<!-- metaInfoArea -->
				<div class="flex items-center gap-1.5 text-xs">
					<div class="shrink-0">
						<IconLogoSource
							id={iconId}
							category={displayCategory}
						/>
					</div>
					{#if displayCategory !== 'X'}
						<strong
							class="truncate font-semibold tracking-tight text-(--color-gray-800)"
						>
							{displayCategory}
						</strong>
					{/if}
					<span class="h-0.5 w-0.5 shrink-0 rounded-full bg-(--color-gray-400)"
					></span>
					<span class="shrink-0 tracking-tight text-(--color-gray-500)"
						>{displayDate}</span
					>
				</div>
			</div>

			<!-- articleCard - body -->
			<div class="relative z-10 mb-5 flex flex-1 flex-col gap-2">
				<h3
					class="sm:group-hover:text-mint-500 line-clamp-2 text-[17px] leading-[1.4] font-bold tracking-tight text-(--color-gray-900)"
				>
					{displayTitle}
				</h3>
				<p
					class="line-clamp-3 text-[13px] leading-[1.6] font-normal break-keep text-(--color-gray-600)"
				>
					{displaySummary}
				</p>
			</div>

			<!-- articleCard - footer -->
			<div class="relative z-10 mt-auto flex flex-col gap-4">
				<!-- tagGroup -->
				<div class="flex flex-wrap gap-1.5">
					{#each displayTags as tag, i (tag + '-' + i)}
						<KeywordTag {tag} />
					{/each}
				</div>

				<!-- buttonGroup -->
				<div
					class="flex items-center justify-between border-t border-(--color-border-subtle) pt-3"
				>
					<a
						href={displayLink}
						target="_blank"
						rel="noopener noreferrer"
						class={cn(
							'flex items-center gap-1.5 text-xs font-medium text-(--color-gray-500)',
							'decoration-auto underline-offset-2 hover:text-(--color-gray-800) hover:underline',
							CommonStyles.DEFAULT_TRANSITION_COLOR
						)}
					>
						<div class="h-3.5 w-3.5">
							<IconLink />
						</div>
						<span>원본 링크</span>
					</a>

					<button
						type="button"
						{onclick}
						class={cn(
							'flex items-center gap-1 rounded-lg py-1.5 pr-2 pl-3',
							'bg-(--color-bg-surface) hover:bg-(--color-bg-active)',
							'text-xs font-semibold text-(--color-gray-700)',
							CommonStyles.DEFAULT_TRANSITION
						)}
					>
						<span>분석 결과</span>
						{#if extraModelCount > 0}
							<span
								class="ml-0.5 flex h-4 items-center justify-center rounded bg-(--color-gray-200) px-1.5 text-[10px] text-(--color-gray-600)"
							>
								+{extraModelCount}
							</span>
						{/if}
						<svg
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							class="ml-0.5 text-(--color-gray-500)"
						>
							<path
								d="M4.5 9L7.5 6L4.5 3"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	</div>

	{#if isHiddenInStore && !isForceExpand}
		<div
			class={cn('absolute inset-0')}
			in:fade={{ duration: 500 }}
		>
			<button
				type="button"
				onclick={handleHide}
				onmouseenter={() => (isHiddenHovered = true)}
				onmouseleave={() => (isHiddenHovered = false)}
				class={cn(
					'group',
					'flex items-center justify-center gap-2',
					'h-full w-full',
					'text-alert',
					'hover:text-primary',
					CommonStyles.DEFAULT_TRANSITION_COLOR
				)}
			>
				<span class="text-sm"
					>{isHiddenHovered ? '숨김 해제' : '숨김 처리'}</span
				>
				<IconHide canVisible={isHiddenHovered} />
			</button>
		</div>
	{/if}
</div>
