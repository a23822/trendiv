<script lang="ts">
	import type { Trend, AnalysisResult } from '$lib/types';

	interface Props {
		trend: Trend;
		onclick?: () => void;
		onbookmark?: (trend: Trend) => void;
	}

	let { trend, onclick, onbookmark }: Props = $props();

	// ✨ [핵심 로직] 분석 결과 가져오기
	// 1. analysis_results 배열이 있으면 가장 마지막(최신) 것을 가져옵니다.
	// 2. 없으면 null (또는 기존 trend 필드 Fallback)
	const analysis = $derived(
		trend.analysis_results?.length
			? trend.analysis_results[trend.analysis_results.length - 1]
			: undefined
	);

	// ✨ [데이터 매핑] analysis 객체가 있으면 그걸 쓰고, 없으면 trend 원본 필드 사용
	const displayTitle = $derived(analysis?.title_ko || '');
	const displaySummary = $derived(analysis?.oneLineSummary || '');
	const displayScore = $derived(analysis?.score ?? 0);
	const displayTags = $derived(analysis?.tags || []);
	const displayModel = $derived(analysis?.aiModel || '');

	let isBookmarked = $state(false);

	function handleBookmark(e: MouseEvent) {
		e.stopPropagation();
		isBookmarked = !isBookmarked;
		onbookmark?.(trend);
	}

	function formatDate(date: string) {
		const diff = Date.now() - new Date(date).getTime();
		const hours = Math.floor(diff / (1000 * 60 * 60));
		if (hours < 1) return '방금 전';
		if (hours < 24) return `${hours}시간 전`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days}일 전`;
		return new Date(date).toLocaleDateString('ko-KR');
	}
</script>

<div
	class="
    group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900
  "
	{onclick}
	onkeydown={(e) => e.key === 'Enter' && onclick?.()}
	tabindex="0"
	role="button"
>
	<div
		class="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-800/50"
	>
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-1.5">
				<div class="bg-mint-500 h-2 w-2 rounded-full"></div>
				<span class="text-mint-600 dark:text-mint-400 text-xs font-bold">
					{displayScore}점
				</span>
			</div>

			<span
				class="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
			>
				{displayModel}
			</span>
		</div>

		<button
			type="button"
			onclick={handleBookmark}
			class="..."
		>
			저장
		</button>
	</div>

	<div class="p-5">
		<h3
			class="group-hover:text-mint-600 dark:group-hover:text-mint-400 mb-2 line-clamp-2 text-xl font-bold leading-snug text-gray-900 transition-colors dark:text-white"
		>
			{displayTitle}
		</h3>

		<p
			class="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
		>
			{displaySummary}
		</p>

		<div
			class="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800"
		>
			<div class="flex flex-wrap gap-1.5">
				{#each displayTags.slice(0, 3) as tag, i}
					<span
						class="rounded-full px-2.5 py-1 text-xs font-medium {i === 0
							? 'bg-mint-50 text-mint-700 border-mint-200 dark:bg-mint-900/20 dark:text-mint-400 dark:border-mint-800 border'
							: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400'}"
					>
						{tag}
					</span>
				{/each}
			</div>
			<span class="text-xs text-gray-400">{formatDate(trend.date)}</span>
		</div>
	</div>
</div>
