<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import type { PageData } from './$types';
  import type { Trend } from '$lib/types';
  import { PUBLIC_API_URL } from '$env/static/public';
  export let data: PageData;

  // 뉴스 데이터 상태
  let trends: Trend[] = data.trends || [];
  let page = 1;
  let isLoadingMore = false;
  let hasMore = true;

  // 🔍 검색 & 필터 상태
  let searchKeyword = "";
  let selectedTag = "";
  let isSearching = false;

  // 🖼️ 상세 모달 상태
  let selectedTrend: Trend | null = null;

  // 추천 태그 목록
  const popularTags = ["CSS", "HTML", "React", "Accessibility", "iOS", "Performance"];

  // 구독 관련 상태
  let email = '';
  let subStatus = '';
  let isSubmitting = false;

  const API_URL = PUBLIC_API_URL || 'http://localhost:3000';

  // ✅ [추가] SSR 실패 시 클라이언트에서 재시도 (심폐소생술)
  onMount(() => {
    if (trends.length === 0) {
      console.log("⚠️ 초기 데이터 없음. 클라이언트에서 다시 불러옵니다...");
      fetchTrends(true);
    }
  });

  // --- [데이터 로드 로직] ---
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
      const result = await res.json();

      if (result.success) {
        if (reset) {
          trends = result.data;
        } else {
          // 중복 제거 후 추가
          const newItems = result.data.filter((newTrend: Trend) => 
            !trends.some(existing => existing.id === newTrend.id)
          );
          trends = [...trends, ...newItems];
        }
        if (trends.length >= result.total) hasMore = false;
      }
    } catch (e) {
      console.error(e);
    } finally {
      isLoadingMore = false;
      isSearching = false;
    }
  }

  // 검색 & 태그 핸들러
  function handleSearch() { selectedTag = ""; fetchTrends(true); }
  function handleTagClick(tag: string) {
    selectedTag = selectedTag === tag ? "" : tag;
    searchKeyword = "";
    fetchTrends(true);
  }

  // 모달 핸들러
  function openModal(trend: Trend) {
    selectedTrend = trend;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    selectedTrend = null;
    document.body.style.overflow = '';
  }

  // 무한 스크롤
  function infiniteScroll(node: HTMLElement) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isSearching) fetchTrends(false);
    });
    observer.observe(node);
    return { destroy() { observer.disconnect(); } };
  }

  // 구독 로직
  async function subscribe() {
    if (!email) return;
    isSubmitting = true;
    subStatus = '등록 중...';
    try {
      const res = await fetch(`${API_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        subStatus = '✅ 구독 완료!';
        email = '';
      } else {
        subStatus = '⚠️ 오류가 발생했습니다.';
      }
    } catch {
      subStatus = '❌ 서버 연결 실패';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="min-h-screen bg-slate-50 font-sans">
  
  <header class="bg-slate-900 text-white py-16 px-4 text-center">
    <div class="max-w-3xl mx-auto">
      <div class="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-wider text-blue-400 uppercase bg-blue-900/30 rounded-full border border-blue-800">
        Weekly Dev Insights
      </div>
      <h1 class="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
        Trendiv <span class="text-blue-500">Insights</span>
      </h1>
      <p class="text-slate-400 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
        전 세계 기술 블로그를 AI가 분석하여<br class="hidden sm:block" />
        프론트엔드 개발자에게 꼭 필요한 정보만 제공합니다.
      </p>

      <div class="flex flex-col sm:flex-row gap-2 justify-center max-w-md mx-auto relative">
        <input type="email" bind:value={email} placeholder="이메일 주소 입력" class="px-5 py-3 rounded-xl text-slate-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isSubmitting} on:keydown={(e) => e.key === 'Enter' && subscribe()} />
        <button on:click={subscribe} disabled={isSubmitting} class="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold whitespace-nowrap disabled:opacity-70">
          {isSubmitting ? '...' : '무료 구독'}
        </button>
      </div>
      {#if subStatus} <p class="mt-3 text-sm {subStatus.includes('✅') ? 'text-green-400' : 'text-red-400'}">{subStatus}</p> {/if}
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 py-12">
    
    <div class="mb-12 space-y-6">
      <div class="relative max-w-xl mx-auto">
        <input type="text" bind:value={searchKeyword} placeholder="관심 키워드 검색 (예: CSS, Grid...)" on:keydown={(e) => e.key === 'Enter' && handleSearch()} class="w-full px-6 py-4 pl-12 rounded-full border border-slate-200 shadow-sm text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">🔍</span>
      </div>
      <div class="flex flex-wrap justify-center gap-2">
        {#each popularTags as tag}
          <button class="px-4 py-2 rounded-full text-sm font-semibold border transition-all {selectedTag === tag ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'}" on:click={() => handleTagClick(tag)}>#{tag}</button>
        {/each}
      </div>
    </div>

    {#if isSearching}
      <div class="py-20 text-center"><div class="inline-block w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div><p class="mt-4 text-slate-500">탐색 중...</p></div>
    {:else if trends.length === 0}
      <div class="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
        <div class="text-6xl mb-4 opacity-80">🤔</div>
        <h3 class="text-xl font-bold text-slate-800">결과가 없습니다.</h3>
        <button class="mt-6 text-blue-600 font-bold hover:underline" on:click={() => { searchKeyword = ""; selectedTag = ""; fetchTrends(true); }}>전체 목록 보기</button>
      </div>
    {:else}
      <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {#each trends as trend (trend.id)}
          <article 
            class="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col h-full overflow-hidden hover:-translate-y-1 relative"
          >
            <div class="p-6 pb-0 flex justify-between items-start">
              <div class="flex flex-wrap gap-2">
                {#each trend.tags?.slice(0, 3) || [] as tag}
                  <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold group-hover:bg-blue-50 group-hover:text-blue-600">#{tag}</span>
                {/each}
              </div>
              <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">SCORE {trend.score}</span>
            </div>
            <div class="p-6 flex-1 flex flex-col">
              <h2 class="text-xl font-bold text-slate-900 mb-3 leading-snug group-hover:text-blue-600 transition-colors">
                <button 
                  class="text-left w-full focus:outline-none after:absolute after:inset-0"
                  on:click={() => openModal(trend)}
                >
                  {trend.title}
                </button>
              </h2>
              <div class="mb-4 text-sm text-slate-700 font-medium bg-slate-50 p-3 rounded-lg border-l-4 border-blue-400">
                "{trend.oneLineSummary || trend.summary.slice(0, 60)}..."
              </div>
              <p class="text-slate-500 text-sm line-clamp-3 leading-relaxed">{trend.summary}</p>
            </div>
            <div class="px-6 py-4 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400 bg-slate-50/50">
              <span>📅 {new Date(trend.date).toLocaleDateString()}</span>
              <span class="font-bold text-slate-300 group-hover:text-slate-500">{trend.source}</span>
            </div>
          </article>
        {/each}
      </div>
      {#if hasMore}
        <div use:infiniteScroll class="py-16 flex justify-center">
          {#if isLoadingMore} <div class="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          {:else} <span class="text-slate-400 text-sm cursor-pointer hover:text-blue-500">스크롤하여 더 보기 ↓</span> {/if}
        </div>
      {:else}
        <div class="py-16 text-center text-slate-400 text-sm border-t border-slate-100 mt-12">모든 트렌드를 확인했습니다. 🎉</div>
      {/if}
    {/if}
  </main>

  {#if selectedTrend}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" transition:fade={{ duration: 200 }}>
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" on:click={closeModal}></div>
      <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" transition:fly={{ y: 20, duration: 300 }}>
        <button on:click={closeModal} class="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-white/80 rounded-full hover:bg-slate-100 transition-colors z-10">✕</button>
        <div class="p-8 pb-4">
          <div class="flex items-center gap-2 mb-4">
            <span class="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">AI Score {selectedTrend.score}</span>
            <span class="text-sm text-slate-500">{selectedTrend.source}</span>
          </div>
          <h2 class="text-2xl md:text-3xl font-bold text-slate-900 leading-tight mb-4">
            <a href={selectedTrend.link} target="_blank" rel="noopener noreferrer" class="hover:text-blue-600 hover:underline">{selectedTrend.title} ↗</a>
          </h2>
          {#if selectedTrend.reason}
            <div class="bg-blue-50 border border-blue-100 text-blue-800 px-4 py-3 rounded-xl text-sm font-medium">🤖 <strong>AI 선정 이유:</strong> {selectedTrend.reason}</div>
          {/if}
        </div>
        <div class="px-8 pb-8 space-y-6">
          {#if selectedTrend.keyPoints && selectedTrend.keyPoints.length > 0}
            <div>
              <h3 class="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">⚡ 핵심 요약</h3>
              <ul class="space-y-3">
                {#each selectedTrend.keyPoints as point}
                  <li class="flex items-start gap-3 text-slate-700 bg-slate-50 p-3 rounded-lg"><span class="text-blue-500 mt-1">✓</span><span class="text-sm leading-relaxed">{point}</span></li>
                {/each}
              </ul>
            </div>
          {/if}
          <div><h3 class="text-lg font-bold text-slate-800 mb-2">상세 내용</h3><p class="text-slate-600 leading-relaxed text-sm whitespace-pre-line">{selectedTrend.summary}</p></div>
          <div class="pt-6 border-t border-slate-100 flex justify-end">
            <a href={selectedTrend.link} target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors">원문 읽으러 가기 →</a>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>