<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { createClient } from '@supabase/supabase-js';
  import type { PageData } from './$types';
  import type { Trend } from '$lib/types';
  import { PUBLIC_API_URL, PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  
  // ✅ 방금 만든 헤더 불러오기 (경로 주목!)
  import Header from '$lib/components/layout/Header/Header.svelte';

  export let data: PageData;

  // Supabase 초기화 (프론트엔드용)
  const supabase = (PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY) 
    ? createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY) 
    : null;

  let user: any = null;
  let trends: Trend[] = data.trends || [];
  let page = 1;
  let isLoadingMore = false;
  let hasMore = true;
  let searchKeyword = "";
  let selectedTag = "";
  let isSearching = false;
  let selectedTrend: Trend | null = null;
  
  const API_URL = PUBLIC_API_URL || 'http://127.0.0.1:3000';
  const popularTags = ["CSS", "HTML", "React", "Accessibility", "iOS", "Performance"];

  onMount(() => {
    const initSession = async () => {
      if (!supabase) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user ?? null;
      
      if (trends.length === 0) fetchTrends(true);
    };
    
    initSession();

    if (!supabase) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
    });

    return () => subscription.unsubscribe();
  });

  // --- 데이터 로드 로직 ---
  async function fetchTrends(reset = false) {
    if (isLoadingMore && !reset) return;
    if (reset) isSearching = true;
    else isLoadingMore = true;

    if (reset) { page = 1; trends = []; hasMore = true; } 
    else { page += 1; }

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
        if (reset) trends = result.data;
        else {
          const newItems = result.data.filter((newTrend: Trend) => !trends.some(ex => ex.id === newTrend.id));
          trends = [...trends, ...newItems];
        }
        if (trends.length >= result.total) hasMore = false;
      }
    } catch (e) { console.error(e); } 
    finally { isLoadingMore = false; isSearching = false; }
  }

  function handleSearch() { selectedTag = ""; fetchTrends(true); }
  function handleTagClick(tag: string) {
    selectedTag = selectedTag === tag ? "" : tag;
    searchKeyword = "";
    fetchTrends(true);
  }
  function openModal(trend: Trend) { selectedTrend = trend; document.body.style.overflow = 'hidden'; }
  function closeModal() { selectedTrend = null; document.body.style.overflow = ''; }
  
  function infiniteScroll(node: HTMLElement) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isSearching) fetchTrends(false);
    });
    observer.observe(node);
    return { destroy() { observer.disconnect(); } };
  }
</script>

<Header {user} {supabase} />

<div class="min-h-screen bg-white font-sans text-gray-900">
  
  <section class="py-16 px-4 text-center border-b border-gray-100 bg-gray-50/50">
    <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-gray-900">
      Weekly <span class="text-gray-400">Developer</span> Trends
    </h1>
    <p class="text-gray-500 max-w-lg mx-auto">
      AI가 엄선한 개발 인사이트. 광고 없이 핵심만 봅니다.
    </p>
  </section>

  <main class="max-w-5xl mx-auto px-4 py-12">
    
    <div class="mb-12 space-y-6">
      <div class="relative max-w-lg mx-auto group">
        <input 
          type="text" 
          bind:value={searchKeyword}
          placeholder="검색어 입력..." 
          on:keydown={(e) => e.key === 'Enter' && handleSearch()}
          class="w-full px-5 py-3 pl-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
        />
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
      </div>

      <div class="flex flex-wrap justify-center gap-2">
        {#each popularTags as tag}
          <button 
            class="px-4 py-1.5 rounded-full text-sm font-medium transition-all border
            {selectedTag === tag 
              ? 'bg-gray-900 text-white border-gray-900' 
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-900'}"
            on:click={() => handleTagClick(tag)}
          >
            {tag}
          </button>
        {/each}
      </div>
    </div>

    {#if isSearching}
      <div class="py-32 text-center text-gray-400">로딩 중...</div>
    {:else if trends.length === 0}
      <div class="py-32 text-center text-gray-400">결과가 없습니다.</div>
    {:else}
      <div class="grid gap-6">
        {#each trends as trend (trend.id)}
          <article 
            class="group relative bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-400 hover:shadow-sm transition-all cursor-pointer"
            on:click={() => openModal(trend)}
            on:keydown={(e) => e.key === 'Enter' && openModal(trend)}
            tabindex="0"
            role="button"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex gap-2">
                {#each trend.tags?.slice(0, 2) || [] as tag}
                  <span class="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
                    {tag}
                  </span>
                {/each}
              </div>
              <span class="text-xs font-mono text-gray-400">{new Date(trend.date).toLocaleDateString()}</span>
            </div>

            <h2 class="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors leading-snug">
              {trend.title}
            </h2>

            <p class="text-gray-500 text-sm line-clamp-2 leading-relaxed mb-4">
              {trend.oneLineSummary || trend.summary}
            </p>

            <div class="flex items-center justify-between pt-4 border-t border-gray-100">
              <span class="text-xs font-bold text-gray-400 uppercase tracking-wide">{trend.source}</span>
              <span class="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">AI Score {trend.score}</span>
            </div>
          </article>
        {/each}
      </div>

      {#if hasMore}
        <div use:infiniteScroll class="py-16 flex justify-center text-gray-400 text-sm">
          {#if isLoadingMore} 로딩 중... {:else} 스크롤하여 더 보기 {/if}
        </div>
      {/if}
    {/if}
  </main>

  {#if selectedTrend}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" on:click={closeModal} transition:fade={{ duration: 200 }}>
      <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" transition:fly={{ y: 20 }}>
        <div class="p-8">
          <div class="flex justify-between items-start mb-6">
             <div class="flex gap-2">
                <span class="px-3 py-1 bg-black text-white text-xs font-bold rounded-full">Score {selectedTrend.score}</span>
             </div>
             <button on:click={closeModal} class="text-gray-400 hover:text-black">✕</button>
          </div>
          
          <h2 class="text-2xl font-bold text-gray-900 mb-6 leading-tight">{selectedTrend.title}</h2>

          {#if selectedTrend.keyPoints?.length}
            <div class="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Key Takeaways</h3>
              <ul class="space-y-3">
                {#each selectedTrend.keyPoints as point}
                  <li class="flex gap-3 text-sm text-gray-700">
                    <span class="text-black font-bold">•</span> {point}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <div class="prose prose-sm text-gray-600 max-w-none">
            <p class="whitespace-pre-line">{selectedTrend.summary}</p>
          </div>

          <div class="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <a href={selectedTrend.link} target="_blank" class="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors">원문 보기 →</a>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>