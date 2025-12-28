<script lang="ts">
	import IconBookmark from '$lib/icons/icon_bookmark.svelte';
	import IconLogoGemini from '$lib/icons/icon_logo_gemini.svelte';
	import { bookmarks } from '$lib/stores/bookmarks.svelte';
	import type { Trend, AnalysisResult } from '$lib/types';

	interface Props {
		trend: Trend;
		onclick?: () => void;
	}

	let { trend, onclick }: Props = $props();

	// ✨ [핵심 로직] 분석 결과 가져오기
	// 1. analysis_results 배열이 있으면 가장 마지막(최신) 것을 가져옵니다.
	// 2. 없으면 null (또는 기존 trend 필드 Fallback)
	const analysis = $derived(
		trend.analysis_results?.length
			? trend.analysis_results[trend.analysis_results.length - 1]
			: undefined
	);

	// 아이콘용 고유 ID
	const geminiIconId = $derived(`article-${trend.id}`);

	// ✨ [데이터 매핑] analysis 객체가 있으면 그걸 쓰고, 없으면 trend 원본 필드 사용
	const displayTitle = $derived(analysis?.title_ko || '');
	const displaySummary = $derived(analysis?.oneLineSummary || '');
	const displayScore = $derived(analysis?.score ?? 0);
	const displayTags = $derived(analysis?.tags || []);
	const displayModel = $derived(analysis?.aiModel || '');

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
	class="
    bg-gray-0 group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 shadow-xs transition-all hover:shadow-xl
  "
	{onclick}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onclick?.()}
	tabindex="0"
	role="button"
>
	<div
		class="bg-gray-0 flex items-center justify-between border-b border-gray-100 px-5 py-3"
	>
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-1.5">
				<div class="bg-mint-500 h-2 w-2 rounded-full"></div>
				<span class="text-mint-600 text-xs font-bold">
					{displayScore}점
				</span>
			</div>
			<IconLogoGemini
				instanceId={geminiIconId}
				class="h-3 w-3"
			/>
			<span
				class="rounded-sm bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-600"
			>
				{displayModel}
			</span>
		</div>

		<!-- 저장 버튼 -->
		<button
			type="button"
			onclick={handleBookmark}
			class="
				flex items-center gap-1 rounded-lg px-2 py-1
				text-xs font-medium transition-all
				{isBookmarked ? 'text-mint-600' : 'text-gray-500'}
				hover:text-mint-600
				hover:bg-mint-50
			"
		>
			<IconBookmark filled={isBookmarked} />
		</button>
	</div>

	<div class="p-5">
		<h3
			class="group-hover:text-mint-600 mb-2 line-clamp-2 text-xl leading-snug font-bold text-gray-900 transition-colors"
		>
			{displayTitle}
		</h3>

		<p class="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-600">
			{displaySummary}
		</p>

		<div
			class="flex items-center justify-between border-t border-gray-100 pt-4"
		>
			<div class="flex flex-wrap gap-1.5">
				{#each displayTags.slice(0, 3) as tag, i}
					<span
						class="rounded-full px-2.5 py-1 text-xs font-medium {i === 0
							? 'bg-mint-50 text-mint-700 border-mint-200'
							: 'bg-gray-100 text-gray-600'}"
					>
						{tag}
					</span>
				{/each}
			</div>
			<span class="text-xs text-gray-400">{displayDate}</span>
		</div>
	</div>
</div>
