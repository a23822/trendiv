<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import HeroSection from '$lib/components/contents/HeroSection.svelte';
	import SearchCard from '$lib/components/contents/SearchCard.svelte';
	import Header from '$lib/components/layout/Header/Header.svelte';
	import { user } from '$lib/stores/auth';
	import { supabase } from '$lib/stores/db';
	import type { Trend } from '$lib/types';
	import type { PageData } from './$types';
	import { type Subscription } from '@supabase/supabase-js';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	export let data: PageData;

	let trends: Trend[] = data.trends || [];
	let page = 1;
	let isLoadingMore = false;
	let hasMore = true;
	let searchKeyword = '';
	let selectedTag = '';
	let isSearching = false;
	let selectedTrend: Trend | null = null;

	const API_URL = PUBLIC_API_URL || 'http://127.0.0.1:3000';
	const popularTags = [
		'CSS',
		'HTML',
		'React',
		'Accessibility',
		'iOS',
		'Performance'
	];

	// 구독 관련 to HeroSection
	let email = '';
	let isSubmitting = false;
	let subStatus = '';

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
		subStatus = '처리 중...';

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

	// --- 데이터 로드 로직 ---
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
				tagFilter: selectedTag
			});
			const res = await fetch(`${API_URL}/api/trends?${params}`);

			// 응답이 200 OK가 아닐 경우 (500 에러 등)
			if (!res.ok) {
				throw new Error(`HTTP Error: ${res.status}`);
			}

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
				// ❌ [추가됨] 서버에서 success: false를 보낸 경우 (에러 메시지 등)
				console.error('데이터 로드 실패:', result.error);
				hasMore = false; // 더 이상 시도하지 않음 (무한 스크롤 방지)
			}
		} catch (e) {
			console.error('API 호출 중 오류 발생:', e);
			hasMore = false;
		} finally {
			isLoadingMore = false;
			isSearching = false;
		}
	}

	function handleSearch() {
		fetchTrends(true);
	}

	function handleTagClick(tag: string) {
		selectedTag = selectedTag === tag ? '' : tag;
		fetchTrends(true);
	}

	function openModal(trend: Trend) {
		selectedTrend = trend;
		document.body.style.overflow = 'hidden';
	}

	function closeModal() {
		selectedTrend = null;
		document.body.style.overflow = '';
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
	<div class="bg-bg-surface">
		<div class="mx-auto max-w-5xl p-4 sm:p-6">
			<!-- <div class="relative mb-12 space-y-6">
				<div class="group mx-auto max-w-lg">
					<input
						type="text"
						bind:value={searchKeyword}
						placeholder="검색어를 입력해주세요."
						on:keydown={(e) => e.key === 'Enter' && handleSearch()}
						class="w-full rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 pl-12 text-gray-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
					/>
					<span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
						>🔍</span
					>
				</div>

				<div class="flex flex-wrap justify-center gap-2">
					{#each popularTags as tag}
						<button
							class="rounded-full border px-4 py-1.5 text-sm font-medium transition-all
            {selectedTag === tag
								? 'border-gray-900 bg-gray-900 text-white'
								: 'border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-900'}"
							on:click={() => handleTagClick(tag)}
						>
							{tag}
						</button>
					{/each}
				</div>
			</div> -->
			<SearchCard />

			{#if isSearching}
				<div class="py-32 text-center text-gray-400">로딩 중...</div>
			{:else if trends.length === 0}
				<div class="py-32 text-center text-gray-400">결과가 없습니다.</div>
			{:else}
				<div class="grid gap-6">
					{#each trends as trend (trend.id)}
						<div
							class="group relative cursor-pointer rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-400 hover:shadow-sm"
							on:click={() => openModal(trend)}
							on:keydown={(e) => e.key === 'Enter' && openModal(trend)}
							tabindex="0"
							role="button"
						>
							<div class="mb-3 flex items-center justify-between">
								<div class="flex gap-2">
									{#each trend.tags?.slice(0, 2) || [] as tag}
										<span
											class="rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
										>
											{tag}
										</span>
									{/each}
								</div>
								<span class="font-mono text-xs text-gray-400"
									>{new Date(trend.date).toLocaleDateString()}</span
								>
							</div>

							<h2
								class="mb-2 text-xl font-bold leading-snug text-gray-900 transition-colors group-hover:text-blue-600"
							>
								{trend.title}
							</h2>

							<p
								class="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-500"
							>
								{trend.oneLineSummary || trend.summary}
							</p>

							<div
								class="flex items-center justify-between border-t border-gray-100 pt-4"
							>
								<span
									class="text-xs font-bold uppercase tracking-wide text-gray-400"
									>{trend.source}</span
								>
								<span
									class="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-900"
									>AI Score {trend.score}</span
								>
							</div>
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

		{#if selectedTrend}
			<div
				class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
				on:click={closeModal}
				transition:fade={{ duration: 200 }}
			>
				<div
					class="max-h-[90vh] w-full max-w-2xl overflow-hidden overflow-y-auto rounded-2xl bg-white shadow-2xl"
					transition:fly={{ y: 20 }}
				>
					<div class="p-8">
						<div class="mb-6 flex items-start justify-between">
							<div class="flex gap-2">
								<span
									class="rounded-full bg-black px-3 py-1 text-xs font-bold text-white"
									>Score {selectedTrend.score}</span
								>
							</div>
							<button
								on:click={closeModal}
								class="text-gray-400 hover:text-black">✕</button
							>
						</div>

						<h2 class="mb-6 text-2xl font-bold leading-tight text-gray-900">
							{selectedTrend.title}
						</h2>

						{#if selectedTrend.keyPoints?.length}
							<div
								class="mb-8 rounded-xl border border-gray-100 bg-gray-50 p-6"
							>
								<h3
									class="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900"
								>
									Key Takeaways
								</h3>
								<ul class="space-y-3">
									{#each selectedTrend.keyPoints as point}
										<li class="flex gap-3 text-sm text-gray-700">
											<span class="font-bold text-black">•</span>
											{point}
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						<div class="prose prose-sm max-w-none text-gray-600">
							<p class="whitespace-pre-line">{selectedTrend.summary}</p>
						</div>

						<div class="mt-8 flex justify-end border-t border-gray-100 pt-6">
							<a
								href={selectedTrend.link}
								target="_blank"
								class="rounded-lg bg-black px-6 py-3 font-bold text-white transition-colors hover:bg-gray-800"
								>원문 보기 →</a
							>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</main>
