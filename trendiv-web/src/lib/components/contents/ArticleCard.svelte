<script lang="ts">
	import type { Trend } from '$lib/types';

	interface Props {
		trend: Trend;
		onclick?: () => void;
		onbookmark?: (trend: Trend) => void;
	}

	let { trend, onclick, onbookmark }: Props = $props();

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

<article
	class="
		group cursor-pointer
		overflow-hidden rounded-2xl
		border border-gray-100
		bg-white shadow-sm
		transition-all hover:-translate-y-0.5 hover:shadow-xl
		dark:border-gray-800 dark:bg-gray-900
	"
	{onclick}
	onkeydown={(e) => e.key === 'Enter' && onclick?.()}
	tabindex="0"
	role="button"
>
	<!-- 상단 바 -->
	<div
		class="
			flex items-center
			justify-between border-b
			border-gray-100 bg-gray-50 px-5
			py-3 dark:border-gray-800 dark:bg-gray-800/50
		"
	>
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-1.5">
				<div class="bg-mint-500 h-2 w-2 rounded-full"></div>
				<span class="text-mint-600 dark:text-mint-400 text-xs font-bold">
					{trend.score}점
				</span>
			</div>
			<span
				class="
					rounded bg-violet-100 px-2 py-0.5 text-[10px]
					font-medium text-violet-600
					dark:bg-violet-900/30 dark:text-violet-400
				"
			>
				gemini-2.5-flash
			</span>
		</div>

		<button
			type="button"
			onclick={handleBookmark}
			class="
				flex items-center gap-1 rounded-lg px-2 py-1
				text-xs font-medium transition-all
				{isBookmarked
				? 'text-mint-600 dark:text-mint-400'
				: 'text-gray-500 dark:text-gray-400'}
				hover:text-mint-600 dark:hover:text-mint-400
				hover:bg-mint-50 dark:hover:bg-mint-900/30
			"
		>
			<svg
				class="h-4 w-4"
				fill={isBookmarked ? 'currentColor' : 'none'}
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
				/>
			</svg>
			저장
		</button>
	</div>

	<!-- 본문 -->
	<div class="p-5">
		<h3
			class="
				group-hover:text-mint-600 dark:group-hover:text-mint-400 mb-2 line-clamp-2
				text-xl font-bold
				leading-snug text-gray-900
				transition-colors dark:text-white
			"
		>
			{trend.title}
		</h3>

		<p class="text-mint-600 dark:text-mint-400 mb-3 text-sm font-medium">
			{trend.titleKo || trend.oneLineSummary}
		</p>

		<p
			class="
				mb-4 line-clamp-3 text-sm leading-relaxed
				text-gray-600 dark:text-gray-300
			"
		>
			{trend.summary}
		</p>

		<!-- 태그 + 메타 -->
		<div
			class="
				flex items-center justify-between
				border-t border-gray-100 pt-4 dark:border-gray-800
			"
		>
			<div class="flex flex-wrap gap-1.5">
				{#each trend.tags?.slice(0, 3) || [] as tag, i}
					<span
						class="
							rounded-full px-2.5 py-1 text-xs font-medium
							{i === 0
							? 'bg-mint-50 dark:bg-mint-900/20 text-mint-700 dark:text-mint-400 border-mint-200 dark:border-mint-800 border'
							: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400'}
						"
					>
						{tag}
					</span>
				{/each}
			</div>
			<span class="text-xs text-gray-400">{formatDate(trend.date)}</span>
		</div>
	</div>
</article>
