<!-- https://www.figma.com/design/jxEwxoZSxmKtjMzQkeKkcP/Trendiv?node-id=12-5&t=OpHyXleilZSkLFzr-4  -->
<script lang="ts">
	import { CommonStyles } from '$lib/constants/styles';
	import IconBookmark from '$lib/icons/icon_bookmark.svelte';
	import IconLink from '$lib/icons/icon_link.svelte';
	import IconLogoGemini from '$lib/icons/icon_logo_gemini.svelte';
	import { bookmarks } from '$lib/stores/bookmarks.svelte';
	import type { Trend, AnalysisResult } from '$lib/types';
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		trend: Trend;
		onclick?: () => void;
	}

	let { trend, onclick }: Props = $props();

	// 분석 결과 가져오기
	// 1. analysis_results 배열이 있으면 가장 마지막(최신) 것을 가져옵니다.
	// 2. 없으면 null (또는 기존 trend 필드 Fallback)
	const { analysis, extraModelCount } = $derived.by(() => {
		const results = trend.analysis_results;
		const count = results?.length ?? 0;

		return {
			analysis: count > 0 ? results![count - 1] : undefined,
			extraModelCount: count > 1 ? count - 1 : 0
		};
	});

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

<!-- 
  [Card Container] 
  - Rounded: 20px (from Figma visual) -> rounded-[20px]
  - Shadow: shadow-sm (from variables)
  - Bg: bg-main with Linear Gradient Overlay (Mint-200 20% to Transparent)
-->
<div
	class="font-(--font-sans) relative flex flex-col overflow-hidden rounded-[20px] bg-(--color-bg-main) bg-gradient-to-b from-(--color-mint-200)/20 to-transparent p-5 shadow-(--shadow-sm) transition-shadow hover:shadow-(--shadow-md)"
>
	<!-- articleCard - header -->
	<div class="mb-3 flex flex-col gap-3">
		<!-- aiInfoArea -->
		<div class="flex items-center gap-2">
			<!-- 점수 앞 원형 인디케이터는 before 가상요소로 처리 -->
			<div
				class={cn(
					'flex items-center gap-1.5 text-sm font-bold',
					'before:h-2 before:w-2 before:rounded-full before:bg-current',
					displayScore >= 8
						? 'text-(--color-primary)'
						: displayScore >= 4
							? 'text-(--color-caution)'
							: 'text-(--color-alert)'
				)}
			>
				{`${analysis?.score}점`}
			</div>
			
            <!-- 구분선이나 간격이 필요할 경우 추가, 여기서는 gap으로 처리됨 -->
			<div class="flex items-center gap-1.5 text-sm font-bold text-(--color-gray-900)">
				<!-- 아이콘 크기 조정 (w-5 h-5 등) 필요시 props 전달 혹은 wrapper 사용 -->
				<div class="shrink-0 scale-90">
					<IconLogoGemini id={geminiIconId} />
				</div>
				<span>{displayModel}</span>
			</div>

			<button
				type="button"
				onclick={handleBookmark}
				class={cn(
					'ml-auto flex h-8 w-8 items-center justify-center rounded-full text-(--color-primary) hover:bg-(--color-mint-50)',
					CommonStyles.DEFAULT_TRANSTION_COLOR
				)}
			>
				<span class="sr-only">
					{isBookmarked ? '북마크 해제' : '북마크 추가'}
				</span>
				<IconBookmark filled={isBookmarked} />
			</button>
		</div>

		<!-- metaInfoArea -->
		<div class="flex items-center gap-2 text-[15px]">
			<!-- 한줄 말줄임 적용 -->
			<strong class="font-bold text-(--color-gray-900)">{displayCategory}</strong>
			<span class="shrink-0 text-(--color-gray-500)">{displayDate}</span>
		</div>
	</div>

	<!-- articleCard - body -->
	<div class="mb-6 flex-1">
		<h3 class="mb-2 text-xl font-bold leading-snug text-(--color-gray-900) line-clamp-2">
			{displayTitle}
		</h3>
		<p class="text-base leading-relaxed text-(--color-gray-700) line-clamp-3">
			{displaySummary}
		</p>
	</div>

	<!-- articleCard - footer -->
	<div class="mt-auto">
		<!-- tagGroup -->
		<!-- 넘치면 개행되지않고 숨김처리: flex-wrap 대신 overflow-hidden 유지 -->
		<div class="mb-4 flex gap-2 overflow-hidden whitespace-nowrap">
			{#each displayTags as tag}
				<span
					class="inline-flex items-center rounded-lg bg-(--color-gray-100) px-3 py-1.5 text-xs font-semibold text-(--color-gray-700)"
				>
					{tag}
				</span>
			{/each}
		</div>

		<!-- buttonGroup -->
		<div class="flex items-center gap-2">
			<a
				href={displayLink}
				target="_blank"
				class="bg-(--color-gray-100) text-(--color-gray-600) hover:bg-(--color-gray-200) flex h-[48px] min-w-[80px] items-center justify-center gap-1.5 rounded-[14px] px-4 text-sm font-bold transition-colors"
			>
				<span>링크</span>
				<!-- IconLink 크기 제어 -->
				<div class="h-4 w-4">
					<IconLink />
				</div>
			</a>
			<button
				type="button"
				{onclick}
				class="bg-(--color-gray-800) hover:bg-(--color-gray-900) flex h-[48px] flex-1 items-center justify-center gap-2 rounded-[14px] px-4 text-sm font-bold text-white transition-colors cursor-pointer"
			>
				<span>자세히 보기</span>
				{#if extraModelCount > 0}
					<span
						class="rounded-full border border-white/30 px-2 py-0.5 text-[11px] font-medium leading-none"
					>
						+{extraModelCount} models
					</span>
				{/if}
			</button>
		</div>
	</div>
</div>