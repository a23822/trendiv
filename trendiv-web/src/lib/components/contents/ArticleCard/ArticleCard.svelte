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
	const displayTitle = $derived(analysis?.title_ko || trend.title || '');
	const displaySummary = $derived(analysis?.oneLineSummary || '');
	const displayScore = $derived(analysis?.score ?? 0);
	const displayTags = $derived(analysis?.tags || []);
	const displayModel = $derived(analysis?.aiModel || 'AI Analysis');
	const displayLink = $derived(trend.link || '');
	const displayCategory = $derived(trend.category || 'General');

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
		'flex flex-col relative overflow-hidden bg-(--color-gray-0) h-full'
	)}
>
	<!-- Gradient Overlay (Matching SVG paint0_linear_12_5: #80DED1 (Mint 200) opacity 0.2) -->
	<div
		class="absolute top-0 left-0 right-0 h-40 bg-linear-to-b from-(--color-mint-200)/20 to-transparent pointer-events-none"
	></div>

	<!-- articleCard - header -->
	<div class="relative z-10 flex flex-col gap-2 mb-4">
		<!-- aiInfoArea -->
		<div class="flex items-center justify-between h-5">
			<div class="flex items-center gap-2">
				<!-- Score -->
				<div
					class={cn(
						'flex items-center gap-1.5 text-xs font-bold tabular-nums',
						displayScore >= 8
							? 'text-(--color-primary)'
							: displayScore >= 4
								? 'text-(--color-caution)'
								: 'text-(--color-alert)'
					)}
				>
					<span class="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
					<span>{displayScore}점</span>
				</div>

				<div class="w-px h-3 bg-(--color-gray-300)"></div>

				<!-- Model Info -->
				<div
					class="flex items-center gap-1.5 text-[11px] text-(--color-gray-500) font-medium truncate max-w-[140px]"
				>
					<div class="shrink-0">
						<IconLogoGemini
							id={iconId}
							class="w-3.5 h-3.5"
						/>
					</div>
					<span class="truncate tracking-tight">{displayModel}</span>
				</div>
			</div>

			<!-- Bookmark Button -->
			<button
				type="button"
				onclick={handleBookmark}
				class={cn(
					'flex items-center justify-center w-6 h-6 -mr-1 rounded-full',
					'text-(--color-gray-400) hover:text-(--color-primary) hover:bg-(--color-primary-subtle)',
					CommonStyles.DEFAULT_TRANSITION_COLOR
				)}
			>
				<span class="sr-only">
					{isBookmarked ? '북마크 해제' : '북마크 추가'}
				</span>
				<div class="w-4 h-4">
					<IconBookmark filled={isBookmarked} />
				</div>
			</button>
		</div>

		<!-- metaInfoArea -->
		<div class="flex items-center gap-1.5 text-xs">
			<div class="shrink-0">
				<IconLogoSource
					id={iconId}
					category={displayCategory}
				/>
			</div>
			<strong
				class="font-semibold text-(--color-gray-800) truncate max-w-[160px] tracking-tight"
			>
				{displayCategory}
			</strong>
			<span class="w-0.5 h-0.5 rounded-full bg-(--color-gray-400)"></span>
			<span class="text-(--color-gray-500) shrink-0 tracking-tight"
				>{displayDate}</span
			>
		</div>
	</div>

	<!-- articleCard - body -->
	<div class="relative z-10 flex-1 flex flex-col gap-2 mb-5">
		<h3
			class="text-[17px] font-bold text-(--color-gray-900) leading-[1.4] tracking-tight line-clamp-2"
		>
			{displayTitle}
		</h3>
		<p
			class="text-[13px] font-normal text-(--color-gray-600) leading-[1.6] line-clamp-3 break-keep"
		>
			{displaySummary}
		</p>
	</div>

	<!-- articleCard - footer -->
	<div class="relative z-10 mt-auto flex flex-col gap-4">
		<!-- tagGroup -->
		<div class="flex flex-wrap gap-1.5">
			{#each displayTags as tag}
				<span
					class="px-2 py-0.5 rounded-[6px] bg-(--color-neutral-200) text-(--color-neutral-700) text-[11px] font-medium leading-relaxed tracking-tight"
				>
					#{tag}
				</span>
			{/each}
		</div>

		<!-- buttonGroup -->
		<div
			class="flex items-center justify-between pt-3 border-t border-(--color-border-subtle)"
		>
			<a
				href={displayLink}
				target="_blank"
				rel="noopener noreferrer"
				class={cn(
					'flex items-center gap-1.5 text-xs font-medium text-(--color-gray-500)',
					'hover:text-(--color-gray-800) hover:underline decoration-auto underline-offset-2',
					CommonStyles.DEFAULT_TRANSITION_COLOR
				)}
			>
				<div class="w-3.5 h-3.5">
					<IconLink />
				</div>
				<span>원본 링크</span>
			</a>

			<button
				type="button"
				{onclick}
				class={cn(
					'flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-lg',
					'bg-(--color-bg-surface) hover:bg-(--color-bg-active)',
					'text-xs font-semibold text-(--color-gray-700)',
					CommonStyles.DEFAULT_TRANSITION
				)}
			>
				<span>분석 결과</span>
				{#if extraModelCount > 0}
					<span
						class="flex items-center justify-center px-1.5 h-4 ml-0.5 rounded bg-(--color-gray-200) text-[10px] text-(--color-gray-600)"
					>
						+{extraModelCount}
					</span>
				{/if}
				<!-- Arrow Icon simulated with CSS or simple SVG if needed, but per instructions relying on text/layout mostly -->
				<svg
					width="12"
					height="12"
					viewBox="0 0 12 12"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					class="ml-0.5 text-(--color-gray-500)"
				>
					<path
						d="M4.5 9L7.5 6L4.5 3"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>