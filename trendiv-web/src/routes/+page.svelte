<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import type { Trend } from '$lib/types';

  export let data: PageData;

  // 뉴스 데이터 관리
  let trends: Trend[] = data.trends || [];
  let page = 1;
  let isLoadingMore = false;
  let hasMore = true;

  // 구독 관련 변수
  let email = '';
  let statusMessage = '';
  let isSuccess = false;
  let isSubmitting = false;

  // 구독 함수
  async function subscribe() {
    if (!email) return;
    isSubmitting = true;
    statusMessage = '등록 중...';
    try {
      const res = await fetch('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        isSuccess = true;
        statusMessage = '✅ 구독 완료!';
        email = '';
      } else {
        isSuccess = false;
        statusMessage = '⚠️ 이미 구독중이거나 오류가 발생했습니다.';
      }
    } catch {
      isSuccess = false;
      statusMessage = '❌ 서버 연결 실패';
    } finally {
      isSubmitting = false;
    }
  }

  // 무한 스크롤 함수
  async function loadMore() {
    if (isLoadingMore || !hasMore) return;
    isLoadingMore = true;
    page += 1;

    try {
      const res = await fetch(`http://localhost:3000/api/trends?page=${page}&limit=20`);
      const result = await res.json();

      if (result.success) {
        const newItems = result.data.filter((newTrend: Trend) => 
          !trends.some(existing => existing.id === newTrend.id)
        );
        
        if (newItems.length > 0) {
          trends = [...trends, ...newItems];
        }

        if (trends.length >= result.total) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    } catch (e) {
      console.error(e);
    } finally {
      isLoadingMore = false;
    }
  }

  // 스크롤 감지 액션
  function infiniteScroll(node: HTMLElement) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    });
    observer.observe(node);
    return { destroy() { observer.disconnect(); } };
  }
</script>

<div class="min-h-screen bg-slate-50">
  <section class="bg-slate-900 text-white py-20 px-4 text-center">
    <div class="max-w-2xl mx-auto">
      <span class="inline-block py-1 px-3 rounded-full bg-blue-600/20 text-blue-400 text-sm font-bold mb-6 border border-blue-500/30">Weekly Web Trends</span>
      <h1 class="text-4xl font-extrabold mb-6">Trendiv <span class="text-blue-500">Insights</span></h1>
      <p class="text-slate-400 text-lg mb-10">전 세계 기술 블로그를 AI가 매일 읽고 핵심만 골라드립니다.</p>
      
      <div class="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
        <input type="email" bind:value={email} placeholder="developer@example.com" class="px-5 py-3 rounded-xl text-slate-900 w-full" disabled={isSubmitting} />
        <button on:click={subscribe} disabled={isSubmitting} class="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold disabled:opacity-50">
          {isSubmitting ? '...' : '구독'}
        </button>
      </div>
      {#if statusMessage}
        <p class="mt-4 text-sm {isSuccess ? 'text-blue-400' : 'text-red-400'}">{statusMessage}</p>
      {/if}
    </div>
  </section>

  <section class="max-w-6xl mx-auto px-4 py-16">
    <h2 class="text-2xl font-bold text-slate-800 mb-10">최신 트렌드 (Total: {trends.length})</h2>
    
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each trends as trend (trend.id)}
        <article class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-slate-100 flex flex-col h-full">
          <div class="flex flex-wrap gap-2 mb-4">
            {#each trend.tags?.slice(0, 3) || [] as tag}
              <span class="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">#{tag}</span>
            {/each}
            <span class="ml-auto text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{trend.score}점</span>
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-3 hover:text-blue-600">
            <a href={trend.link} target="_blank" rel="noopener noreferrer">{trend.title}</a>
          </h3>
          <p class="text-slate-600 text-sm line-clamp-3 mb-4 flex-1">{trend.oneLineSummary || trend.summary}</p>
          <div class="pt-4 border-t border-slate-50 flex justify-between text-xs text-slate-400">
            <span>{new Date(trend.date).toLocaleDateString()}</span>
            <span class="font-medium">{trend.source}</span>
          </div>
        </article>
      {/each}
    </div>

    {#if hasMore}
      <div use:infiniteScroll class="py-12 flex justify-center">
        {#if isLoadingMore}
          <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
        {:else}
          <span class="text-slate-400 text-sm">스크롤하여 더 보기</span>
        {/if}
      </div>
    {/if}
  </section>
</div>