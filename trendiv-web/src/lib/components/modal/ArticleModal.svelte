<script lang="ts">
	import { modal } from '$lib/stores/modal.svelte.js';
	import type { Trend } from '$lib/types';
	import { cn } from '$lib/utils/ClassMerge';
	import { fade } from 'svelte/transition';

	interface Props {
		trend: Trend;
		onbookmark?: (trend: Trend) => void;
	}

	let { trend, onbookmark }: Props = $props();

	let isBookmarked = $state(false);

	// 1. 결과 리스트
	const results = $derived(trend?.analysis_results || []);

	// 2. 탭 인덱스 (기본값: 최신 결과)
	let selectedIndex = $state(-1);

	function close() {
		modal.close();
	}

	// 3. 현재 데이터 (분석 결과가 없으면 undefined)
	const currentData = $derived(
		selectedIndex >= 0 ? results[selectedIndex] : undefined
	);

	const displayTitle = $derived(currentData?.title_ko || '');
	const displaySummary = $derived(currentData?.oneLineSummary || '');
	const displayKeyPoints = $derived(currentData?.keyPoints || []);
	const displayTags = $derived(currentData?.tags || []);
	const displayScore = $derived(currentData?.score ?? 0);
	const displayModel = $derived(currentData?.aiModel || '');
	const displayDate = $derived(
		trend ? new Date(trend.date).toLocaleDateString('ko-KR') : ''
	);

	function handleBookmark() {
		isBookmarked = !isBookmarked;
		if (trend) onbookmark?.(trend);
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) close();
	}
</script>

{#if trend}
	<div
		class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && close()}
		transition:fade={{ duration: 200 }}
		role="button"
		tabindex="-1"
	>
		<div
			class="
        animate-slide-in fixed right-0 top-0 z-50 flex h-full
        w-full max-w-lg flex-col
        overflow-hidden bg-white shadow-2xl
        dark:bg-gray-900
      "
		>
			<div
				class="
          from-mint-500
          to-mint-600 flex flex-shrink-0
          flex-col gap-4
          bg-gradient-to-r px-6 py-5
        "
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-4">
						<div class="text-center">
							<span class="block text-3xl font-extrabold text-white">
								{displayScore}
							</span>
							<span
								class="text-mint-100 block text-[10px] font-medium uppercase tracking-wider"
							>
								Score
							</span>
						</div>
						<div class="h-10 w-px bg-white/20"></div>
						<div>
							<span class="block text-sm font-semibold text-white">
								{displayModel}
							</span>
							<span class="text-mint-100 block text-xs">
								{displayDate}
							</span>
						</div>
					</div>

					<button
						type="button"
						onclick={close}
						class="
              rounded-lg p-2 text-white/80
              transition-colors hover:bg-white/10 hover:text-white
            "
						aria-label="닫기"
					>
						<svg
							class="h-6 w-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{#if results.length > 1}
					<div class="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
						{#each results as res, index}
							<button
								class={cn(
									'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
									selectedIndex === index
										? 'text-mint-600 border-white bg-white'
										: 'bg-mint-600/50 text-mint-100 hover:bg-mint-600 border-transparent'
								)}
								onclick={() => (selectedIndex = index)}
							>
								{res.aiModel} ({res.score}점)
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="flex-1 overflow-y-auto">
				<div class="p-6">
					<h2
						class="
              mb-2 text-xl font-bold leading-tight text-gray-900
              sm:text-2xl dark:text-white
            "
					>
						{displayTitle}
					</h2>

					<p
						class="text-mint-600 dark:text-mint-400 mb-6 text-base font-medium"
					>
						{displaySummary}
					</p>

					{#if displayKeyPoints.length > 0}
						<div
							class="
                bg-mint-50 dark:bg-mint-900/20 border-mint-200
                dark:border-mint-800 mb-6
                rounded-xl border p-4
              "
						>
							<h3
								class="
                  text-mint-700 dark:text-mint-400 mb-3 flex items-center gap-2
                  text-sm font-bold
                "
							>
								<svg
									class="h-4 w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
								Key Takeaways
							</h3>
							<ul class="space-y-2">
								{#each displayKeyPoints as point}
									<li
										class="flex gap-2 text-sm text-gray-700 dark:text-gray-300"
									>
										<span class="text-mint-500 flex-shrink-0 font-bold">•</span>
										<span>{point}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					<div class="mb-6">
						<h3
							class="
                mb-3 text-sm font-bold uppercase tracking-wide
                text-gray-900 dark:text-white
              "
						>
							Summary
						</h3>
						<p
							class="whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300"
						>
							{displaySummary}
						</p>
					</div>

					{#if displayTags.length > 0}
						<div class="mb-6 flex flex-wrap gap-2">
							{#each displayTags as tag, i}
								<span
									class="
                    rounded-full px-3 py-1.5 text-sm font-medium
                    {i === 0
										? 'bg-mint-50 dark:bg-mint-900/20 text-mint-700 dark:text-mint-400 border-mint-200 dark:border-mint-800 border'
										: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400'}
                  "
								>
									{tag}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<div
				class="
          flex-shrink-0 border-t
          border-gray-100 bg-white p-4
          dark:border-gray-800 dark:bg-gray-900
        "
			>
				<div class="flex items-center gap-3">
					<a
						href={trend.link}
						target="_blank"
						rel="noopener noreferrer"
						class="
              flex flex-1 items-center justify-center gap-2
              rounded-xl bg-gray-900 px-4 py-3 font-semibold
              text-white transition-colors
              hover:bg-gray-800 dark:bg-white
              dark:text-gray-900 dark:hover:bg-gray-100
            "
					>
						원문 보기
						<svg
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							/>
						</svg>
					</a>

					<button
						type="button"
						onclick={handleBookmark}
						class="
              flex items-center gap-2 rounded-xl border
              border-gray-200 px-4 py-3
              font-medium transition-colors dark:border-gray-700
              {isBookmarked
							? 'text-mint-600 dark:text-mint-400 bg-mint-50 dark:bg-mint-900/20'
							: 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}
            "
					>
						<svg
							class="h-5 w-5"
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
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-in {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	.animate-slide-in {
		animation: slide-in 0.4s cubic-bezier(0.25, 0.1, 0.25, 1);
	}
</style>
