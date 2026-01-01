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

<div
	class={cn(
		CommonStyles.CARD,
		'relative flex flex-col gap-4 overflow-hidden p-5',
		'bg-(--color-bg-elevated) shadow-(--shadow-sm)',
		'hover:shadow-(--shadow-md) hover:border-(--color-border-focus)'
	)}
>
	<!-- Gradient Background Overlay (SVG paint0_linear_12_5 참고) -->
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-(--color-mint-200)/20 to-transparent"
		aria-hidden="true"
	></div>

	<!-- articleCard - header -->
	<div class="relative flex flex-col gap-2.5">
		<!-- aiInfoArea: Score, Model, Bookmark -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<!-- Score Indicator -->
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
					{displayScore}점
				</div>

				<!-- Vertical Separator -->
				<div class="h-3 w-px bg-(--color-gray-300)"></div>

				<!-- Model Info -->
				<div class="flex items-center gap-1.5 text-xs font-medium text-(--color-gray-900)">
					<div class="flex shrink-0 items-center justify-center">
						<IconLogoGemini id={iconId} />
					</div>
					<span class="truncate">{displayModel}</span>
				</div>
			</div>

			<!-- Bookmark Button -->
			<button
				type="button"
				onclick={handleBookmark}
				class={cn(
					'text-(--color-gray-400) hover:text-(--color-primary) relative -mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
					isBookmarked && 'text-(--color-primary)'
				)}
				aria-label={isBookmarked ? '북마크 해제' : '북마크 추가'}
			>
				<IconBookmark filled={isBookmarked} />
			</button>
		</div>

		<!-- metaInfoArea: Source, Category, Date -->
		<div class="flex items-center gap-2 text-xs">
			<div class="flex h-4 w-4 shrink-0 items-center justify-center">
				<IconLogoSource
					id={iconId}
					category={displayCategory}
				/>
			</div>
			<strong class="font-bold text-(--color-gray-900)">{displayCategory}</strong>
			<span class="text-(--color-gray-300)">|</span>
			<span class="text-(--color-gray-500)">{displayDate}</span>
		</div>
	</div>

	<!-- articleCard - body -->
	<div class="relative flex flex-col gap-1.5">
		<h3 class="line-clamp-2 text-lg font-bold leading-snug text-(--color-gray-900)">
			{displayTitle}
		</h3>
		<p class="line-clamp-2 text-sm leading-relaxed text-(--color-gray-600)">
			{displaySummary}
		</p>
	</div>

	<!-- articleCard - footer -->
	<div class="relative mt-auto flex flex-col gap-4">
		<!-- tagGroup -->
		<div class="flex flex-wrap gap-1.5">
			{#each displayTags as tag}
				<span
					class="bg-(--color-neutral-200) text-(--color-neutral-700) rounded-[6px] px-2.5 py-1 text-[11px] font-medium tracking-tight"
				>
					{tag}
				</span>
			{/each}
		</div>

		<!-- buttonGroup -->
		<div class="flex items-center gap-2">
			<!-- Link Button (SVG: fill="#F2F5F4" stroke="#737373" implied) -->
			<a
				href={displayLink}
				target="_blank"
				rel="noopener noreferrer"
				class={cn(
					'bg-(--color-neutral-100) border-(--color-gray-200) hover:bg-(--color-neutral-200) text-(--color-gray-500) hover:text-(--color-gray-700)',
					'flex aspect-square h-[30px] w-[30px] items-center justify-center rounded-lg border transition-colors'
				)}
				aria-label="원본 링크 이동"
			>
				<IconLink />
			</a>

			<!-- Detail Button (SVG: stroke="#C3E8DA" fill="white" implied) -->
			<button
				type="button"
				{onclick}
				class={cn(
					'border-(--color-forest-100) bg-white hover:bg-(--color-forest-50) text-(--color-gray-800)',
					'flex h-[30px] flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors'
				)}
			>
				<span>자세히 보기</span>
				{#if extraModelCount > 0}
					<span class="text-(--color-primary) font-semibold">
						+ {extraModelCount} Models
					</span>
				{/if}
			</button>
		</div>
	</div>
</div>