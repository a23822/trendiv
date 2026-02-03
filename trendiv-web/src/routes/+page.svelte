<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import ArticleCard from '$lib/components/contents/ArticleCard/ArticleCard.svelte';
	import HeroSection from '$lib/components/contents/HeroSection.svelte';
	import SearchCard from '$lib/components/contents/SearchCard/SearchCard.svelte';
	import FloatingButtonArea from '$lib/components/layout/Floating/FloatingButtonArea.svelte';
	import Header from '$lib/components/layout/Header/Header.svelte';
	import ArticleModal from '$lib/components/modal/ArticleModal/ArticleModal.svelte';
	import FilterModal from '$lib/components/modal/FilterModal/FilterModal.svelte';
	import DotLoading from '$lib/components/pure/Load/DotLoading.svelte';
	import IconLoadingAlert from '$lib/icons/icon_loading_alert.svelte';
	import IconLoadingScan from '$lib/icons/icon_loading_scan.svelte';
	import IconScroll from '$lib/icons/icon_scroll.svelte';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { bookmarks } from '$lib/stores/bookmarks.svelte.ts';
	import { hiddenArticles } from '$lib/stores/hiddenarticles.svelte.ts';
	import { modal } from '$lib/stores/modal.svelte.js';
	import type { Trend, ArticleStatusFilter } from '$lib/types';
	import { cn } from '$lib/utils/ClassMerge';
	import type { PageData } from './$types';
	import { onMount, tick } from 'svelte';

	let { data }: { data: PageData } = $props();

	// 필터 상태
	let statusFilter = $state<ArticleStatusFilter>('all');

	// 데이터 상태
	let trends = $state<Trend[]>(data.trends ?? []);
	let bufferTrends = $state<Trend[]>([]);
	let page = $state(1);
	let isLoadingMore = $state(false);
	let hasMore = $state(true);
	let searchKeyword = $state('');
	let selectedTags = $state<string[]>([]);
	let isSearching = $state(false);

	// 레이아웃 준비 상태 (FOUC 방지)
	let isLayoutReady = $state(false);

	// 카테고리 필터
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

	// 페이지 진입 시 초기화
	$effect(() => {
		hiddenArticles.resetView();
		bookmarks.resetView();
	});

	// 초기 데이터 필터링
	$effect(() => {
		const source = data.trends;
		const ready = hiddenArticles.isReady;

		if (source && page === 1 && !isLoadingMore) {
			if (ready && statusFilter !== 'hidden') {
				trends = source.filter((t) => !hiddenArticles.isFullyHidden(t.link));
			} else {
				trends = source;
			}
		}
	});

	// 레이아웃 준비 완료 처리
	$effect(() => {
		// displayTrends가 계산되고 trends에 데이터가 있을 때
		if (!isSearching && !isLayoutReady) {
			// DOM 업데이트 후 레이아웃 준비 완료
			tick().then(() => {
				isLayoutReady = true;
			});
		}
	});

	// 이메일 동기화
	$effect(() => {
		if (auth.user?.email) {
			email = auth.user.email;
		}
	});

	onMount(() => {
		innerWidth = window.innerWidth;
		window.addEventListener('resize', handleResize);

		// 콜백 설정
		hiddenArticles.onHide = handleHideCallback;
		hiddenArticles.onUnhide = handleUnhideCallback;
		bookmarks.onUnbookmark = handleUnbookmarkCallback;

		if (trends.length === 0) {
			fetchTrends(true);
		}

		return () => {
			window.removeEventListener('resize', handleResize);
			clearTimeout(resizeTimeout);
			abortController?.abort();
			hiddenArticles.onHide = null;
			hiddenArticles.onUnhide = null;
			bookmarks.onUnbookmark = null;
		};
	});

	// 버퍼에서 아이템 보충
	function replaceFromBuffer() {
		if (bufferTrends.length > 0) {
			const replacement = bufferTrends[0];
			bufferTrends = bufferTrends.slice(1);
			trends = [...trends, replacement];
		}

		if (bufferTrends.length <= 10 && hasMore && !isLoadingMore) {
			fetchBuffer();
		}
	}

	// 전체 목록에서 숨김 추가 시
	function handleHideCallback(hiddenLink: string) {
		if (statusFilter !== 'all') return;
		replaceFromBuffer();
	}

	// 숨김 필터에서 숨김 해제 시
	function handleUnhideCallback(unhiddenLink: string) {
		if (statusFilter !== 'hidden') return;
		replaceFromBuffer();
	}

	// 북마크 필터에서 북마크 해제 시
	function handleUnbookmarkCallback(unbookmarkedLink: string) {
		if (statusFilter !== 'bookmarked') return;
		replaceFromBuffer();
	}

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
	// Masonry 관련
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

	// displayTrends
	let displayTrends = $derived.by(() => {
		const hiddenList = hiddenArticles.list ?? [];
		const bookmarkList = bookmarks.list ?? [];
		const recentlyHiddenList = hiddenArticles.recentlyHidden;

		// 숨김 필터: 숨김된 것만
		if (statusFilter === 'hidden') {
			return trends.filter((t) => hiddenList.includes(t.link));
		}

		// 북마크 필터: 북마크된 것만
		if (statusFilter === 'bookmarked') {
			return trends.filter((t) => bookmarkList.includes(t.link));
		}

		// 전체 목록: 숨김 + 애니메이션 처리
		return trends.filter((t) => {
			const isHidden = hiddenList.includes(t.link);
			const isRecent = recentlyHiddenList.includes(t.link);
			return !isHidden || isRecent;
		});
	});

	// 컬럼 할당 캐시
	const columnAssignments = new Map<number, number>();

	let masonryColumns = $derived.by(() => {
		const cols = columnCount;
		const items = displayTrends;

		if (cols === 1) return [items];
		if (items.length === 0) return [[], []];

		const columns: Trend[][] = [[], []];
		const heights = [0, 0];

		const unassigned: Trend[] = [];

		for (const trend of items) {
			const colIndex = columnAssignments.get(trend.id);

			if (colIndex !== undefined) {
				columns[colIndex].push(trend);
				const isHidden = hiddenArticles.list.includes(trend.link);
				heights[colIndex] += isHidden ? 48 : estimateHeight(trend);
			} else {
				unassigned.push(trend);
			}
		}

		for (const trend of unassigned) {
			const colIndex = heights[0] <= heights[1] ? 0 : 1;
			columnAssignments.set(trend.id, colIndex);
			columns[colIndex].push(trend);

			const isHidden = hiddenArticles.list.includes(trend.link);
			heights[colIndex] += isHidden ? 48 : estimateHeight(trend);
		}

		return columns;
	});

	// =============================================
	// fetchTrends
	// =============================================
	async function fetchTrends(reset = false) {
		if (isLoadingMore && !reset) return;

		const currentController = new AbortController();

		abortController?.abort();
		abortController = currentController;

		if (reset) {
			isSearching = true;
			isLayoutReady = false; // 검색/필터 시 레이아웃 리셋
			page = 1;
			hasMore = true;
			trends = [];
			bufferTrends = [];
			columnAssignments.clear();
			hiddenArticles.recentlyHidden = [];
		} else {
			isLoadingMore = true;
			page += 1;
		}

		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: '40',
				searchKeyword: searchKeyword,
				tagFilter: selectedTags.join(',')
			});

			if (selectedCategories.length > 0) {
				params.append('category', selectedCategories.join(','));
			}

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

				const incoming =
					currentFilter === 'hidden'
						? result.data
						: result.data.filter(
								(t: Trend) => !hiddenArticles.isHidden(t.link)
							);

				if (reset) {
					trends = incoming.slice(0, 20);
					bufferTrends = incoming.slice(20);
				} else {
					const existingIds = new Set(trends.map((t) => t.id));
					const bufferIds = new Set(bufferTrends.map((t) => t.id));
					const newItems = incoming.filter(
						(t: Trend) => !existingIds.has(t.id) && !bufferIds.has(t.id)
					);

					trends = [...trends, ...bufferTrends, ...newItems.slice(0, 20)];
					bufferTrends = newItems.slice(20);
				}

				if (result.data.length === 0 || result.data.length < 40) {
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

			if (abortController === currentController) {
				abortController = null;
			}
		}
	}

	async function fetchBuffer() {
		if (isLoadingMore || !hasMore) return;

		isLoadingMore = true;
		const nextPage = page + 1;

		try {
			const params = new URLSearchParams({
				page: nextPage.toString(),
				limit: '10',
				searchKeyword: searchKeyword,
				tagFilter: selectedTags.join(',')
			});

			if (selectedCategories.length > 0) {
				params.append('category', selectedCategories.join(','));
			}

			if (auth.user?.id) {
				params.append('userId', auth.user.id);
			}
			params.append('statusFilter', statusFilter);

			const res = await fetch(`${API_URL}/api/trends?${params}`);

			if (!res.ok) return;

			const result = await res.json();

			if (result.success) {
				page = nextPage;

				const existingIds = new Set(trends.map((t) => t.id));
				const bufferIds = new Set(bufferTrends.map((t) => t.id));
				const newItems = result.data.filter(
					(t: Trend) =>
						!existingIds.has(t.id) &&
						!bufferIds.has(t.id) &&
						(statusFilter === 'hidden' || !hiddenArticles.isHidden(t.link))
				);
				bufferTrends = [...bufferTrends, ...newItems];

				if (result.data.length === 0 || result.data.length < 10) {
					hasMore = false;
				}
			}
		} catch (e) {
			console.error('버퍼 로드 오류:', e);
		} finally {
			isLoadingMore = false;
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

	function handleTagChange(newTags: string[]) {
		selectedTags = newTags;
		fetchTrends(true);
	}

	function handleCategorySelect(category: string) {
		if (selectedCategories.includes(category)) {
			selectedCategories = selectedCategories.filter((c) => c !== category);
		} else {
			selectedCategories = [...selectedCategories, category];
		}
		fetchTrends(true);
	}

	function handleStatusFilterChange(status: ArticleStatusFilter) {
		if (status !== 'all' && !auth.user) {
			auth.openLoginModal();
			return;
		}
		statusFilter = status;
		fetchTrends(true);
	}

	function handleModalTagChange(newTags: string[]) {
		selectedTags = newTags;
	}

	function handleModalCategoryChange(categories: string[]) {
		selectedCategories = categories;
	}

	function handleModalStatusFilterChange(status: ArticleStatusFilter) {
		if (status !== 'all' && !auth.user) {
			auth.openLoginModal();
			return;
		}
		statusFilter = status;
	}

	function openArticleModal(trend: Trend) {
		modal.open(ArticleModal, { trend });
	}

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

			{#if isSearching || !isLayoutReady}
				<div class="flex flex-col items-center justify-center py-32">
					<IconLoadingScan />
					<span class="text-base whitespace-pre-line text-gray-500"
						>로딩 중입니다...</span
					>
				</div>
			{:else if trends.length === 0}
				<div class="flex flex-col items-center py-32">
					<IconLoadingAlert />
					<span class="text-center text-base whitespace-pre-line text-gray-500"
						>{`결과가 없습니다.\n필터를 바꾸거나 새로고침해주세요`}</span
					>
				</div>
			{:else}
				<div class="relative">
					<div class={cn('grid grid-cols-1 items-start gap-6 sm:grid-cols-2')}>
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
							class={cn(
								'absolute inset-x-0 bottom-0',
								'z-50 h-150 pt-70',
								'from-bg-surface bg-linear-to-t from-50% to-transparent to-100%',
								'flex items-end justify-center pb-8',
								'flex flex-col items-center justify-center gap-2',
								'text-sm text-gray-400',
								'pointer-events-none'
							)}
						>
							{#if isLoadingMore}
								<DotLoading />
							{:else}
								<IconScroll />
								<span>스크롤하여 더 보기</span>
							{/if}
							<div
								use:infiniteScroll
								class="pointer-events-auto"
							></div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	<FloatingButtonArea onfilter={openFilterModal} />
</main>
