<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import ArticleCard from '$lib/components/contents/ArticleCard.svelte';
	import HeroSection from '$lib/components/contents/HeroSection.svelte';
	import SearchCard from '$lib/components/contents/SearchCard.svelte';
	import Header from '$lib/components/layout/Header/Header.svelte';
	import ArticleModal from '$lib/components/modal/ArticleModal.svelte';
	import { user } from '$lib/stores/auth';
	import { supabase } from '$lib/stores/db';
	import type { Trend } from '$lib/types';
	import type { PageData } from './$types';
	import { type Subscription } from '@supabase/supabase-js';
	import { onMount } from 'svelte';

	export let data: PageData;

	let trends: Trend[] = data.trends || [];
	let page = 1;
	let isLoadingMore = false;
	let hasMore = true;
	let searchKeyword = '';
	let selectedTags: string[] = [];
	let isSearching = false;

	let selectedTrend: Trend | null = null;
	let isModalOpen = false;

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
	let email = '';
	let isSubmitting = false;

	onMount(() => {
		const init = async () => {
			if (!supabase) return;

			const {
				data: { session }
			} = await supabase.auth.getSession();
			user.set(session?.user ?? null);

			if (trends.length === 0) {
				fetchTrends(true);
			}
		};

		init();

		let subscription: Subscription | null = null;

		if (supabase) {
			const { data } = supabase.auth.onAuthStateChange((_event, session) => {
				user.set(session?.user ?? null);
				if ($user) {
					email = $user.email || '';
				}
			});
			subscription = data.subscription;
		}

		return () => {
			if (subscription) {
				subscription.unsubscribe();
			}
		};
	});

	async function handleSubscribe() {
		const targetEmail = $user?.email || email;
		if (!targetEmail) return;

		isSubmitting = true;

		try {
			const res = await fetch(`${API_URL}/api/subscribe`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: targetEmail })
			});

			if (res.ok) {
				alert($user ? '✅ 구독 완료!' : '✅ 메일함을 확인해주세요.');
				if (!$user) email = '';
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
		selectedTrend = trend;
		isModalOpen = true;
	}

	// ✨ [추가] 북마크 핸들러 (기능 구현 전이면 로그만)
	function handleBookmark(trend: Trend) {
		console.log('Bookmark toggled:', trend.id);
		// 추후 Supabase 북마크 저장 로직 연결
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
</script>

<Header
	{user}
	{supabase}
/>

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
				<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
					{#each trends as trend (trend.id)}
						<ArticleCard
							{trend}
							onclick={() => openModal(trend)}
							onbookmark={handleBookmark}
						/>
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

		<ArticleModal
			trend={selectedTrend}
			bind:isOpen={isModalOpen}
			onbookmark={handleBookmark}
		/>
	</div>
</main>
