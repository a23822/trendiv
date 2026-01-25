<!-- https://www.figma.com/design/jxEwxoZSxmKtjMzQkeKkcP/Trendiv?node-id=12-5&t=OpHyXleilZSkLFzr-4  -->
<script lang="ts">
	import KeywordTag from '$lib/components/pure/Tag/keywordTag.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import IconBookmark from '$lib/icons/icon_bookmark.svelte';
	import IconHide from '$lib/icons/icon_hide.svelte';
	import IconLink from '$lib/icons/icon_link.svelte';
	import IconLogoModel from '$lib/icons/icon_logo_model.svelte';
	import IconLogoSource from '$lib/icons/icon_logo_source.svelte';
	import { bookmarks } from '$lib/stores/bookmarks.svelte';
	import { hiddenArticles } from '$lib/stores/hiddenarticles.svelte';
	import type { Trend } from '$lib/types';
	import { cn } from '$lib/utils/ClassMerge';
	import { formatDate } from '$lib/utils/date';
	import { capitalizeFirst } from '$lib/utils/string';
	import { fade } from 'svelte/transition';

	interface Props {
		trend: Trend;
		onclick?: () => void;
	}

	let { trend, onclick }: Props = $props();

	let isHiddenHovered = $state(false);

	// 분석 결과 가져오기
	const analysis = $derived(
		trend.represent_result ||
			(trend.analysis_results && trend.analysis_results.length > 0
				? trend.analysis_results[0]
				: null)
	);

	const extraModelCount = $derived(
		Math.max(0, (trend.analysis_results?.length ?? 0) - 1)
	);

	// 아이콘용 고유 ID
	const iconId = $derived(`article-${trend.id}`);
	const displayTitle = $derived(analysis?.title_ko || trend.title || '');
	const displaySummary = $derived(analysis?.oneLineSummary || '');
	const displayScore = $derived(analysis?.score ?? 0);
	const displayTags = $derived(analysis?.tags || []);
	const displayModel = $derived(analysis?.aiModel || 'AI Analysis');
	const displayLink = $derived(trend.link || '');
	const displayCategory = $derived(trend.category || 'General');

	const isBookmarked = $derived(bookmarks.isBookmarked(trend.link));

	const isHidden = $derived(hiddenArticles.isHidden(trend.link));

	function handleBookmark(e: MouseEvent) {
		e.stopPropagation();
		bookmarks.toggle(trend);
	}

	function handleHide(e: MouseEvent) {
		e.stopPropagation();
		hiddenArticles.toggle(trend);
	}

	// 날짜 안전 체크
	const displayDate = $derived(trend.date ? formatDate(trend.date) : '');

	// 애니메이션 진행 상태를 추적하는 state
	let isAnimating = $state(false);

	// 애니메이션 시작/종료 핸들러
	function handleTransitionStart() {
		isAnimating = true;
	}

	function handleTransitionEnd() {
		isAnimating = false;
	}
</script>

<div class={cn(CommonStyles.CARD)}>
	<div
		class={cn(
			'grid',
			(isHidden || isAnimating) && 'overflow-hidden',
			'transition-[grid-template-rows] duration-500 ease-in-out',
			isHidden ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
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
				(isHidden || isAnimating) && 'overflow-hidden',
				'transition-opacity duration-500 ease-in-out',
				isHidden ? 'opacity-0' : 'opacity-100'
			)}
		>
			<!-- articleCard - header -->
			<div>
				<!-- aiInfoArea -->
				<div class="flex items-center">
					<!-- 점수 앞 원형 인디케이터는 before 가상요소로 처리 -->
					<div
						class={cn(
							'shrink-0',
							'before:inline-block before:h-2 before:w-2 before:rounded-full before:bg-current',
							displayScore >= 8
								? 'text-primary'
								: displayScore >= 4
									? 'text-caution'
									: 'text-alert'
						)}
					>
						{`${displayScore}점`}
					</div>
					<div class="truncate">
						<IconLogoModel
							model={displayModel}
							id={iconId}
						/>
						<span>{capitalizeFirst(displayModel)}</span>
					</div>
					<button
						type="button"
						onclick={handleBookmark}
						class={cn(
							'ml-auto shrink-0',
							'sm:hover:bg-forest-200/60 h-5 w-5 rounded-full',
							CommonStyles.DEFAULT_TRANSITION_COLOR
						)}
					>
						<span class="sr-only">
							{isBookmarked ? '북마크 해제' : '북마크 추가'}
						</span>
						<IconBookmark filled={isBookmarked} />
					</button>
				</div>
				<!-- metaInfoArea -->
				<div class="flex items-center">
					<IconLogoSource
						id={iconId}
						size={12}
						category={displayCategory}
					/>
					<!-- max-width 값 설정 금지 -->
					{#if displayCategory !== 'X'}
						<strong class="truncate">{displayCategory}</strong>
					{/if}
					<span class="shrink-0">{displayDate}</span>
				</div>
			</div>
			<!-- articleCard - body -->
			<div>
				<h3>{displayTitle}</h3>
				<p>{displaySummary}</p>
			</div>
			<!-- articleCard - footer -->
			<div>
				<!-- tagGroup -->
				<div>
					<!-- 태그는 모두 보여줄 것 -->
					{#each displayTags as tag (tag)}
						<span>{tag}</span>
					{/each}
				</div>
				<!-- buttonGroup -->
				<div>
					<a
						href={displayLink}
						target="_blank"
						rel="noopener noreferrer"
					>
						<span>링크</span>
						<IconLink />
					</a>
					<button
						type="button"
						{onclick}
					>
						<span>자세히 보기</span>
						{#if extraModelCount > 0}
							<span>+ {extraModelCount} Models</span>
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
	{#if isHidden}
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
