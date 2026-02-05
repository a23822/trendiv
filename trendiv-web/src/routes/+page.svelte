<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
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
	import { onMount, tick, untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	// =============================================
	// URL 파라미터에서 필터 상태 파싱
	// =============================================
	function getStatusFilterFromUrl(): ArticleStatusFilter {
		const value = $page.url.searchParams.get('status');
		if (value === 'bookmarked' || value === 'hidden') return value;
		return 'all';
	}

	function getCategoriesFromUrl(): string[] {
		const value = $page.url.searchParams.get('categories');
		return value ? value.split(',').filter(Boolean) : [];
	}

	function getTagsFromUrl(): string[] {
		const value = $page.url.searchParams.get('tags');
		return value ? value.split(',').filter(Boolean) : [];
	}

	function getSearchKeywordFromUrl(): string {
		return $page.url.searchParams.get('q') || '';
	}

	// =============================================
	// URL 파라미터 업데이트 함수
	// =============================================
	function updateUrlParams(params: {
		status?: ArticleStatusFilter;
		categories?: string[];
		tags?: string[];
		q?: string;
	}) {
		const url = new URL($page.url);

		// status
		if (params.status !== undefined) {
			if (params.status === 'all') {
				url.searchParams.delete('status');
			} else {
				url.searchParams.set('status', params.status);
			}
		}

		// categories
		if (params.categories !== undefined) {
			if (params.categories.length === 0) {
				url.searchParams.delete('categories');
			} else {
				url.searchParams.set('categories', params.categories.join(','));
			}
		}

		// tags
		if (params.tags !== undefined) {
			if (params.tags.length === 0) {
				url.searchParams.delete('tags');
			} else {
				url.searchParams.set('tags', params.tags.join(','));
			}
		}

		// search keyword
		if (params.q !== undefined) {
			if (params.q === '') {
				url.searchParams.delete('q');
			} else {
				url.searchParams.set('q', params.q);
			}
		}

		// URL 업데이트 (히스토리 대체, 스크롤 유지)
		goto(url.toString(), {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	// =============================================
	// 필터 상태 (URL 파라미터 기반)
	// =============================================
	let statusFilter = $derived(getStatusFilterFromUrl());
	let selectedCategories = $derived(getCategoriesFromUrl());
	let selectedTags = $derived(getTagsFromUrl());
	let searchKeyword = $derived(getSearchKeywordFromUrl());

	// 데이터 상태
	let trends = $state<Trend[]>(data.trends ?? []);
	let bufferTrends = $state<Trend[]>([]);
	let page_num = $state(1);
	let isLoadingMore = $state(false);
	let hasMore = $state(true);
	let isSearching = $state(false);

	// 레이아웃 준비 상태 (FOUC 방지)
	let isLayoutReady = $state(false);

	// 카테고리 필터
	let categoryList = $derived(data.categories ?? []);

	let abortController: AbortController | null = null;

	const API_URL = PUBLIC_API_URL || 'http://127.0.0.1:3000';
	let popularTags = $derived(data.popularTags ?? []);

	// 구독 관련
	let email = $state('');
	let isSubmitting = $state(false);

	// resize 디바운스
	let innerWidth = $state(0);
	let resizeTimeout: ReturnType<typeof setTimeout>;

	// 이전 URL 파라미터 추적 (변경 감지용)
	let prevUrlSearch: string | null = $state(null);

	const FETCH_LIMIT = 40;
	const VIEW_SIZE = 20;

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

	// URL 파라미터 변경 감지 및 데이터 재로드
	$effect(() => {
		const currentSearch = $page.url.search;

		// onMount 전에는 아무것도 하지 않음
		if (prevUrlSearch === null) {
			return;
		}

		// article 파라미터만 변경된 경우 무시 (모달 관련)
		const prevParams = new URLSearchParams(prevUrlSearch || '');
		const currParams = new URLSearchParams(currentSearch);
		prevParams.delete('article');
		currParams.delete('article');

		if (prevParams.toString() !== currParams.toString()) {
			prevUrlSearch = currentSearch;
			fetchTrends(true);
		} else {
			// article만 변경된 경우에도 prevUrlSearch 업데이트
			prevUrlSearch = currentSearch;
		}
	});

	// URL의 article 파라미터와 모달 상태 동기화 (뒤로 가기 대응)
	// ArticleModal인 경우에만 적용 (FilterModal 등 다른 모달은 영향 없음)
	$effect(() => {
		const articleId = $page.url.searchParams.get('article');

		if (!articleId && modal.component === ArticleModal) {
			modal.close();
		}
	});

	// 초기 데이터 필터링 (URL 필터가 없을 때만)
	$effect(() => {
		const source = data.trends;
		const ready = hiddenArticles.isReady;

		// URL 필터가 있으면 fetchTrends가 처리하므로 스킵
		const hasUrlFilters =
			statusFilter !== 'all' ||
			selectedCategories.length > 0 ||
			selectedTags.length > 0 ||
			searchKeyword !== '';

		if (hasUrlFilters) return;

		untrack(() => {
			if (source && page_num === 1 && !isLoadingMore) {
				if (ready) {
					// 이미 trends가 변경(버퍼 추가 등)된 상태라면 초기화하지 않도록 보호할 수도 있으나,
					// data.trends가 변경된 경우(페이지 이동)에는 갱신되어야 함.
					// 가장 확실한 건 '숨김 동작'으로 인한 재실행을 막는 것.
					trends = source.filter((t) => !hiddenArticles.isFullyHidden(t.link));
				} else {
					trends = source;
				}
			}
		});
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

		// URL 파라미터 초기화
		prevUrlSearch = $page.url.search;

		// URL에 필터가 있거나 초기 데이터가 없으면 fetch
		const hasUrlFilters =
			statusFilter !== 'all' ||
			selectedCategories.length > 0 ||
			selectedTags.length > 0 ||
			searchKeyword !== '';

		if (trends.length === 0 || hasUrlFilters) {
			fetchTrends(true);
		}

		// 탭이 다시 활성화될 때 URL 필터 확인 및 재적용
		function handleVisibilityChange() {
			if (document.visibilityState === 'visible') {
				const currentHasFilters =
					getStatusFilterFromUrl() !== 'all' ||
					getCategoriesFromUrl().length > 0 ||
					getTagsFromUrl().length > 0 ||
					getSearchKeywordFromUrl() !== '';

				// URL에 필터가 있는데 trends가 비어있거나 필터가 적용 안 된 경우
				if (currentHasFilters && (trends.length === 0 || !isSearching)) {
					// 현재 URL과 prevUrlSearch가 다르면 재로드
					const currentSearch = $page.url.search;
					if (currentSearch !== prevUrlSearch) {
						prevUrlSearch = currentSearch;
						fetchTrends(true);
					}
				}
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			window.removeEventListener('resize', handleResize);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
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
			page_num = 1;
			hasMore = true;
			trends = [];
			bufferTrends = [];
			columnAssignments.clear();
			hiddenArticles.recentlyHidden = [];
		} else {
			isLoadingMore = true;
			page_num += 1;
		}

		try {
			const params = new URLSearchParams({
				page: page_num.toString(),
				limit: FETCH_LIMIT.toString(),
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
				// 1. hasMore 판단: 40개를 요청했는데 40개가 꽉 차서 왔으면 "더 있다"
				// (필터링 하기 전의 원본 개수로 판단해야 정확합니다)
				hasMore = result.data.length === FETCH_LIMIT;

				// 2. 필터링 (숨김 처리 등)
				const incoming =
					statusFilter === 'hidden'
						? result.data
						: result.data.filter(
								(t: Trend) => !hiddenArticles.isHidden(t.link)
							);

				// 3. 중복 제거
				const currentIds = new Set(
					[...trends, ...bufferTrends].map((t) => t.id)
				);
				const newItems = incoming.filter((t: Trend) => !currentIds.has(t.id));

				if (reset) {
					// 첫 로딩: 20개는 화면, 나머지는 버퍼
					trends = newItems.slice(0, VIEW_SIZE);
					bufferTrends = newItems.slice(VIEW_SIZE);
				} else {
					// 추가 로딩: 일단 버퍼 뒤에 다 줄 세워둠
					bufferTrends = [...bufferTrends, ...newItems];
				}
			} else {
				console.error('데이터 로드 실패:', result.error);
			}
		} catch (e) {
			if (e instanceof Error && e.name === 'AbortError') {
				// AbortError도 상태 정리 필요
				isSearching = false;
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
		const nextPage = page_num + 1;

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
				page_num = nextPage;

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

	// =============================================
	// 이벤트 핸들러 (URL 파라미터 업데이트)
	// =============================================
	function handleSearch(keyword: string) {
		updateUrlParams({ q: keyword });
	}

	function handleClear() {
		if (searchKeyword === '') return;
		updateUrlParams({ q: '' });
	}

	function handleTagChange(newTags: string[]) {
		updateUrlParams({ tags: newTags });
	}

	function handleCategorySelect(category: string) {
		const newCategories = selectedCategories.includes(category)
			? selectedCategories.filter((c) => c !== category)
			: [...selectedCategories, category];
		updateUrlParams({ categories: newCategories });
	}

	function handleCategoryReset() {
		updateUrlParams({ categories: [] });
	}

	function handleStatusFilterChange(status: ArticleStatusFilter) {
		if (status !== 'all' && !auth.user) {
			auth.openLoginModal();
			return;
		}
		// 같은 필터를 다시 누르면 전체로 토글
		const newStatus = statusFilter === status ? 'all' : status;
		updateUrlParams({ status: newStatus });
	}

	function handleModalTagChange(newTags: string[]) {
		updateUrlParams({ tags: newTags });
	}

	function handleModalCategoryChange(categories: string[]) {
		updateUrlParams({ categories });
	}

	function handleModalStatusFilterChange(status: ArticleStatusFilter) {
		if (status !== 'all' && !auth.user) {
			auth.openLoginModal();
			return;
		}
		// 같은 필터를 다시 누르면 전체로 토글
		const newStatus = statusFilter === status ? 'all' : status;
		updateUrlParams({ status: newStatus });
	}

	// =============================================
	// 모달 관련 (History 연동)
	// =============================================
	async function openArticleModal(trend: Trend) {
		// URL 먼저 업데이트 (완료 대기)
		const url = new URL($page.url);
		url.searchParams.set('article', trend.id.toString());
		await goto(url.toString(), {
			replaceState: false, // push (뒤로 가기 가능하게)
			noScroll: true,
			keepFocus: true
		});

		// URL 업데이트 후 모달 열기
		modal.open(ArticleModal, {
			trend,
			onclose: closeArticleModal
		});
	}

	function closeArticleModal() {
		if (!modal.isOpen) return;

		// URL에서 article 파라미터 제거
		const url = new URL($page.url);
		if (url.searchParams.has('article')) {
			url.searchParams.delete('article');
			goto(url.toString(), {
				replaceState: true, // 히스토리 안 쌓음
				noScroll: true,
				keepFocus: true
			});
		}

		modal.close();
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

	let isSentinelVisible = $state(false);

	function infiniteScroll(node: HTMLElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				// 복잡한 로직 다 빼고 "보인다/안 보인다" 상태만 업데이트
				isSentinelVisible = entries[0].isIntersecting;
			},
			{
				// 바닥에 닿기 100px 전부터 미리 로딩 (스크롤 끊김 방지)
				rootMargin: '100px'
			}
		);

		observer.observe(node);

		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	$effect(() => {
		// 조건: 바닥이 보이고(isSentinelVisible) + 로딩 중이 아니고 + 검색 중이 아닐 때
		if (isSentinelVisible && !isLoadingMore && !isSearching) {
			// 1. 버퍼(창고)에 데이터가 있으면 -> 즉시 꺼내서 화면에 뿌림
			if (bufferTrends.length > 0) {
				const VIEW_SIZE = 20;
				const nextBatch = bufferTrends.slice(0, VIEW_SIZE);
				trends = [...trends, ...nextBatch];
				bufferTrends = bufferTrends.slice(VIEW_SIZE);

				// Pre-fetch
				if (bufferTrends.length < 10 && hasMore) {
					fetchTrends(false);
				}
			}
			// 2. 버퍼는 비었고 서버에 데이터가 있다면 -> 서버 요청
			else if (hasMore) {
				fetchTrends(false);
			}
		}
	});
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
				{searchKeyword}
				{selectedTags}
				tags={popularTags}
				{categoryList}
				selectedCategory={selectedCategories}
				{statusFilter}
				onselectCategory={handleCategorySelect}
				onresetCategory={handleCategoryReset}
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
			{:else if displayTrends.length === 0}
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
										{statusFilter}
									/>
								{/each}
							</div>
						{/each}
					</div>

					{#if hasMore || bufferTrends.length > 0}
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
								class="pointer-events-auto absolute inset-x-0 bottom-0 h-px"
							></div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	<FloatingButtonArea onfilter={openFilterModal} />
</main>
