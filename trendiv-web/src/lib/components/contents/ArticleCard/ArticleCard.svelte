<!-- https://www.figma.com/design/jxEwxoZSxmKtjMzQkeKkcP/Trendiv?node-id=12-5&t=OpHyXleilZSkLFzr-4 -->
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
		'relative flex flex-col justify-between overflow-hidden'
	)}
>
	<!-- Background Gradient Overlay (SVG: paint0_linear_12_5) -->
	<div
		class="absolute inset-0 pointer-events-none bg-linear-to-b from-(--mint-200)/20 to-transparent"
		aria-hidden="true"
	></div>

	<!-- Header Group -->
	<div class="flex flex-col gap-3">
		<!-- AI Info & Actions -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<!-- Score -->
				<div
					class={cn(
						'flex items-center gap-1.5 text-sm font-bold',
						displayScore >= 8
							? 'text-(--color-primary)'
							: displayScore >= 4
								? 'text-(--color-caution)'
								: 'text-(--color-alert)'
					)}
				>
					<span class="h-2 w-2 rounded-full bg-current"></span>
					<span>{displayScore}점</span>
				</div>

				<!-- Divider -->
				<div class="h-3 w-px bg-(--gray-300)"></div>

				<!-- AI Model -->
				<div class="flex items-center gap-1.5 text-sm font-medium text-(--gray-700)">
					<IconLogoGemini id={iconId} />
					<span class="truncate max-w-[100px]">{displayModel}</span>
				</div>
			</div>

			<!-- Bookmark Button -->
			<button
				type="button"
				onclick={handleBookmark}
				class={cn(
					'flex h-8 w-8 items-center justify-center rounded-full text-(--gray-400) hover:bg-(--bg-surface) hover:text-(--color-primary)',
					CommonStyles.DEFAULT_TRANSITION_COLOR
				)}
			>
				<span class="sr-only">
					{isBookmarked ? '북마크 해제' : '북마크 추가'}
				</span>
				<IconBookmark filled={isBookmarked} />
			</button>
		</div>

		<!-- Meta Info -->
		<div class="flex items-center gap-2 text-xs">
			<div class="flex items-center gap-1.5 text-(--gray-600) font-semibold">
				<IconLogoSource
					id={iconId}
					category={displayCategory}
				/>
				<strong class="uppercase tracking-wide">{displayCategory}</strong>
			</div>
			<span class="h-0.5 w-0.5 rounded-full bg-(--gray-400)"></span>
			<span class="text-(--gray-400)">{displayDate}</span>
		</div>
	</div>

	<!-- Body Content -->
	<div class="mt-4 mb-6 flex-1">
		<h3 class="mb-2 text-lg font-bold leading-snug text-(--gray-900) line-clamp-2">
			{displayTitle}
		</h3>
		<p class="text-sm leading-relaxed text-(--gray-600) line-clamp-3">
			{displaySummary}
		</p>
	</div>

	<!-- Footer -->
	<div class="flex flex-col gap-4">
		<!-- Tags (SVG: #F2F5F4 bg, #4D5955 text) -->
		<div class="flex flex-wrap gap-2">
			{#each displayTags as tag}
				<span
					class="rounded bg-(--neutral-200) px-2.5 py-1 text-xs font-medium text-(--neutral-700)"
				>
					#{tag}
				</span>
			{/each}
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center justify-between border-t border-(--gray-200) pt-4">
			<a
				href={displayLink}
				target="_blank"
				rel="noopener noreferrer"
				class={cn(
					'flex items-center gap-1.5 text-xs font-medium text-(--gray-500) hover:text-(--color-primary)',
					CommonStyles.DEFAULT_TRANSITION_COLOR
				)}
			>
				<IconLink />
				<span>원본 링크</span>
			</a>

			<button
				type="button"
				{onclick}
				class={cn(
					'flex items-center gap-1.5 rounded-lg bg-(--gray-900) px-4 py-2 text-xs font-semibold text-white hover:bg-(--gray-700)',
					CommonStyles.DEFAULT_TRANSITION_COLOR
				)}
			>
				<span>자세히 보기</span>
				{#if extraModelCount > 0}
					<span class="opacity-80 font-normal">+ {extraModelCount}</span>
				{/if}
			</button>
		</div>
	</div>
</div>