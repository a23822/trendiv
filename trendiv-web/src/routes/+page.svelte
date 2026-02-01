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
	import { bookmarks } from '$lib/stores/bookmarks.svelte';
	import { hiddenArticles } from '$lib/stores/hiddenarticles.svelte';
	import { modal } from '$lib/stores/modal.svelte.js';
	import type { Trend, ArticleStatusFilter } from '$lib/types';
	import type { PageData } from './$types';
	import { onMount, untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	// 개인화 필터 상태
	let statusFilter = $state<ArticleStatusFilter>('all');

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
	let popularTags = $derived(data.popularTags ?? []);

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
		// 반응형 의존성: 데이터나 스토어 준비 상태가 바뀌면 실행
		const source = data.trends;
		const ready = hiddenArticles.isReady;

		untrack(() => {
			// 페이지 첫 진입이고 아직 로딩 중이 아닐 때만 실행
			if (source && page === 1 && !isLoadingMore) {
				// 1. 숨김 보관함('hidden')이 아닐 때는 숨겨진 글을 리스트에서 제거
				if (ready && statusFilter !== 'hidden') {
					trends = source.filter((t) => !hiddenArticles.isHidden(t.link));
				}
				// 2. 아직 스토어가 준비 안 됐거나, 숨김 보관함이면 그대로 표시
				else {
					trends = source;
				}
			}
		});
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
				alert(auth.user ? '구독 완료!' : '메일함을 확인해주세요.');
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

	// 실제 렌더링할 아이템 (숨김 필터 상태에 따라 다르게 처리)
	let displayTrends = $derived.by(() => {
		const hiddenList = hiddenArticles.list ?? [];
		const bookmarkList = bookmarks.list ?? [];

		if (statusFilter === 'hidden') {
			return trends.filter((t) => hiddenList.includes(t.link));
		}

		if (statusFilter === 'bookmarked') {
			return trends.filter((t) => bookmarkList.includes(t.link));
		}
		return trends;
	});

	let masonryColumns = $derived.by(() => {
		const cols = columnCount;
		const items = displayTrends;

		const hiddenList = hiddenArticles.list;

		if (cols === 1) return [items];
		if (items.length === 0) return [[], []];

		const columns: Trend[][] = [[], []];
		const heights = [0, 0];

		for (const trend of items) {
			const shorter = heights[0] <= heights[1] ? 0 : 1;
			columns[shorter].push(trend);
			const isHidden = hiddenList.includes(trend.link);
			heights[shorter] += isHidden ? 48 : estimateHeight(trend);
		}

		return columns;
	});

	// =============================================
	// fetchTrends
	// =============================================
	async function fetchTrends(reset = false) {
		if (isLoadingMore && !reset) return;

		// 현재 요청의 컨트롤러를 로컬 변수로 저장
		const currentController = new AbortController();

		// 이전 요청 중단
		abortController?.abort();
		abortController = currentController;

		if (reset) {
			isSearching = true;
			page = 1;
			hasMore = true;
			trends = [];
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

			// 개인화 필터 파라미터 추가
			if (auth.user?.id) {
				params.append('userId', auth.user.id);
			}
			params.append('statusFilter', statusFilter);

			const res = await fetch(`${API_URL}/api/trends?${params}`, {
				signal: currentController.signal
			});

			if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

			const result = await res.json();

			if (result.success) {
				const currentFilter = statusFilter;

				untrack(() => {
					// 새로 가져온 데이터 중 이미 숨김 처리된 것은 제외
					const incoming =
						currentFilter === 'hidden'
							? result.data
							: result.data.filter(
									(t: Trend) => !hiddenArticles.isHidden(t.link)
								);

					if (reset) {
						trends = incoming;
					} else {
						const existingIds = new Set(trends.map((t) => t.id));
						const newItems = incoming.filter(
							(t: Trend) => !existingIds.has(t.id)
						);
						trends = [...trends, ...newItems];
					}
				});

				// 무한 루프 방지 조건 (전체 개수와 비교)
				if (result.data.length === 0 || trends.length >= result.total) {
					hasMore = false;
				}
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

			// 내가 생성한 컨트롤러일 때만 null 처리
			if (abortController === currentController) {
				abortController = null;
			}
		}
	}

	function handleSearch(keyword: string) {
		searchKeyword = keyword;
		fetchTrends(true);
	}

	function handleClear() {
		if (searchKeyword === '') return;

		searchKeyword = '';
		fetchTrends(true);
	}

	// SearchCard용 - 즉시 API 호출
	function handleTagChange(newTags: string[]) {
		selectedTags = newTags;
		fetchTrends(true);
	}

	// SearchCard용 - 즉시 API 호출
	function handleCategorySelect(category: string) {
		if (selectedCategories.includes(category)) {
			selectedCategories = selectedCategories.filter((c) => c !== category);
		} else {
			selectedCategories = [...selectedCategories, category];
		}
		fetchTrends(true);
	}

	// SearchCard용 - 개인화 필터 변경 (즉시 API 호출)
	function handleStatusFilterChange(status: ArticleStatusFilter) {
		// 북마크/숨김 필터는 로그인 필요
		if (status !== 'all' && !auth.user) {
			auth.openLoginModal();
			return;
		}
		statusFilter = status;
		fetchTrends(true);
	}

	// 모달용 - API 호출 없이 상태만 변경
	function handleModalTagChange(newTags: string[]) {
		selectedTags = newTags;
	}

	// 모달용 - API 호출 없이 상태만 변경
	function handleModalCategoryChange(categories: string[]) {
		selectedCategories = categories;
	}

	// 모달용 - 개인화 필터 상태만 변경
	function handleModalStatusFilterChange(status: ArticleStatusFilter) {
		// 북마크/숨김 필터는 로그인 필요
		if (status !== 'all' && !auth.user) {
			auth.openLoginModal();
			return;
		}
		statusFilter = status;
	}

	function openArticleModal(trend: Trend) {
		modal.open(ArticleModal, {
			trend: trend
		});
	}

	// 모달 열기 - onapply에서만 API 호출
	function openFilterModal() {
		modal.open(FilterModal, {
			open: true,
			tags: popularTags,
			categoryList: categoryList,
			selectedTags: selectedTags,
			selectedCategory: selectedCategories,
			statusFilter: statusFilter,
			onchange: handleModalTagChange,
			onchangeCategory: handleModalCategoryChange,
			onstatusChange: handleModalStatusFilterChange,
			onapply: () => fetchTrends(true)
		});
	}

	function infiniteScroll(node: HTMLElement) {
		const observer = new IntersectionObserver((entries) => {
			if (
				entries.at(0)?.isIntersecting &&
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
				{statusFilter}
				onselectCategory={handleCategorySelect}
				onstatusChange={handleStatusFilterChange}
				onsearch={handleSearch}
				onclear={handleClear}
				onchange={handleTagChange}
			/>

			{#if isSearching}
				<div class="py-32 text-center text-gray-400">로딩 중...</div>
			{:else if trends.length === 0}
				<div class="py-32 text-center text-gray-400">
					{#if statusFilter === 'bookmarked'}
						북마크한 아티클이 없습니다.
					{:else if statusFilter === 'hidden'}
						숨김 처리한 아티클이 없습니다.
					{:else}
						결과가 없습니다.
					{/if}
				</div>
			{:else}
				<div class="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
					{#each masonryColumns as column, colIndex (colIndex)}
						<div class="flex flex-col gap-6">
							{#each column as trend (trend.id)}
								<ArticleCard
									{trend}
									onclick={() => openArticleModal(trend)}
									isForceExpand={statusFilter === 'hidden'}
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
