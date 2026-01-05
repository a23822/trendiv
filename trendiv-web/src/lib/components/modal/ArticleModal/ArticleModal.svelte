<script lang="ts">
	import CloseButton from '$lib/components/pure/Button/CloseButton.svelte';
	import IconBookmark from '$lib/icons/icon_bookmark.svelte';
	import { bookmarks } from '$lib/stores/bookmarks.svelte';
	import { modal } from '$lib/stores/modal.svelte.js';
	import type { Trend } from '$lib/types';
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		trend: Trend;
	}

	let { trend }: Props = $props();

	let dialog: HTMLDialogElement;

	const isBookmarked = $derived(
		trend ? bookmarks.isBookmarked(trend.link) : false
	);

	// 분석 결과
	const results = $derived(trend?.analysis_results || []);
	let selectedIndex = $state(0);

	// 🟡 trend 변경 시 무조건 selectedIndex 초기화 (새 기사는 항상 첫 번째 모델부터)
	$effect(() => {
		if (trend) {
			selectedIndex = 0;
		}
	});

	const currentData = $derived(
		trend?.analysis_results?.[selectedIndex] ?? trend?.analysis_results?.[0]
	);

	const displayTitle = $derived(currentData?.title_ko || trend?.title || '');
	const displaySummary = $derived(currentData?.oneLineSummary || '');
	const displayKeyPoints = $derived(currentData?.keyPoints || []);
	const displayTags = $derived(currentData?.tags || []);
	const displayScore = $derived(currentData?.score ?? 0);
	const displayModel = $derived(currentData?.aiModel || '');
	const displayDate = $derived(
		trend?.date && !isNaN(new Date(trend.date).getTime())
			? new Date(trend.date).toLocaleDateString('ko-KR')
			: ''
	);

	$effect(() => {
		if (dialog && !dialog.open) {
			dialog.showModal();
		}
	});

	// 💡 중복 호출 제거: dialog.close()만 호출하면 onclose 이벤트가 트리거되어 modal.close() 실행됨
	function requestClose() {
		dialog?.close();
	}

	function handleNativeClose() {
		modal.close();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialog) {
			requestClose();
		}
	}

	function handleBookmark() {
		bookmarks.toggle(trend);
	}
</script>

<dialog
	bind:this={dialog}
	class={cn(
		'max-h-[70vh] w-full max-w-2xl',
		'm-auto overflow-hidden rounded-2xl p-0',
		'bg-bg-main',
		'backdrop:bg-black/50 backdrop:backdrop-blur-xs'
	)}
	onclose={handleNativeClose}
	onclick={handleBackdropClick}
>
	{#if trend}
		<article class="flex max-h-[70vh] flex-col">
			<!-- 헤더 -->
			<header
				class={cn(
					'flex shrink-0 items-center justify-between',
					'px-5 py-4 sm:px-6',
					'border-b border-gray-100'
				)}
			>
				<div class="flex items-center gap-3">
					<span
						class={cn(
							'rounded-lg px-2.5 py-1 text-xs font-bold',
							'bg-mint-100 text-mint-700'
						)}
					>
						{displayScore}점
					</span>
					<span
						class={cn(
							'rounded-lg px-2.5 py-1 text-xs font-medium',
							'bg-violet-100 text-violet-600'
						)}
					>
						{displayModel}
					</span>
					<span class="text-xs text-gray-400">{displayDate}</span>
				</div>

				<CloseButton
					className="shrink-0 -mr-2"
					variant="inverted"
					size={36}
					onclick={requestClose}
				/>
			</header>

			<!-- 모델 탭 (여러 개일 때만) -->
			{#if results.length > 1}
				<div
					class={cn(
						'flex shrink-0 gap-2 overflow-x-auto',
						'px-5 py-3 sm:px-6',
						'border-b border-gray-100',
						'bg-gray-50'
					)}
				>
					<!-- 🟡 #each 키 추가 + 기본값 처리 -->
					{#each results as res, index (res.aiModel || index)}
						<button
							type="button"
							class={cn(
								'rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors',
								selectedIndex === index
									? 'bg-mint-500 text-white'
									: 'bg-gray-200 text-gray-600 hover:bg-gray-300'
							)}
							onclick={() => (selectedIndex = index)}
						>
							{res.aiModel || '모델'} ({res.score ?? 0}점)
						</button>
					{/each}
				</div>
			{/if}

			<!-- 본문 -->
			<div
				class="flex-1 overflow-y-auto"
				style="scrollbar-gutter: stable;"
			>
				<div class="p-5 sm:p-6">
					<h2
						class={cn(
							'mb-2 text-lg leading-tight font-bold sm:text-xl',
							'text-gray-900'
						)}
					>
						{displayTitle}
					</h2>

					<p class="text-mint-600 mb-5 text-sm font-medium">
						{displaySummary}
					</p>

					<!-- 키포인트 -->
					{#if displayKeyPoints.length > 0}
						<div
							class={cn(
								'mb-5 rounded-xl border p-4',
								'bg-mint-50 border-mint-200'
							)}
						>
							<h3
								class={cn(
									'mb-2 flex items-center gap-2 text-sm font-bold',
									'text-mint-700'
								)}
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
							<ul class="space-y-1.5">
								<!-- 💡 #each 키 추가 -->
								{#each displayKeyPoints as point, i (point + i)}
									<li class="flex gap-2 text-sm text-gray-700">
										<span class="text-mint-500 shrink-0 font-bold">•</span>
										<span>{point}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					<!-- 태그 -->
					{#if displayTags.length > 0}
						<div class="flex flex-wrap gap-1.5">
							<!-- 💡 #each 키 추가 -->
							{#each displayTags as tag, i (tag + i)}
								<span
									class={cn(
										'rounded-full px-2.5 py-1 text-xs font-medium',
										i === 0
											? 'bg-mint-50 text-mint-700 border-mint-200 border'
											: 'bg-gray-100 text-gray-600'
									)}
								>
									{tag}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- 푸터 -->
			<footer class={cn('shrink-0 p-4 sm:px-6', 'border-t border-gray-100')}>
				<div class="flex items-center gap-3">
					<a
						href={trend.link}
						target="_blank"
						rel="noopener noreferrer"
						class={cn(
							'flex flex-1 items-center justify-center gap-2',
							'rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
							'text-gray-0 bg-gray-900 hover:bg-gray-800'
						)}
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
						class={cn(
							'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
							isBookmarked
								? 'border-mint-200 bg-mint-50 text-mint-600'
								: 'border-gray-200 text-gray-600 hover:bg-gray-50'
						)}
					>
						<IconBookmark filled={isBookmarked} />
					</button>
				</div>
			</footer>
		</article>
	{/if}
</dialog>
