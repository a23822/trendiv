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
		// 1. 공유할 데이터 객체 생성
		const shareData = {
			title: displayTitle,
			text: `${displaySummary}\n\n[Trendiv AI 요약]`, // 줄바꿈(\n) 포함
			url: trend.link
		};

		// 2. 브라우저가 '공유하기' 기능을 지원하는지 확인 (모바일 등)
		if (navigator.share && navigator.canShare(shareData)) {
			try {
				await navigator.share(shareData); // 네이티브 공유 창 띄우기
			} catch {
				// 사용자가 공유 창을 닫거나 취소했을 때 에러 무시
			}
		} else {
			// 3. 미지원 환경(PC 등)에서는 클립보드에 복사
			try {
				// 제목 + URL 형태로 텍스트 조합해서 복사
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
		'flex items-center justify-center',
		'h-full max-h-full w-full max-w-full p-5',
		'bg-transparent',
		// dimmed 요소는 backdrop 에 적용
		'backdrop:bg-black/50 backdrop:backdrop-blur-xs'
	)}
	onclose={handleNativeClose}
	onclick={handleBackdropClick}
>
	<div class={cn('bg-bg-main flex max-h-full max-w-180 flex-col')}>
		<!-- header-->
		<div class="shrink-0">
			<!-- subArea -->
			<div>
				<div class="flex items-center">
					<IconLogoSource
						category={displayCategory}
						id={iconId}
					/>
					<span>{displayCategory}</span>
					<span>{displayDate}</span>
					<CloseButton
						onclick={requestClose}
						variant="inverted"
						class="ml-auto"
					/>
				</div>
			</div>
		</div>
		<!-- body -->
		<div class="flex-1 overflow-y-auto">
			<div class={cn('flex items-center', 'text-gray-800')}>
				<IconBot size={20} />
				<h4>AI 분석 결과</h4>
			</div>
			<ScrollContainer
				items={results.map((r) => r.aiModel)}
				bind:selectedIndex
			/>
			<!-- titleArea -->
			<div>
				<h3>{displayTitle}</h3>
			</div>
			<section>
				<div class={cn('flex items-center', 'text-gray-800')}>
					<IconScan size={20} />
					<h4>분석 내용</h4>
				</div>
				<div class="flex items-center">
					<CircleProgress
						score={displayScore}
						max={10}
						class="shrink-0"
					/>
					<p>{displayReason}</p>
				</div>
				<p>{displaySummary}</p>
			</section>
			<!-- keyPoints -->
			<section>
				<div class={cn('flex items-center', 'text-gray-800')}>
					<IconLightbulb size={20} />
					<h4>핵심 포인트</h4>
				</div>
				<!-- keypointListItem -->
				<ul>
					{#each displayKeyPoints as point, i (point + i)}
						<li>
							<span>{point}</span>
						</li>
					{/each}
				</ul>
			</section>
			<section>
				<div class={cn('flex items-center', 'text-gray-800')}>
					<IconTag size={20} />
					<h4>키워드 태그</h4>
				</div>
				<ul class="flex flex-wrap gap-2">
					{#each displayTags as tag, i (tag + i)}
						<!-- 넘치면 overflow-hidden 없이 개행처리 -->
						<li class="flex shrink-0 items-center">
							<!-- indicator -->
							<span class="shrink-0"></span>
							<KeywordTag {tag} />
						</li>
					{/each}
				</ul>
			</section>
		</div>
		<!-- footer -->
		<div class="shrink-0">
			<button
				type="button"
				onclick={handleBookmark}
				aria-label="북마크"
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
			>
				<IconLink size={24} />
			</a>
			<button
				type="button"
				onclick={handleShare}
				aria-label="공유하기"
				><IconShare />
			</button>
		</div>
	</div>
</dialog>
