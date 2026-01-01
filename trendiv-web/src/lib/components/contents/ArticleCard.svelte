<script lang="ts">
	import { CommonStyles } from '$lib/constants/styles';
	import IconBookmark from '$lib/icons/icon_bookmark.svelte';
	import IconLink from '$lib/icons/icon_link.svelte';
	import IconLogoGemini from '$lib/icons/icon_logo_gemini.svelte';
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
		'relative flex flex-col gap-4 overflow-hidden rounded-[20px] p-5 transition-all duration-300',
		'bg-(--color-bg-elevated) border border-(--color-border-subtle)',
		'shadow-(--shadow-sm) hover:shadow-(--shadow-md)',
		// Gradient Overlay from SVG: linearGradient stops at ~50% height, from Mint-200/20 to transparent
		'after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-b after:from-(--color-mint-200)/20 after:to-transparent after:content-[""]'
	)}
>
	<!-- articleCard - header -->
	<div class="flex flex-col gap-2">
		<!-- aiInfoArea -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<!-- Score Indicator -->
				<div
					class={cn(
						'flex items-center gap-1.5 text-sm font-bold tabular-nums',
						'before:inline-block before:h-2 before:w-2 before:rounded-full before:bg-current',
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
				<div class="h-3 w-px bg-(--color-gray-200)"></div>

				<!-- Model Info -->
				<div class="flex items-center gap-1.5 text-sm font-medium text-(--color-gray-900)">
					<div class="text-(--color-primary) w-4 h-4 flex items-center justify-center">
						<IconLogoGemini id={geminiIconId} />
					</div>
					<span class="opacity-80">{displayModel}</span>
				</div>
			</div>

			<!-- Bookmark -->
			<button
				type="button"
				onclick={handleBookmark}
				class={cn(
					'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
					'text-(--color-gray-400) hover:bg-(--color-gray-100) hover:text-(--color-primary)',
					isBookmarked && 'text-(--color-primary)'
				)}
			>
				<span class="sr-only">
					{isBookmarked ? '북마크 해제' : '북마크 추가'}
				</span>
				<IconBookmark filled={isBookmarked} />
			</button>
		</div>

		<!-- metaInfoArea -->
		<div class="flex items-center gap-2 text-xs font-medium text-(--color-gray-500)">
			<strong
				class="rounded-sm bg-(--color-bg-surface) px-1.5 py-0.5 font-semibold text-(--color-gray-600)"
			>
				{displayCategory}
			</strong>
			<span>•</span>
			<span class="shrink-0">{displayDate}</span>
		</div>
	</div>

	<!-- articleCard - body -->
	<div class="flex flex-1 flex-col gap-2">
		<h3
			class="line-clamp-2 text-lg font-bold leading-snug text-(--color-gray-900) group-hover:text-(--color-primary) transition-colors"
		>
			{displayTitle}
		</h3>
		<p class="line-clamp-3 text-sm leading-relaxed text-(--color-gray-600)">
			{displaySummary}
		</p>
	</div>

	<!-- articleCard - footer -->
	<div class="mt-auto flex flex-col gap-4 pt-2">
		<!-- tagGroup -->
		<div class="flex flex-wrap gap-1.5">
			{#each displayTags as tag}
				<span
					class="rounded-md bg-(--color-neutral-200) px-2.5 py-1 text-[11px] font-medium text-(--color-neutral-700) transition-colors hover:bg-(--color-neutral-300)"
				>
					#{tag}
				</span>
			{/each}
		</div>

		<!-- buttonGroup -->
		<div class="flex items-center justify-between border-t border-(--color-border-subtle) pt-4">
			<a
				href={displayLink}
				target="_blank"
				rel="noopener noreferrer"
				class="relative z-10 flex items-center gap-1.5 text-xs font-semibold text-(--color-forest-700) hover:underline hover:text-(--color-forest-800) transition-colors"
			>
				<span>원본 링크</span>
				<IconLink />
			</a>

			<button
				type="button"
				{onclick}
				class={cn(
					'relative z-10 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
					'bg-(--color-neutral-200) text-(--color-mint-900)',
					'hover:bg-(--color-neutral-300) active:scale-95'
				)}
			>
				<span>자세히 보기</span>
				{#if extraModelCount > 0}
					<span class="opacity-70 font-normal ml-0.5">+{extraModelCount}</span>
				{/if}
			</button>
		</div>
	</div>
</div>