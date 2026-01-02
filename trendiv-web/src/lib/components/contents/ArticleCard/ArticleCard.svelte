<!-- https://www.figma.com/design/jxEwxoZSxmKtjMzQkeKkcP/Trendiv?node-id=12-5&t=OpHyXleilZSkLFzr-4  -->
<script lang="ts">
	import { CommonStyles } from '$lib/constants/styles';
	import IconBookmark from '$lib/icons/icon_bookmark.svelte';
	import IconLink from '$lib/icons/icon_link.svelte';
	import IconLogoGemini from '$lib/icons/icon_logo_gemini.svelte';
	import IconLogoSource from '$lib/icons/icon_logo_source.svelte';
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

<div
	class={cn(
		CommonStyles.CARD,
		'relative flex h-full flex-col justify-between overflow-hidden shadow-sm hover:shadow-md'
	)}
>
	<!-- Gradient Background (Figma & SVG Linear Gradient) -->
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-(--color-mint-200)/20 to-transparent"
		aria-hidden="true"
	></div>

	<!-- articleCard - header -->
	<div class="flex flex-col gap-3">
		<!-- aiInfoArea -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<!-- 점수 앞 원형 인디케이터는 before 가상요소로 처리 -->
				<div
					class={cn(
						'flex shrink-0 items-center gap-1.5 text-sm font-bold',
						'before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-current',
						displayScore >= 8
							? 'text-(--color-primary)'
							: displayScore >= 4
								? 'text-(--color-caution)'
								: 'text-(--color-alert)'
					)}
				>
					{`${displayScore}점`}
				</div>

				<!-- Divider -->
				<div class="h-3 w-[1px] shrink-0 bg-(--color-gray-300)"></div>

				<div
					class="flex items-center gap-1.5 overflow-hidden text-xs font-medium text-(--color-gray-600)"
				>
					<IconLogoGemini id={iconId} />
					<span class="truncate">{displayModel}</span>
				</div>
			</div>

			<button
				type="button"
				onclick={handleBookmark}
				class={cn(
					'shrink-0 text-(--color-gray-400) hover:bg-(--color-mint-50) hover:text-(--color-primary)',
					'flex h-6 w-6 items-center justify-center rounded-full',
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
		<div class="flex items-center gap-2 text-xs text-(--color-gray-500)">
			<div class="flex items-center gap-1.5">
				<IconLogoSource
					id={iconId}
					category={displayCategory}
				/>
				<strong
					class="max-w-[140px] truncate font-semibold text-(--color-gray-700)"
				>
					{displayCategory}
				</strong>
			</div>
			<div class="h-0.5 w-0.5 rounded-full bg-(--color-gray-300)"></div>
			<span class="shrink-0">{displayDate}</span>
		</div>
	</div>

	<!-- articleCard - body -->
	<div class="mt-3 mb-4 flex flex-col gap-2">
		<h3
			class="line-clamp-2 text-lg leading-snug font-bold text-(--color-gray-900)"
		>
			{displayTitle}
		</h3>
		<p class="line-clamp-3 text-sm leading-relaxed text-(--color-gray-600)">
			{displaySummary}
		</p>
	</div>

	<!-- articleCard - footer -->
	<div class="mt-auto flex flex-col gap-4">
		<!-- tagGroup -->
		<div class="flex flex-wrap gap-1.5">
			{#each displayTags as tag}
				<span
					class="rounded border border-(--color-gray-200) bg-(--color-gray-100) px-1.5 py-0.5 text-[11px] font-medium text-(--color-gray-600)"
				>
					#{tag}
				</span>
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
				class="flex items-center gap-1 text-xs text-(--color-gray-500) transition-colors hover:text-(--color-primary)"
			>
				<IconLink />
				<span>원본 링크</span>
			</a>
			<button
				type="button"
				{onclick}
				class="flex items-center gap-1.5 text-xs font-semibold text-(--color-gray-700) transition-colors hover:text-(--color-gray-900)"
			>
				<span>자세히 보기</span>
				{#if extraModelCount > 0}
					<span
						class="rounded-sm bg-(--color-gray-100) px-1 py-0.5 text-[10px] text-(--color-gray-600)"
					>
						+{extraModelCount}
					</span>
				{/if}
			</button>
		</div>
	</div>
</div>
