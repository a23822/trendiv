<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import ArticleCard from '$lib/components/contents/ArticleCard/ArticleCard.svelte';
	import HeroSection from '$lib/components/contents/HeroSection.svelte';
	import SearchCard from '$lib/components/contents/SearchCard.svelte';
	import Header from '$lib/components/layout/Header/Header.svelte';
	import ArticleModal from '$lib/components/modal/ArticleModal/ArticleModal.svelte';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { modal } from '$lib/stores/modal.svelte.js';
	import type { Trend } from '$lib/types';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	let trends = $state<Trend[]>(data.trends ?? []);
	let page = $state(1);
	let isLoadingMore = $state(false);
	let hasMore = $state(true);
	let searchKeyword = $state('');
	let selectedTags = $state<string[]>([]);
	let isSearching = $state(false);

	let abortController: AbortController | null = null;

	const API_URL = PUBLIC_API_URL || 'http://127.0.0.1:3000';
	const popularTags = [
		'CSS',
		'HTML',
		'React',
		'Accessibility',
		'iOS',
		'Performance'
	];

	// 구독 관련
	let email = $state('');
	let isSubmitting = $state(false);

	// resize 디바운스
	let innerWidth = $state(0);
	let resizeTimeout: ReturnType<typeof setTimeout>;

	function handleResize() {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			innerWidth = window.innerWidth;
		}, 150);
	}

	$effect(() => {
		trends = data.trends ?? [];
	});

	$effect(() => {
		if (auth.user?.email) {
			email = auth.user.email;
		}
	});

	onMount(() => {
		innerWidth = window.innerWidth;
		window.addEventListener('resize', handleResize);

		if (trends.length === 0) {
			fetchTrends(true);
		}

		// cleanup: resize 리스너, 타이머, abort 정리
		return () => {
			window.removeEventListener('resize', handleResize);
			clearTimeout(resizeTimeout);
			abortController?.abort();
		};
	});

	async function handleSubscribe() {
		const targetEmail = auth.user?.email || email;
		if (!targetEmail) return;

		isSubmitting = true;

		try {
			const res = await fetch(`${API_URL}/api/subscribe`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: targetEmail })
			});

			if (res.ok) {
				alert(auth.user ? '✅ 구독 완료!' : '✅ 메일함을 확인해주세요.');
				if (!auth.user) email = '';
			} else {
				const err = await res.json();
				alert(`⚠️ ${err.error || '오류가 발생했습니다.'}`);
			}
		} catch {
			alert('❌ 연결 실패');
		} finally {
			isSubmitting = false;
		}
	}

	async function fetchTrends(reset = false) {
		if (isLoadingMore && !reset) return;

		abortController?.abort();
		abortController = new AbortController();

		if (reset) {
			isSearching = true;
			page = 1;
			hasMore = true;
			// trends = [] 제거 → 깜빡임 방지
		} else {
			isLoadingMore = true;
			page += 1;
		}

		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: '20',
				searchKeyword: searchKeyword,
				tagFilter: selectedTags.join(',')
			});
			const res = await fetch(`${API_URL}/api/trends?${params}`, {
				signal: abortController.signal
			});

			if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

			const result = await res.json();

			if (result.success) {
				if (reset) {
					trends = result.data; // 데이터 받은 후 교체
				} else {
					const newItems = result.data.filter(
						(newTrend: Trend) => !trends.some((ex) => ex.id === newTrend.id)
					);
					trends = [...trends, ...newItems];
				}
				if (trends.length >= result.total) hasMore = false;
			} else {
				console.error('데이터 로드 실패:', result.error);
				// hasMore 유지 → 재시도 가능
			}
		} catch (e) {
			if (e instanceof Error && e.name === 'AbortError') {
				return;
			}
			console.error('API 호출 중 오류 발생:', e);
			// hasMore 유지 → 재시도 가능
		} finally {
			isLoadingMore = false;
			isSearching = false;
		}
	}

	function handleSearch(keyword: string) {
		searchKeyword = keyword;
		fetchTrends(true);
	}

	function handleClear() {
		searchKeyword = '';
		fetchTrends(true);
	}

	function handleTagChange(newTags: string[]) {
		selectedTags = newTags;
		fetchTrends(true);
	}

	function openModal(trend: Trend) {
		modal.open(ArticleModal, {
			trend: trend
		});
	}

	function infiniteScroll(node: HTMLElement) {
		const observer = new IntersectionObserver((entries) => {
			if (
				entries[0].isIntersecting &&
				hasMore &&
				!isSearching &&
				!isLoadingMore
			) {
				fetchTrends(false);
			}
		});

		observer.observe(node);

		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	// masonry 배열 (브레이크포인트 기반)
	const masonryColumns = $derived.by(() => {
		if (innerWidth < 640) return [trends];

		const cols: Trend[][] = [[], []];
		const heights = [0, 0];

		trends.forEach((trend) => {
			const shorter = heights[0] <= heights[1] ? 0 : 1;
			cols[shorter].push(trend);

			// 높이 추정
			const analysis = trend.analysis_results?.length
				? trend.analysis_results[trend.analysis_results.length - 1]
				: null;

			const titleLen = (analysis?.title_ko || trend.title || '').length;
			const summaryLen = (analysis?.oneLineSummary || '').length;
			const tagCount = analysis?.tags?.length ?? 0;

			// 기본 높이 + 제목(2줄 제한) + 요약(3줄 제한) + 태그 줄 수
			heights[shorter] +=
				150 +
				Math.min(titleLen, 60) +
				Math.min(summaryLen, 120) +
				tagCount * 10;
		});

		return cols;
	});
</script>

<!-- bind:innerWidth 제거 -->

<Header />

<main>
	<HeroSection
		onSubscribe={handleSubscribe}
		bind:email
		{isSubmitting}
	/>
	<div class="bg-bg-surface min-h-screen">
		<div class="mx-auto max-w-5xl p-4 sm:p-6">
			<SearchCard
				bind:searchKeyword
				bind:selectedTags
				tags={popularTags}
				{isLoadingMore}
				onsearch={handleSearch}
				onclear={handleClear}
				onchange={handleTagChange}
			/>

			{#if isSearching}
				<div class="py-32 text-center text-gray-400">로딩 중...</div>
			{:else if trends.length === 0}
				<div class="py-32 text-center text-gray-400">결과가 없습니다.</div>
			{:else}
				<div class="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
					{#each masonryColumns as column, colIndex (colIndex)}
						<div class="flex flex-col gap-6">
							{#each column as trend (trend.id)}
								<ArticleCard
									{trend}
									onclick={() => openModal(trend)}
								/>
							{/each}
						</div>
					{/each}
				</div>

				{#if hasMore}
					<div
						use:infiniteScroll
						class="flex justify-center py-16 text-sm text-gray-400"
					>
						{#if isLoadingMore}
							로딩 중...
						{:else}
							스크롤하여 더 보기
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</div>
</main>
