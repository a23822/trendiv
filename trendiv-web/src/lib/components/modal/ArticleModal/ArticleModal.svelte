<!-- https://www.figma.com/design/jxEwxoZSxmKtjMzQkeKkcP/Trendiv?node-id=4-26966&t=7x8K9SHkPxAYh2oN-4 -->
<script lang="ts">
	import ArrowButton from '$lib/components/pure/Button/ArrowButton.svelte';
	import CloseButton from '$lib/components/pure/Button/CloseButton.svelte';
	import CircleProgress from '$lib/components/pure/Progress/circleProgress.svelte';
	import ScrollContainer from '$lib/components/pure/Scroll/scrollContainer.svelte';
	import KeywordTag from '$lib/components/pure/Tag/keywordTag.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import IconBookmark from '$lib/icons/icon_bookmark.svelte';
	import IconBot from '$lib/icons/icon_bot.svelte';
	import IconLightbulb from '$lib/icons/icon_lightbulb.svelte';
	import IconLink from '$lib/icons/icon_link.svelte';
	import IconLogoGemini from '$lib/icons/icon_logo_gemini.svelte';
	import IconLogoSource from '$lib/icons/icon_logo_source.svelte';
	import IconScan from '$lib/icons/icon_scan.svelte';
	import IconShare from '$lib/icons/icon_share.svelte';
	import IconTag from '$lib/icons/icon_tag.svelte';
	import { bookmarks } from '$lib/stores/bookmarks.svelte';
	import { modal } from '$lib/stores/modal.svelte.js';
	import type { Trend } from '$lib/types';
	import { cn } from '$lib/utils/ClassMerge';
	import { formatDate } from '$lib/utils/date';

	interface Props {
		trend: Trend;
	}

	let { trend }: Props = $props();

	let dialog: HTMLDialogElement;

	// --- State: Data ---
	let selectedIndex = $state(0);

	// --- Refs: 각 버튼 요소 ---
	let buttonRefs: HTMLButtonElement[] = $state([]);

	const iconId = $derived(`article-modal-${trend.id}`);
	// --- Derived: Data ---
	const isBookmarked = $derived(
		trend ? bookmarks.isBookmarked(trend.link) : false
	);
	const results = $derived(trend?.analysis_results || []);
	const currentData = $derived(
		trend?.analysis_results?.[selectedIndex] ?? trend?.analysis_results?.[0]
	);

	const displayTitle = $derived(currentData?.title_ko || trend?.title || '');
	const displaySummary = $derived(currentData?.oneLineSummary || '');
	const displayKeyPoints = $derived(currentData?.keyPoints || []);
	const displayTags = $derived(currentData?.tags || []);
	const displayScore = $derived(currentData?.score ?? 0);
	const displayReason = $derived(currentData?.reason || '');
	const displayDate = $derived(formatDate(trend.date));
	const displayCategory = $derived(trend.category);

	// Dialog Open/Close 관리
	$effect(() => {
		if (dialog && !dialog.open) {
			dialog.showModal();
		}
	});

	// --- Handlers: Modal Control ---
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

	// [Logic] 공유하기 핸들러
	async function handleShare() {
		const shareData = {
			title: displayTitle,
			text: `${displaySummary}\n\n[Trendiv AI 요약]`,
			url: trend.link
		};

		if (navigator.share && navigator.canShare(shareData)) {
			try {
				await navigator.share(shareData);
			} catch {
				// Ignore
			}
		} else {
			try {
				await navigator.clipboard.writeText(
					`${shareData.title}\n${shareData.url}`
				);
				alert('링크가 복사되었습니다.');
			} catch {
				alert('공유 기능을 사용할 수 없습니다.');
			}
		}
	}
</script>

<dialog
	bind:this={dialog}
	class={cn(
		'm-auto bg-transparent',
		'backdrop:bg-neutral-900/40 backdrop:backdrop-blur-sm',
		'open:animate-in open:fade-in open:zoom-in-95',
		'closed:animate-out closed:fade-out closed:zoom-out-95'
	)}
	onclose={handleNativeClose}
	onclick={handleBackdropClick}
