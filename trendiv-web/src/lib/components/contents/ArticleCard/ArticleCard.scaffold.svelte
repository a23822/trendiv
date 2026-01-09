<!-- https://www.figma.com/design/jxEwxoZSxmKtjMzQkeKkcP/Trendiv?node-id=12-5&t=OpHyXleilZSkLFzr-4  -->
<script lang="ts">
	import { CommonStyles } from '$lib/constants/styles';
	import IconBookmark from '$lib/icons/icon_bookmark.svelte';
	import IconLink from '$lib/icons/icon_link.svelte';
	import IconLogoModel from '$lib/icons/icon_logo_model.svelte';
	import IconLogoSource from '$lib/icons/icon_logo_source.svelte';
	import { bookmarks } from '$lib/stores/bookmarks.svelte';
	import type { Trend, AnalysisResult } from '$lib/types';
	import { cn } from '$lib/utils/ClassMerge';
	import { capitalizeFirst } from '$lib/utils/string';

	interface Props {
		trend: Trend;
		onclick?: () => void;
	}

	let { trend, onclick }: Props = $props();

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
	const displayTitle = $derived(analysis?.title_ko || '');
	const displaySummary = $derived(analysis?.oneLineSummary || '');
	const displayScore = $derived(analysis?.score ?? 0);
	const displayTags = $derived(analysis?.tags || []);
	const displayModel = $derived(analysis?.aiModel || '');
	const displayLink = $derived(trend.link || '');
	const displayCategory = $derived(trend.category || '');

	const isBookmarked = $derived(bookmarks.isBookmarked(trend.link));

	function handleBookmark(e: MouseEvent) {
		e.stopPropagation();
		bookmarks.toggle(trend);
	}

	const displayDate = $derived(formatDate(trend.date));

	function formatDate(date: string) {
		const parsed = new Date(date);
		if (isNaN(parsed.getTime())) return '';

		const diff = Date.now() - parsed.getTime();
		const hours = Math.floor(diff / (1000 * 60 * 60));
		if (hours < 1) return '방금 전';
		if (hours < 24) return `${hours}시간 전`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days}일 전`;
		return parsed.toLocaleDateString('ko-KR');
	}
</script>

<div class={cn(CommonStyles.CARD)}>
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
