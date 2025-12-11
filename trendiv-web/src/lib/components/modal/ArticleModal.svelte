<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Trend } from '$lib/types';

	interface Props {
		trend: Trend | null;
		isOpen?: boolean;
		onclose?: () => void;
		onbookmark?: (trend: Trend) => void;
	}

	let { trend, isOpen = $bindable(false), onclose, onbookmark }: Props = $props();

	let isBookmarked = $state(false);

	function close() {
		isOpen = false;
		onclose?.();
		document.body.style.overflow = '';
	}

	function handleBookmark() {
		isBookmarked = !isBookmarked;
		if (trend) onbookmark?.(trend);
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) close();
	}

	$effect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		}
	});
</script>

{#if isOpen && trend}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && close()}
		transition:fade={{ duration: 200 }}
		role="button"
		tabindex="-1"
	>
		<!-- Panel -->
		<div
			class="
				fixed top-0 right-0 z-50 h-full w-full max-w-lg 
				bg-white dark:bg-gray-900 shadow-2xl 
				overflow-hidden flex flex-col
				animate-slide-in
			"
		>
			<!-- 헤더 -->
			<div
				class="
					flex-shrink-0 
					bg-gradient-to-r from-mint-500 to-mint-600 
					px-6 py-5 
					flex items-center justify-between
				"
			>
				<div class="flex items-center gap-4">
					<div class="text-center">
						<span class="block text-3xl font-extrabold text-white">
							{trend.score}
						</span>
						<span class="block text-[10px] font-medium text-mint-100 uppercase tracking-wider">
							Score
						</span>
					</div>
					<div class="w-px h-10 bg-white/20"></div>
					<div>
						<span class="block text-sm font-semibold text-white">
							gemini-2.5-flash
						</span>
						<span class="block text-xs text-mint-100">
							{new Date(trend.date).toLocaleDateString('ko-KR')}
						</span>
					</div>
				</div>

				<button
					type="button"
					onclick={close}
					class="
						p-2 rounded-lg transition-colors
						text-white/80 hover:text-white hover:bg-white/10
					"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- 본문 -->
			<div class="flex-1 overflow-y-auto">
				<div class="p-6">
					<h2
						class="
							text-xl sm:text-2xl font-bold leading-tight mb-2
							text-gray-900 dark:text-white
						"
					>
						{trend.title}
					</h2>

					<p class="text-base text-mint-600 dark:text-mint-400 font-medium mb-6">
						{trend.titleKo || trend.oneLineSummary}
					</p>

					<!-- 키포인트 -->
					{#if trend.keyPoints?.length}
						<div
							class="
								mb-6 p-4 rounded-xl
								bg-mint-50 dark:bg-mint-900/20 
								border border-mint-200 dark:border-mint-800
							"
						>
							<h3
								class="
									text-sm font-bold mb-3 flex items-center gap-2
									text-mint-700 dark:text-mint-400
								"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
								{#each trend.keyPoints as point}
									<li class="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
										<span class="text-mint-500 font-bold flex-shrink-0">•</span>
										<span>{point}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					<!-- 전체 요약 -->
					<div class="mb-6">
						<h3
							class="
								text-sm font-bold mb-3 uppercase tracking-wide
								text-gray-900 dark:text-white
							"
						>
							Summary
						</h3>
						<p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-line">
							{trend.summary}
						</p>
					</div>

					<!-- 태그 -->
					{#if trend.tags?.length}
						<div class="flex flex-wrap gap-2 mb-6">
							{#each trend.tags as tag, i}
								<span
									class="
										px-3 py-1.5 text-sm font-medium rounded-full
										{i === 0
											? 'bg-mint-50 dark:bg-mint-900/20 text-mint-700 dark:text-mint-400 border border-mint-200 dark:border-mint-800'
											: 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400'}
									"
								>
									{tag}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- 푸터 -->
			<div
				class="
					flex-shrink-0 p-4 
					border-t border-gray-100 dark:border-gray-800 
					bg-white dark:bg-gray-900
				"
			>
				<div class="flex items-center gap-3">
					
						href={trend.link}
						target="_blank"
						rel="noopener noreferrer"
						class="
							flex-1 flex items-center justify-center gap-2 
							px-4 py-3 rounded-xl font-semibold transition-colors
							bg-gray-900 dark:bg-white 
							hover:bg-gray-800 dark:hover:bg-gray-100 
							text-white dark:text-gray-900
						"
					>
						원문 보기
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
							px-4 py-3 rounded-xl font-medium transition-colors
							flex items-center gap-2
							border border-gray-200 dark:border-gray-700
							{isBookmarked
								? 'text-mint-600 dark:text-mint-400 bg-mint-50 dark:bg-mint-900/20'
								: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}
						"
					>
						<svg
							class="w-5 h-5"
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