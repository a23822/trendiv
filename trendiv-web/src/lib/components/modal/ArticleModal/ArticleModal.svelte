<!-- https://www.figma.com/design/jxEwxoZSxmKtjMzQkeKkcP/Trendiv?node-id=4-26966&t=7x8K9SHkPxAYh2oN-4 -->
<script lang="ts">
	import ModelSelectCard from '$lib/components/contents/ModelSelectCard/ModelSelectCard.svelte';
	import ModalLayout from '$lib/components/modal/ModalLayout.svelte';
	import CircleProgress from '$lib/components/pure/Progress/circleProgress.svelte';
	import KeywordTag from '$lib/components/pure/Tag/keywordTag.svelte';
	import IconBookmark from '$lib/icons/icon_bookmark.svelte';
	import IconBot from '$lib/icons/icon_bot.svelte';
	import IconLightbulb from '$lib/icons/icon_lightbulb.svelte';
	import IconLink from '$lib/icons/icon_link.svelte';
	import IconLogoSource from '$lib/icons/icon_logo_source.svelte';
	import IconScan from '$lib/icons/icon_scan.svelte';
	import IconShare from '$lib/icons/icon_share.svelte';
	import IconTag from '$lib/icons/icon_tag.svelte';
	import { bookmarks } from '$lib/stores/bookmarks.svelte';
	import { modal } from '$lib/stores/modal.svelte.js';
	import type { Trend } from '$lib/types';
	import { formatDate } from '$lib/utils/date';

	interface Props {
		trend: Trend;
		onclose?: () => void;
	}

	let { trend, onclose }: Props = $props();

	let open = $state(true);

	// --- State: Data ---
	let selectedIndex = $state(0);

	const iconId = $derived(`article-modal-${trend?.id ?? ''}`);
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

	function handleClose() {
		if (onclose) {
			onclose();
		} else {
			modal.close();
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

{#snippet headerComponent()}<div
		class="flex items-center gap-2 text-sm font-medium text-gray-500"
	>
		<IconLogoSource
			category={displayCategory}
			id={iconId}
			size={20}
		/>
		<div class="flex items-center gap-2">
			{#if displayCategory !== 'X'}
				<span class="font-semibold text-gray-700">{displayCategory}</span>
				<!-- Divider using pseudo element styling equivalent -->
				<div class="h-3 w-[1px] bg-gray-300"></div>
			{/if}
			<span class="text-gray-500">{displayDate}</span>
		</div>
	</div>
{/snippet}

{#snippet footerComponent()}
	<div
		class="border-border-subtle bg-bg-main flex shrink-0 items-center justify-end gap-2 border-t p-4"
	>
		<button
			type="button"
			onclick={handleBookmark}
			aria-label="북마크"
			class="hover:text-primary hover:bg-bg-surface rounded-full p-2.5 text-gray-500 transition-colors"
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
			class="hover:bg-bg-surface rounded-full p-2.5 text-gray-500 transition-colors hover:text-gray-900"
		>
			<IconLink size={24} />
		</a>
		<button
			type="button"
			onclick={handleShare}
			aria-label="공유하기"
			class="hover:bg-bg-surface rounded-full p-2.5 text-gray-500 transition-colors hover:text-gray-900"
		>
			<IconShare />
		</button>
	</div>
{/snippet}

<ModalLayout
	bind:open
	onclose={handleClose}
	{headerComponent}
	{footerComponent}
	><!-- body -->
	<div class="pt-4 pb-8">
		<!-- AI Section Header -->
		<div class="text-primary mb-3 flex items-center gap-1.5">
			<IconBot size={20} />
			<h4 class="text-base font-bold">AI 분석 결과</h4>
		</div>

		<!-- Model Switcher -->
		<div class="mb-8">
			<ModelSelectCard
				items={results.map((r) => r.aiModel)}
				bind:selectedIndex
			/>
		</div>

		<!-- Title -->
		<div class="mb-8">
			<h3 class="text-xl leading-snug font-bold text-gray-900 sm:text-2xl">
				{displayTitle}
			</h3>
		</div>

		<!-- Analysis Content -->
		<section class="mb-8">
			<div class="mb-3 flex items-center gap-2 text-gray-800">
				<IconScan size={20} />
				<h4 class="text-base font-bold">분석 내용</h4>
			</div>

			<!-- Score & Reason Box -->
			<div
				class="bg-bg-surface border-border-subtle mb-4 flex items-center gap-4 rounded-2xl border p-4"
			>
				<CircleProgress
					score={displayScore}
					max={10}
					class="shrink-0"
				/>
				<p class="text-sm leading-relaxed font-medium text-gray-700">
					{displayReason}
				</p>
			</div>

			<p class="text-sm leading-relaxed text-gray-700 sm:text-base">
				{displaySummary}
			</p>
		</section>

		<!-- Key Points -->
		<section class="mb-8">
			<div class="mb-3 flex items-center gap-2 text-gray-800">
				<IconLightbulb size={20} />
				<h4 class="text-base font-bold">핵심 포인트</h4>
			</div>
			<ul class="flex flex-col gap-3">
				{#each displayKeyPoints as point, i (point + i)}
					<li
						class="bg-bg-surface border-border-subtle flex items-center gap-2.5 rounded-xl border p-3.5 text-sm leading-relaxed text-gray-700"
					>
						<div class="bg-primary h-1.5 w-1.5 shrink-0 rounded-full"></div>
						<span>{point}</span>
					</li>
				{/each}
			</ul>
		</section>

		<!-- Tags -->
		<section>
			<div class="mb-3 flex items-center gap-2 text-gray-800">
				<IconTag size={20} />
				<h4 class="text-base font-bold">키워드 태그</h4>
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
</ModalLayout>