>
	<!-- Modal Card -->
	<div
		class={cn(
			'bg-bg-main flex flex-col',
			'w-[90vw] max-w-180 max-h-[85vh]',
			'rounded-3xl shadow-xl overflow-hidden',
			'border border-border-subtle'
		)}
	>
		<!-- header -->
		<div class="shrink-0 px-6 pt-6 pb-2">
			<!-- subArea -->
			<div class="flex items-center justify-between">
				<div
					class="flex items-center gap-2 text-gray-500 text-sm font-medium"
				>
					<IconLogoSource
						category={displayCategory}
						id={iconId}
						size={20}
					/>
					<div class="flex items-center gap-2">
						<span class="text-gray-700 font-semibold"
							>{displayCategory}</span
						>
						<!-- Divider using pseudo element styling equivalent -->
						<div class="h-3 w-[1px] bg-gray-300"></div>
						<span class="text-gray-500">{displayDate}</span>
					</div>
				</div>
				<CloseButton
					onclick={requestClose}
					variant="ghost"
					class="text-gray-400 hover:text-gray-800 hover:bg-bg-surface -mr-2"
				/>
			</div>
		</div>

		<!-- body -->
		<div class="flex-1 overflow-y-auto px-6 pb-8 scrollbar-hide">
			<!-- AI Section Header -->
			<div class="flex items-center gap-1.5 text-primary mb-3">
				<IconBot size={18} />
				<h4 class="font-bold text-sm">AI 분석 결과</h4>
			</div>

			<!-- Model Switcher -->
			<div class="mb-6">
				<ScrollContainer
					items={results.map((r) => r.aiModel)}
					bind:selectedIndex
				/>
			</div>

			<!-- Title -->
			<div class="mb-8">
				<h3 class="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
					{displayTitle}
				</h3>
			</div>

			<!-- Analysis Content -->
			<section class="mb-8">
				<div class="flex items-center gap-2 text-gray-800 mb-3">
					<IconScan size={20} />
					<h4 class="font-bold text-base">분석 내용</h4>
				</div>
				
				<!-- Score & Reason Box -->
				<div class="flex items-center gap-4 bg-bg-surface p-4 rounded-2xl mb-4 border border-border-subtle">
					<CircleProgress
						score={displayScore}
						max={10}
						class="shrink-0"
					/>
					<p class="text-sm text-gray-700 font-medium leading-relaxed">
						{displayReason}
					</p>
				</div>
				
				<p class="text-gray-700 leading-relaxed text-sm sm:text-base">
					{displaySummary}
				</p>
			</section>

			<!-- Key Points -->
			<section class="mb-8">
				<div class="flex items-center gap-2 text-gray-800 mb-3">
					<IconLightbulb size={20} />
					<h4 class="font-bold text-base">핵심 포인트</h4>
				</div>
				<ul class="flex flex-col gap-3">
					{#each displayKeyPoints as point, i (point + i)}
						<li
							class="flex items-start gap-2.5 bg-bg-surface p-3.5 rounded-xl text-sm text-gray-700 leading-relaxed border border-border-subtle"
						>
							<div class="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"></div>
							<span>{point}</span>
						</li>
					{/each}
				</ul>
			</section>

			<!-- Tags -->
			<section>
				<div class="flex items-center gap-2 text-gray-800 mb-3">
					<IconTag size={20} />
					<h4 class="font-bold text-base">키워드 태그</h4>
				</div>
				<ul class="flex flex-wrap gap-2">
					{#each displayTags as tag, i (tag + i)}
						<li class="flex shrink-0 items-center">
							<KeywordTag {tag} />
						</li>
					{/each}
				</ul>
			</section>
		</div>

		<!-- footer -->
		<div
			class="shrink-0 p-4 border-t border-border-subtle bg-bg-main flex items-center justify-end gap-2"
		>
			<button
				type="button"
				onclick={handleBookmark}
				aria-label="북마크"
				class="p-2.5 rounded-full text-gray-500 hover:text-primary hover:bg-bg-surface transition-colors"
			>
				<IconBookmark
					size={24}
					filled={isBookmarked}
				/>
			</button>
			<a
				href={trend.link}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="원문 보기"
				class="p-2.5 rounded-full text-gray-500 hover:text-gray-900 hover:bg-bg-surface transition-colors"
			>
				<IconLink size={24} />
			</a>
			<button
				type="button"
				onclick={handleShare}
				aria-label="공유하기"
				class="p-2.5 rounded-full text-gray-500 hover:text-gray-900 hover:bg-bg-surface transition-colors"
			>
				<IconShare />
			</button>
		</div>
	</div>
</dialog>