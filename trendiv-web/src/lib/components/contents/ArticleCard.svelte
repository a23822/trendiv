<!-- https://www.figma.com/design/jxEwxoZSxmKtjMzQkeKkcP/Trendiv?node-id=12-5&t=OpHyXleilZSkLFzr-4  -->
<script lang="ts">
	import { CommonStyles } from '$lib/constants/styles';
	import IconBookmark from '$lib/icons/icon_bookmark.svelte';
	import IconLink from '$lib/icons/icon_link.svelte';
	import IconLogoGemini from '$lib/icons/icon_logo_gemini.svelte';
	import { bookmarks } from '$lib/stores/bookmarks.svelte';
	import type { Trend, AnalysisResult } from '$lib/types';
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		trend: Trend;
		onclick?: () => void;
	}

	let { trend, onclick }: Props = $props();

	// 분석 결과 가져오기
	const analysis = $derived(
		trend.analysis_results?.length
			? trend.analysis_results[trend.analysis_results.length - 1]
			: null
	);

	const extraModelCount = $derived(
		Math.max(0, (trend.analysis_results?.length ?? 0) - 1)
	);

	// 아이콘용 고유 ID
	const geminiIconId = $derived(`article-${trend.id}`);
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

<div
	class={cn(
		CommonStyles.CARD,
		'flex flex-col gap-5 p-6 rounded-2xl transition-colors',
		// 배경색: 이미지의 옅은 민트/포레스트 톤 적용 (bg-forest-50)
		'bg-forest-50 hover:shadow-lg'
	)}
>
	<!-- articleCard - header -->
	<div class="flex flex-col gap-2">
		<!-- aiInfoArea -->
		<div class="flex items-center text-sm">
			<!-- 점수 -->
			<div
				class={cn(
					'flex items-center gap-1.5 font-bold',
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

			<!-- 모델명 -->
			<div
				class="ml-3 flex items-center gap-1.5 font-semibold text-neutral-800 truncate"
			>
				<IconLogoGemini id={geminiIconId} />
				<span class="truncate">{displayModel}</span>
			</div>

			<!-- 북마크 버튼 -->
			<button
				type="button"
				onclick={handleBookmark}
				class={cn(
					'ml-auto shrink-0 p-1 rounded-full text-gray-400 transition-colors',
					'hover:bg-forest-200/50 hover:text-primary',
					isBookmarked && 'text-primary'
				)}
			>
				<span class="sr-only">
					{isBookmarked ? '북마크 해제' : '북마크 추가'}
				</span>
				<IconBookmark filled={isBookmarked} />
			</button>
		</div>

		<!-- metaInfoArea -->
		<div class="flex items-baseline gap-2 mt-1">
			<strong class="truncate text-base font-bold text-gray-900">
				{displayCategory}
			</strong>
			<span class="shrink-0 text-sm font-medium text-gray-500">
				{displayDate}
			</span>
		</div>
	</div>

	<!-- articleCard - body -->
	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold leading-snug text-gray-900 break-keep">
			{displayTitle}
		</h3>
		<p class="text-base leading-relaxed text-gray-700 line-clamp-3 break-keep">
			{displaySummary}
		</p>
	</div>

	<!-- articleCard - footer -->
	<div class="mt-auto flex flex-col gap-5">
		<!-- tagGroup -->
		<div class="flex flex-wrap gap-2">
			{#each displayTags as tag}
				<span
					class="inline-flex items-center px-3 py-1.5 rounded-[10px] bg-white text-xs font-bold text-gray-700 shadow-sm"
				>
					{tag}
				</span>
			{/each}
		</div>

		<!-- buttonGroup -->
		<div class="flex items-stretch gap-3">
			<a
				href={displayLink}
				target="_blank"
				rel="noopener noreferrer"
				class={cn(
					'flex h-12 items-center gap-1.5 rounded-xl bg-gray-200 px-5 text-sm font-bold text-gray-700 transition-colors',
					'hover:bg-gray-300 active:bg-gray-400'
				)}
			>
				<span>링크</span>
				<IconLink />
			</a>

			<button
				type="button"
				{onclick}
				class={cn(
					'flex flex-1 h-12 items-center justify-center gap-2 rounded-xl bg-neutral-800 px-4 text-sm font-bold text-white transition-colors',
					'hover:bg-neutral-900 active:scale-[0.98]'
				)}
			>
				<span>자세히 보기</span>
				{#if extraModelCount > 0}
					<span
						class="flex items-center rounded-full border border-white/30 px-2 py-0.5 text-[11px] font-medium leading-none"
					>
						+{extraModelCount} models
					</span>
				{/if}
			</button>
		</div>
	</div>
</div>