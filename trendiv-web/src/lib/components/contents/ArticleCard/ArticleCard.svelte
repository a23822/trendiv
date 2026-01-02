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
		'shadow-sm hover:shadow-md relative flex h-full flex-col justify-between overflow-hidden'
	)}
>
	<!-- Gradient Background (Figma & SVG Linear Gradient) -->
	<div
		class="from-(--color-mint-200)/20 pointer-events-none absolute inset-x-0 top-0 -z-10 h-1/2 bg-linear-to-b to-transparent"
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
				<div class="bg-(--color-gray-300) h-3 w-[1px]"></div>

				<div class="text-(--color-gray-600) flex items-center gap-1.5 text-xs font-medium">
					<IconLogoGemini id={iconId} />
					<span class="max-w-[120px] truncate">{displayModel}</span>
				</div>
			</div>

			<button
				type="button"
				onclick={handleBookmark}
				class={cn(
					'text-(--color-gray-400) hover:text-(--color-primary) hover:bg-(--color-mint-50) shrink-0',
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
		<div class="text-(--color-gray-500) flex items-center gap-2 text-xs">
			<div class="flex items-center gap-1.5">
				<IconLogoSource
					id={iconId}
					category={displayCategory}
				/>
				<strong class="text-(--color-gray-700) max-w-[140px] truncate font-semibold">
					{displayCategory}
				</strong>
			</div>
			<div class="bg-(--color-gray-300) h-0.5 w-0.5 rounded-full"></div>
			<span class="shrink-0">{displayDate}</span>
		</div>
	</div>

	<!-- articleCard - body -->
	<div class="mb-4 mt-3 flex flex-col gap-2">
		<h3 class="text-(--color-gray-900) line-clamp-2 text-lg font-bold leading-snug">
			{displayTitle}
		</h3>
		<p class="text-(--color-gray-600) line-clamp-3 text-sm leading-relaxed">
			{displaySummary}
		</p>
	</div>

	<!-- articleCard - footer -->
	<div class="mt-auto flex flex-col gap-4">
		<!-- tagGroup -->
		<div class="flex flex-wrap gap-1.5">
			{#each displayTags as tag}
				<span
					class="bg-(--color-gray-100) text-(--color-gray-600) border-(--color-gray-200) rounded px-1.5 py-0.5 text-[11px] font-medium border"
				>
					#{tag}
				</span>
			{/each}
		</div>

		<!-- buttonGroup -->
		<div
			class="border-(--color-border-subtle) flex items-center justify-between border-t pt-3"
		>
			<a
				href={displayLink}
				target="_blank"
				rel="noopener noreferrer"
				class="text-(--color-gray-500) hover:text-(--color-primary) flex items-center gap-1 text-xs transition-colors"
			>
				<IconLink />
				<span>원본 링크</span>
			</a>
			<button
				type="button"
				{onclick}
				class="text-(--color-gray-700) hover:text-(--color-gray-900) flex items-center gap-1.5 text-xs font-semibold transition-colors"
			>
				<span>자세히 보기</span>
				{#if extraModelCount > 0}
					<span
						class="bg-(--color-gray-100) text-(--color-gray-600) rounded-sm px-1 py-0.5 text-[10px]"
					>
						+{extraModelCount}
					</span>
				{/if}
			</button>
		</div>
	</div>
</div>