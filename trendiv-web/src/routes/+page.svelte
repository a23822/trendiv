<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import ArticleCard from '$lib/components/contents/ArticleCard.svelte';
	import HeroSection from '$lib/components/contents/HeroSection.svelte';
	import SearchCard from '$lib/components/contents/SearchCard.svelte';
	import Header from '$lib/components/layout/Header/Header.svelte';
	import ArticleModal from '$lib/components/modal/ArticleModal.svelte';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { supabase } from '$lib/stores/db';
	import { modal } from '$lib/stores/modal.svelte.js';
	import type { Trend } from '$lib/types';
	import type { PageData } from './$types';
	import { type Subscription } from '@supabase/supabase-js';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();
	let trends = $state<Trend[]>([]);
	let page = $state(1);
	let isLoadingMore = $state(false);
	let hasMore = $state(true);
	let searchKeyword = $state('');
	let selectedTags = $state<string[]>([]);
	let isSearching = $state(false);

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

	$effect(() => {
		if (auth.user?.email) {
			email = auth.user.email;
		}
	});

	$effect(() => {
		if (data.trends) {
			trends = data.trends;
		}
	});

	onMount(() => {
		if (trends.length === 0) {
			fetchTrends(true);
		}
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
		if (reset) isSearching = true;
		else isLoadingMore = true;

		if (reset) {
			page = 1;
			trends = [];
			hasMore = true;
		} else {
			page += 1;
		}

		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: '20',
				searchKeyword: searchKeyword,
				tagFilter: selectedTags.join(',')
			});
			const res = await fetch(`${API_URL}/api/trends?${params}`);

			if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

			const result = await res.json();

			if (result.success) {
				if (reset) trends = result.data;
				else {
					const newItems = result.data.filter(
						(newTrend: Trend) => !trends.some((ex) => ex.id === newTrend.id)
					);
					trends = [...trends, ...newItems];
				}
				if (trends.length >= result.total) hasMore = false;
			} else {
				console.error('데이터 로드 실패:', result.error);
				hasMore = false;
			}
		} catch (e) {
			console.error('API 호출 중 오류 발생:', e);
			hasMore = false;
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
			if (entries[0].isIntersecting && hasMore && !isSearching)
				fetchTrends(false);
		});

		observer.observe(node);

		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	// ArticleCard masonry 배열
	let innerWidth = $state(0);

	const masonryColumns = $derived.by(() => {
		if (innerWidth < 640) {
			return [trends];
		} else {
			const cols: Trend[][] = [[], []];
			trends.forEach((trend, i) => {
				cols[i % 2].push(trend);
			});
			return cols;
		}
	});
</script>

<svelte:window bind:innerWidth />

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
