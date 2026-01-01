<!-- https://www.figma.com/design/jxEwxoZSxmKtjMzQkeKkcP/Trendiv?node-id=12-5&t=OpHyXleilZSkLFzr-4  -->
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

<div class={cn(CommonStyles.CARD, 'relative overflow-hidden flex flex-col justify-between')}>
	<!-- Background Gradient Overlay (SVG: paint0_linear_12_5) -->
	<div 
		class="absolute inset-0 bg-linear-to-b from-(--color-mint-200)/20 to-transparent pointer-events-none" 
		aria-hidden="true"
	></div>

	<!-- articleCard - Content Wrapper -->
	<div class="relative z-10 flex flex-col gap-3">
		<!-- Header Area -->
		<div class="flex justify-between items-start gap-4">
			<!-- AI Info & Meta -->
			<div class="flex flex-col gap-1.5 min-w-0">
				<!-- AI Model & Score -->
				<div class="flex items-center gap-2">
					<div
						class={cn(
							'flex items-center gap-1.5 text-xs font-semibold',
							displayScore >= 8
								? 'text-(--color-primary)'
								: displayScore >= 4
									? 'text-(--color-caution)'
									: 'text-(--color-alert)'
						)}
					>
						<!-- SVG Circle Indicator -->
						<span class="size-2 rounded-full bg-current shrink-0"></span>
						<span>{displayScore}점</span>
					</div>
					<div class="h-3 w-px bg-(--color-gray-300)"></div>
					<div class="flex items-center gap-1 text-xs text-(--color-gray-600) truncate">
						<IconLogoGemini id={iconId} />
						<span class="truncate">{displayModel}</span>
					</div>
				</div>

				<!-- Category & Date -->
				<div class="flex items-center gap-1.5 text-xs text-(--color-gray-500)">
					<div class="shrink-0 flex items-center justify-center">
						<IconLogoSource
							id={iconId}
							category={displayCategory}
						/>
					</div>
					<strong class="font-medium truncate text-(--color-gray-700)">{displayCategory}</strong>
					<span class="text-(--color-gray-300)">•</span>
					<span class="shrink-0">{displayDate}</span>
				</div>
			</div>

			<!-- Bookmark Button -->
			<button
				type="button"
				onclick={handleBookmark}
				class={cn(
					'shrink-0 p-1 -mr-1 rounded-full',
					'text-(--color-gray-400) hover:text-(--color-primary) hover:bg-(--color-gray-100)',
					CommonStyles.DEFAULT_TRANSITION_COLOR
				)}
			>
				<span class="sr-only">
					{isBookmarked ? '북마크 해제' : '북마크 추가'}
				</span>
				<IconBookmark filled={isBookmarked} />
			</button>
		</div>

		<!-- Body Area -->
		<div class="flex flex-col gap-2 mt-1">
			<h3 class="text-lg font-bold text-(--color-gray-900) leading-snug line-clamp-2">
				{displayTitle}
			</h3>
			<p class="text-sm text-(--color-gray-600) leading-relaxed line-clamp-2">
				{displaySummary}
			</p>
		</div>
	</div>

	<!-- Footer Area -->
	<div class="relative z-10 flex flex-col gap-4 mt-6">
		<!-- Tag Group (SVG colors: fill="#F2F5F4" text="#4D5955" -> neutral-200 / neutral-700) -->
		<div class="flex flex-wrap gap-2">
			{#each displayTags as tag}
				<span class={cn(
					"inline-flex items-center px-2.5 py-1 rounded-md",
					"bg-(--color-neutral-200) text-(--color-neutral-700)",
					"text-xs font-medium"
				)}>
					{tag}
				</span>
			{/each}
		</div>

		<!-- Button Group -->
		<div class="flex items-center justify-between pt-4 border-t border-(--color-border-subtle)">
			<a
				href={displayLink}
				target="_blank"
				rel="noopener noreferrer"
				class={cn(
					"flex items-center gap-1.5 text-xs text-(--color-gray-500)",
					"hover:text-(--color-primary) hover:underline decoration-auto underline-offset-2",
					CommonStyles.DEFAULT_TRANSITION_COLOR
				)}
			>
				<span>원문 보기</span>
				<IconLink />
			</a>
			
			<button
				type="button"
				{onclick}
				class={cn(
					"flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
					"text-xs font-semibold text-(--color-gray-700) bg-(--color-gray-100)",
					"hover:bg-(--color-gray-200) hover:text-(--color-gray-900)",
					CommonStyles.DEFAULT_TRANSITION_COLOR
				)}
			>
				<span>분석 상세</span>
				{#if extraModelCount > 0}
					<span class="text-[10px] font-normal text-(--color-gray-500)">
						+{extraModelCount}
					</span>
				{/if}
			</button>
		</div>
	</div>
</div>