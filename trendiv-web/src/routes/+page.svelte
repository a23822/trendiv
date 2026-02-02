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
	import IconScroll from '$lib/icons/icon_scroll.svelte';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { bookmarks } from '$lib/stores/bookmarks.svelte';
	import { hiddenArticles } from '$lib/stores/hiddenarticles.svelte';
	import { modal } from '$lib/stores/modal.svelte.js';
	import type { Trend, ArticleStatusFilter } from '$lib/types';
	import { cn } from '$lib/utils/ClassMerge';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	// 개인화 필터 상태
	let statusFilter = $state<ArticleStatusFilter>('all');

	let trends = $state<Trend[]>(data.trends ?? []);
	let bufferTrends = $state<Trend[]>([]);
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
		// 페이지 진입 시 이전 페이지의 잔여 상태(콜백, 애니메이션 등) 초기화
		hiddenArticles.resetView();
	});

	$effect(() => {
		const source = data.trends;
		const ready = hiddenArticles.isReady;

		if (source && page === 1 && !isLoadingMore) {
			if (ready && statusFilter !== 'hidden') {
				// [수정] isHidden 대신 isFullyHidden을 사용하여
				// 방금 숨긴 항목(recentlyHidden)은 리스트에서 즉시 제거되지 않도록 함
				trends = source.filter((t) => !hiddenArticles.isFullyHidden(t.link));
			} else {
				trends = source;
			}
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

		hiddenArticles.onHide = handleHideCallback;

		if (trends.length === 0) {
			fetchTrends(true);
		}

		return () => {
			window.removeEventListener('resize', handleResize);
			clearTimeout(resizeTimeout);
			abortController?.abort();
			hiddenArticles.onHide = null;
		};
	});

	// 숨김 처리 시 호출되는 콜백
	function handleHideCallback(hiddenLink: string) {
		if (statusFilter === 'hidden') return;

		if (bufferTrends.length > 0) {
			const replacement = bufferTrends[0];
			bufferTrends = bufferTrends.slice(1);
			trends = [...trends, replacement];
		}

		// 버퍼가 10개 이하면 충전
		if (bufferTrends.length <= 10 && hasMore && !isLoadingMore) {
			fetchBuffer();
		}
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

	// [단순화] displayTrends - recentlyHidden 체크 제거
	// ArticleCard에서 애니메이션을 자체 처리하므로, 여기서는 숨김 상태만 확인
	let displayTrends = $derived.by(() => {
		const hiddenList = hiddenArticles.list ?? [];
		const bookmarkList = bookmarks.list ?? [];
		// recentlyHidden을 참조하여 반응성 유지 (카드가 리스트에 남아있어야 애니메이션 가능)
		const recentlyHiddenList = hiddenArticles.recentlyHidden;

		// 디버그 로그
		console.log(
			'[displayTrends] hiddenList:',
			hiddenList.length,
			'recentlyHidden:',
			recentlyHiddenList
		);

		if (statusFilter === 'hidden') {
			return trends.filter((t) => hiddenList.includes(t.link));
		}

		if (statusFilter === 'bookmarked') {
			return trends.filter((t) => bookmarkList.includes(t.link));
		}

		// [핵심] 숨김 상태이지만 recentlyHidden에 있으면 애니메이션을 위해 유지
		return trends.filter((t) => {
			const isHidden = hiddenList.includes(t.link);
			const isRecent = recentlyHiddenList.includes(t.link);

			// 디버그: 숨김 처리되는 아이템 로그
			if (isHidden) {
				console.log(
					'[displayTrends] hidden item:',
					t.link,
					'isRecent:',
					isRecent,
					'keep:',
					!isHidden || isRecent
				);
			}

			// 완전히 숨겨진 상태(isHidden && !isRecent)만 필터링
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

		// 1단계: 기존 할당된 아이템 먼저 배치
		const unassigned: Trend[] = [];

		for (const trend of items) {
			const colIndex = columnAssignments.get(trend.id);

			if (colIndex !== undefined) {
				columns[colIndex].push(trend);
				// 숨김 상태인 아이템은 접힌 높이(48px)로 계산
				const isHidden = hiddenArticles.list.includes(trend.link);
				heights[colIndex] += isHidden ? 48 : estimateHeight(trend);
			} else {
				unassigned.push(trend);
			}
		}

		// 2단계: 새 아이템만 현재 높이 기준으로 배치
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
			page = 1;
			hasMore = true;
			trends = [];
			bufferTrends = [];
			columnAssignments.clear();
			// recentlyHidden 초기화
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
					// 처음: 20개 표시 + 20개 버퍼
					trends = incoming.slice(0, 20);
					bufferTrends = incoming.slice(20);
				} else {
					// 추가 로딩: 버퍼 전체 + 새 데이터 20개를 trends에, 나머지 20개는 버퍼
					const existingIds = new Set(trends.map((t) => t.id));
					const bufferIds = new Set(bufferTrends.map((t) => t.id));
					const newItems = incoming.filter(
						(t: Trend) => !existingIds.has(t.id) && !bufferIds.has(t.id)
					);

					// 버퍼 전체 + 새 아이템 20개를 trends에 추가
					trends = [...trends, ...bufferTrends, ...newItems.slice(0, 20)];
					// 새 아이템 나머지는 버퍼로
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

	// 버퍼만 채우는 로드
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
						!hiddenArticles.isHidden(t.link)
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
		modal.open(ArticleModal, {
			trend: trend
		});
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
								'absolute inset-x-0 bottom-0 z-50',
								'h-150 pt-70',
								'from-bg-surface bg-linear-to-t from-50% to-transparent to-100%',
								'flex items-end justify-center pb-8',
								'flex flex-col items-center justify-center gap-2',
								'text-sm text-gray-400'
							)}
						>
							{#if isLoadingMore}
								<DotLoading
									size="sm"
									withBackground={false}
								/>
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
