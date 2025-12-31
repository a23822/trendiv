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

<div
	class={cn(
		'relative flex flex-col gap-5 p-5',
		'rounded-2xl',
		// 배경: 기본 화이트 + 상단 민트 그라데이션 오버레이 (Opacity 20%)
		// bg-main은 흰색, from-mint-200/20은 상단 민트색 투명도 20%
		'bg-[linear-gradient(to_bottom,rgb(var(--mint-200)/0.2),transparent_50%),var(--color-bg-main)]',
		'shadow-(--shadow-sm)'
	)}
>
	<!-- articleCard - header -->
	<div class="flex flex-col gap-3">
		<!-- aiInfoArea -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<!-- 점수 앞 원형 인디케이터는 before 가상요소로 처리 -->
				<div
					class={cn(
						'flex items-center gap-1.5 text-sm font-bold',
						'before:inline-block before:h-2 before:w-2 before:rounded-full before:bg-current',
						displayScore >= 8
							? 'text-primary'
							: displayScore >= 4
								? 'text-caution'
								: 'text-alert'
					)}
				>
					{`${analysis?.score}점`}
				</div>
				<div
					class="flex items-center gap-1 text-sm font-semibold text-(--color-gray-800)"
				>
					<IconLogoGemini id={geminiIconId} />
					<span>{displayModel || 'Gemini'}</span>
				</div>
			</div>

			<button
				type="button"
				onclick={handleBookmark}
				class={cn(
					'flex h-6 w-6 items-center justify-center rounded-full',
					'text-(--color-gray-400) hover:text-(--color-primary)',
					'hover:bg-(--color-mint-50)',
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
			<strong class="text-(--color-gray-900) font-bold">{displayCategory}</strong>
			<span class="text-(--color-gray-500) shrink-0">{displayDate}</span>
		</div>
	</div>

	<!-- articleCard - body -->
	<div class="flex flex-col gap-2">
		<h3
			class="line-clamp-2 text-xl font-bold leading-tight text-(--color-gray-900)"
		>
			{displayTitle}
		</h3>
		<p class="line-clamp-3 text-base leading-relaxed text-(--color-gray-700)">
			{displaySummary}
		</p>
	</div>

	<!-- articleCard - footer -->
	<div class="mt-auto flex flex-col gap-5">
		<!-- tagGroup -->
		<!-- 넘치면 개행되지않고 숨김처리 -->
		<div class="no-scrollbar flex overflow-x-auto whitespace-nowrap">
			{#each displayTags as tag}
				<span
					class="bg-(--color-bg-surface) text-(--color-gray-700) mr-2 rounded-lg px-3 py-1 text-sm font-medium"
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
				class={cn(
					'bg-(--color-gray-100) hover:bg-(--color-gray-200) text-(--color-gray-600)',
					'flex h-12 w-[88px] shrink-0 items-center justify-center gap-1 rounded-xl px-4 text-sm font-medium transition-colors'
				)}
			>
				<span>링크</span>
				<IconLink />
			</a>
			<button
				type="button"
				{onclick}
				class={cn(
					'bg-(--color-gray-900) hover:bg-(--color-gray-800) text-white',
					'flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors'
				)}
			>
				<span>자세히 보기</span>
				{#if extraModelCount > 0}
					<span
						class="border-(--color-gray-600) rounded-full border px-2 py-0.5 text-xs font-normal"
					>
						+{extraModelCount} models
					</span>
				{/if}
			</button>
		</div>
	</div>
</div>