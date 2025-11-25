<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import type { Trend } from '$lib/types';

  export let data: PageData;

  // 클라이언트에서 관리할 트렌드 목록
  let trends: Trend[] = data.trends;
  let page = 1;
  let loading = false;
  let hasMore = true;

  async function loadMore() {
    if (loading || !hasMore) return;
    
    loading = true;
    page += 1;

    try {
      const res = await fetch(`http://localhost:3000/api/trends?page=${page}&limit=20`);
      const result = await res.json();

      if (result.success && result.data.length > 0) {
        const newItems = result.data.filter((newTrend: Trend) => 
          !trends.some(existing => existing.id === newTrend.id)
        );

        if (newItems.length > 0) {
          trends = [...trends, ...newItems];
        } else {
          // hasMore = false;
        }
      } else {
        hasMore = false;
      }
    } catch (e) {
      console.error("추가 로드 실패:", e);
    } finally {
      loading = false;
    }
  }

  function infiniteScroll(node: HTMLElement) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore();
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

<div class="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-6xl mx-auto">
    <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {#each trends as trend (trend.id)}
         <article class="group bg-white rounded-2xl shadow-sm ...">
           </article>
      {/each}
    </div>

    {#if hasMore}
      <div use:infiniteScroll class="h-20 flex justify-center items-center mt-8">
        {#if loading}
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        {:else}
          <span class="text-slate-400 text-sm">스크롤해서 더 보기</span>
        {/if}
      </div>
    {:else}
      <div class="text-center py-10 text-slate-400">
        모든 트렌드를 확인했습니다! 🎉
      </div>
    {/if}

  </div>
</div>