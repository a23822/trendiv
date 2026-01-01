<!-- 
  ArticleCard.svelte
  Design based on SVG specs & Project Variables
-->
<script lang="ts">
	import { CommonStyles } from '$lib/constants/styles';
	import IconBookmark from '$lib/icons/icon_bookmark.svelte';
	import IconLink from '$lib/icons/icon_link.svelte';
	import IconLogoGemini from '$lib/icons/icon_logo_gemini.svelte';
	import IconLogoSource from '$lib/icons/icon_logo_source.svelte';
	import { bookmarks } from '$lib/stores/bookmarks.svelte';
	import type { Trend } from '$lib/types';
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		trend: Trend;
		onclick?: () => void;
	}

	let { trend, onclick }: Props = $props();

	// 분석 결과 가져오기 (가장 최근 결과 사용)
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
	
	// 표시 데이터 계산
	const displayTitle = $derived(analysis?.title_ko || trend.title || '제목 없음');
	const displaySummary = $derived(analysis?.oneLineSummary || '요약 내용이 없습니다.');
	const displayScore = $derived(analysis?.score ?? 0);
	const displayTags = $derived(analysis?.tags || []);
	const displayModel = $derived(analysis?.aiModel || 'AI Model');
	const displayLink = $derived(trend.link || '#');
	const displayCategory = $derived(trend.category || 'General');

	const isBookmarked = $derived(bookmarks.isBookmarked(trend.link));

	function handleBookmark(e: MouseEvent) {
		e.stopPropagation();
		bookmarks.toggle(trend);
	}

	const displayDate = $derived(formatDate(trend.date));

	function formatDate(date: string) {
		if (!date) return '';
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

	// 점수에 따른 색상 클래스 매핑 (app.css 변수 활용)
	const scoreColorClass = $derived(
		displayScore >= 8
			? 'text-primary' // mint-500 (#1BA896)
			: displayScore >= 4
				? 'text-caution' // amber-500 (#F59E0B)
				: 'text-alert'   // red-500 (#EF4444)
	);
</script>

<div 
	class={cn(
		CommonStyles.CARD,
		// Layout & Base Styles
		"relative flex flex-col h-full overflow-hidden",
		"bg-bg-main border-border-default",
		
		// Hover Effects (SVG Gradient Simulation)
		// SVG: linear-gradient(180deg, #80DED1 0%, rgba(128, 222, 209, 0) 100%) opacity 0.2
		// #80DED1 matches mint-200. We use a pseudo-element for the gradient overlay.
		"before:absolute before:inset-0 before:pointer-events-none before:z-0",
		"before:bg-linear-to-b before:from-mint-200/20 before:to-transparent",
		"before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
		
		// Border & Shadow Transition
		"hover:border-primary/30 hover:shadow-md",
		
		"cursor-pointer"
	)}
>
	<!-- Card Content (z-10 to sit above hover gradient) -->
	<div class="relative z-10 flex flex-col h-full gap-4">
		
		<!-- Header Area -->
		<div class="flex flex-col gap-2.5">
			<!-- Top Row: Score, Model, Bookmark -->
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<!-- Score Indicator -->
					<div 
						class={cn(
							"flex items-center gap-1.5 text-sm font-bold tracking-tight",
							scoreColorClass
						)}
					>
						<!-- Dot Indicator (SVG: cx="26" cy="20" r="4") -->
						<span class="w-2 h-2 rounded-full bg-current opacity-80"></span>
						<span>{displayScore}점</span>
					</div>

					<!-- Divider -->
					<span class="w-px h-3 bg-gray-300"></span>

					<!-- AI Model Info -->
					<div class="flex items-center gap-1.5 text-xs font-medium text-gray-600">
						<IconLogoGemini id={iconId} class="w-4 h-4" />
						<span class="truncate max-w-[100px]">{displayModel}</span>
					</div>
				</div>

				<!-- Bookmark Button -->
				<button
					type="button"
					onclick={handleBookmark}
					class={cn(
						"flex items-center justify-center w-8 h-8 -mr-2 rounded-full",
						"text-gray-400 hover:text-primary hover:bg-mint-50",
						"transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
					)}
					aria-label={isBookmarked ? '북마크 해제' : '북마크 추가'}
				>
					<IconBookmark filled={isBookmarked} />
				</button>
			</div>

			<!-- Meta Row: Source, Category, Date -->
			<div class="flex items-center gap-2 text-xs text-gray-500">
				<div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-surface border border-border-subtle">
					<IconLogoSource id={iconId} category={displayCategory} />
					<strong class="font-semibold text-gray-700 truncate max-w-[120px]">
						{displayCategory}
					</strong>
				</div>
				<span class="text-gray-300">|</span>
				<span class="shrink-0 font-medium">{displayDate}</span>
			</div>
		</div>

		<!-- Body Area -->
		<div class="flex flex-col flex-1 gap-2 min-h-0">
			<h3 class={cn(
				"text-[17px] font-bold leading-snug text-gray-900",
				"line-clamp-2" // 2줄 말줄임
			)}>
				{displayTitle}
			</h3>
			<p class={cn(
				"text-sm leading-relaxed text-gray-600",
				"line-clamp-3" // 3줄 말줄임
			)}>
				{displaySummary}
			</p>
		</div>

		<!-- Footer Area -->
		<div class="flex flex-col gap-3 mt-auto pt-3 border-t border-border-subtle/60">
			<!-- Tags -->
			<div class="flex flex-wrap gap-1.5">
				{#each displayTags.slice(0, 3) as tag}
					<span 
						class={cn(
							"px-2.5 py-1 text-[11px] font-medium rounded-md",
							"bg-neutral-100 text-neutral-600",
							"border border-neutral-200"
						)}
					>
						#{tag}
					</span>
				{/each}
				{#if displayTags.length > 3}
					<span class="px-1.5 py-1 text-[10px] text-gray-400">
						+{displayTags.length - 3}
					</span>
				{/if}
			</div>

			<!-- Action Buttons -->
			<div class="flex items-center justify-between">
				<a
					href={displayLink}
					target="_blank"
					rel="noopener noreferrer"
					class={cn(
						"flex items-center gap-1.5 text-xs font-medium",
						"text-gray-500 hover:text-primary hover:underline underline-offset-2",
						CommonStyles.DEFAULT_TRANSITION_COLOR
					)}
					onclick={(e) => e.stopPropagation()}
				>
					<IconLink class="w-3.5 h-3.5" />
					<span>원본 링크</span>
				</a>

				<button
					type="button"
					{onclick}
					class={cn(
						"flex items-center gap-1.5 text-xs font-semibold",
						"text-gray-700 hover:text-gray-900",
						"group/btn"
					)}
				>
					<span>자세히 보기</span>
					{#if extraModelCount > 0}
						<span class="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
							+{extraModelCount}
						</span>
					{/if}
					<!-- Simple arrow icon for interaction hint -->
					<svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="transition-transform group-hover/btn:translate-x-0.5">
						<path d="M4.5 9L7.5 6L4.5 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
			</div>
		</div>
	</div>
</div>