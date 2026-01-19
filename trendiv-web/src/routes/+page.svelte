<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import ArticleCard from '$lib/components/contents/ArticleCard/ArticleCard.svelte';
	import HeroSection from '$lib/components/contents/HeroSection.svelte';
	import SearchCard from '$lib/components/contents/SearchCard/SearchCard.svelte';
	import FloatingButtonArea from '$lib/components/layout/Floating/FloatingButtonArea.svelte';
	import Header from '$lib/components/layout/Header/Header.svelte';
	import ArticleModal from '$lib/components/modal/ArticleModal/ArticleModal.svelte';
	import FilterModal from '$lib/components/modal/FilterModal/FilterModal.svelte';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { modal } from '$lib/stores/modal.svelte.js';
	import type { Trend } from '$lib/types';
	import type { PageData } from './$types';
	import { onMount, untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	let trends = $state<Trend[]>(data.trends ?? []);
	let page = $state(1);
	let isLoadingMore = $state(false);
	let hasMore = $state(true);
	let searchKeyword = $state('');
	let selectedTags = $state<string[]>([]);
	let isSearching = $state(false);

	//filter - category
	let categoryList = $derived(data.categories ?? []);
	let selectedCategories = $state<string[]>([]);

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

	// data 변경 감지 (soft navigation 대응)
	$effect(() => {
		if (data.trends) {
			trends = data.trends;
		}
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

	// =============================================
	// Masonry 증분 처리 관련
	// =============================================
	let cachedColumns = $state<Trend[][]>([[], []]);
	let cachedHeights = $state<number[]>([0, 0]);
	let lastProcessedCount = $state(0);
	let lastColumnCount = $state(2);

	const columnCount = $derived(innerWidth < 640 ? 1 : 2);

	function estimateHeight(trend: Trend): number {
		const analysis = trend.represent_result ?? null;

		const titleLen = (analysis?.title_ko || trend.title || '').length;
		const summaryLen = (analysis?.oneLineSummary || '').length;
		const tagCount = analysis?.tags?.length ?? 0;

		return (
			150 + Math.min(titleLen, 60) + Math.min(summaryLen, 120) + tagCount * 10
		);
	}

	function resetMasonryCache() {
		cachedColumns = [[], []];
		cachedHeights = [0, 0];
		lastProcessedCount = 0;
	}

	$effect(() => {
		const currentTrends = trends;
		const cols = columnCount;

		untrack(() => {
			if (cols !== lastColumnCount) {
				lastColumnCount = cols;
				resetMasonryCache();

				if (cols === 1) {
					cachedColumns = [currentTrends];
					lastProcessedCount = currentTrends.length;
					return;
				}
			}

			if (cols === 1) {
				cachedColumns = [currentTrends];
				lastProcessedCount = currentTrends.length;
				return;
			}

			const firstCachedId = cachedColumns[0]?.[0]?.id;
			const firstTrendId = currentTrends[0]?.id;

			if (
				currentTrends.length === 0 ||
				currentTrends.length < lastProcessedCount ||
				(firstCachedId && firstTrendId && firstCachedId !== firstTrendId)
			) {
				resetMasonryCache();
			}

			for (let i = lastProcessedCount; i < currentTrends.length; i++) {
				const trend = currentTrends[i];
				const shorter = cachedHeights[0] <= cachedHeights[1] ? 0 : 1;

				cachedColumns[shorter].push(trend);
				cachedHeights[shorter] += estimateHeight(trend);
			}

			lastProcessedCount = currentTrends.length;
		});
	});

	// =============================================
	// fetchTrends
	// =============================================
	async function fetchTrends(reset = false) {
		if (isLoadingMore && !reset) return;

		abortController?.abort();
		abortController = new AbortController();

		if (reset) {
			isSearching = true;
			page = 1;
			hasMore = true;
			trends = [];
			resetMasonryCache();
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

			if (selectedCategories.length > 0) {
				params.append('category', selectedCategories.join(','));
			}

			const res = await fetch(`${API_URL}/api/trends?${params}`, {
				signal: abortController.signal
			});

			if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

			const result = await res.json();

			if (result.success) {
				if (reset) {
					trends = result.data;
				} else {
					const newItems = result.data.filter(
						(newTrend: Trend) => !trends.some((ex) => ex.id === newTrend.id)
					);
					trends = [...trends, ...newItems];
				}
				if (trends.length >= result.total) hasMore = false;
			} else {
				console.error('데이터 로드 실패:', result.error);
			}
		} catch (e) {
			if (e instanceof Error && e.name === 'AbortError') {
				return;
			}
			console.error('API 호출 중 오류 발생:', e);
		} finally {
			isLoadingMore = false;
			isSearching = false;
			abortController = null;
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

	// ✅ SearchCard용 - 즉시 API 호출
	function handleTagChange(newTags: string[]) {
		selectedTags = newTags;
		fetchTrends(true);
	}

	// ✅ SearchCard용 - 즉시 API 호출
	function handleCategorySelect(category: string) {
		if (selectedCategories.includes(category)) {
			selectedCategories = selectedCategories.filter((c) => c !== category);
		} else {
			selectedCategories = [...selectedCategories, category];
		}
		fetchTrends(true);
	}

	// ✅ 모달용 - API 호출 없이 상태만 변경
	function handleModalTagChange(newTags: string[]) {
		selectedTags = newTags;
	}

	// ✅ 모달용 - API 호출 없이 상태만 변경
	function handleModalCategoryChange(categories: string[]) {
		selectedCategories = categories;
	}

	function openArticleModal(trend: Trend) {
		modal.open(ArticleModal, {
			trend: trend
		});
	}

	// ✅ 모달 열기 - onapply에서만 API 호출
	function openFilterModal() {
		modal.open(FilterModal, {
			open: true,
			tags: popularTags,
			categoryList: categoryList,
			selectedTags: selectedTags,
			selectedCategory: selectedCategories,
			onchange: handleModalTagChange,
			onchangeCategory: handleModalCategoryChange,
			onapply: () => fetchTrends(true)
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
</script>

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
				{selectedTags}
				tags={popularTags}
				{categoryList}
				selectedCategory={selectedCategories}
				onselectCategory={handleCategorySelect}
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
					{#each cachedColumns as column, colIndex (colIndex)}
						<div class="flex flex-col gap-6">
							{#each column as trend (trend.id)}
								<ArticleCard
									{trend}
									onclick={() => openArticleModal(trend)}
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
	<FloatingButtonArea onfilter={openFilterModal} />
</main>
