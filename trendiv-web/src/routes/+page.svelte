<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { createClient } from '@supabase/supabase-js';
  import type { PageData } from './$types';
  import type { Trend } from '$lib/types';
  import { PUBLIC_API_URL } from '$env/static/public';
  
  // ✅ 환경 변수에서 키 가져오기 (import 방식 주의)
  import { env } from '$env/dynamic/public';

  export let data: PageData;

  // --- [Supabase Auth 초기화] ---
  // 프론트엔드에서는 반드시 ANON KEY를 써야 합니다.
  const supabaseUrl = env.PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // --- [상태 변수] ---
  let user: any = null; // 로그인한 사용자 정보
  let trends: Trend[] = data.trends || [];
  let page = 1;
  let isLoadingMore = false;
  let hasMore = true;
  let searchKeyword = "";
  let selectedTag = "";
  let isSearching = false;
  let selectedTrend: Trend | null = null;
  const popularTags = ["CSS", "HTML", "React", "Accessibility", "iOS", "Performance"];

  // 구독 관련
  let email = '';
  let subStatus = '';
  let isSubmitting = false;
  const API_URL = PUBLIC_API_URL || 'http://127.0.0.1:3000';

  // --- [초기화 및 로그인 감지] ---
  onMount(() => {
    // 1. 비동기 작업은 내부 함수로 분리해서 실행
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user ?? null;
      
      // 초기 데이터 없을 때 재로드
      if (trends.length === 0) fetchTrends(true);
    };
    
    initSession(); // 비동기 함수 실행 (await 안 함)

    // 2. 동기 작업: 구독 리스너 등록
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
      if (user) {
        email = user.email || ''; 
      }
    });

    // 3. 클린업 함수 반환
    return () => subscription.unsubscribe();
  });

  // --- [구글 로그인 함수] ---
  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin // 로그인 후 현재 페이지로 돌아옴
      }
    });
  }

  // --- [로그아웃 함수] ---
  async function signOut() {
    await supabase.auth.signOut();
    email = ''; // 이메일 초기화
    subStatus = '';
  }

  // --- [데이터 로드 로직] ---
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

  // --- [핸들러 함수들] ---
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

  // --- [구독 로직] ---
  async function subscribe() {
    // 로그인했으면 user.email, 아니면 입력된 email 사용
    const targetEmail = user?.email || email;
    
    if (!targetEmail) return;
    
    isSubmitting = true;
    subStatus = '등록 중...';
    try {
      const res = await fetch(`${API_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      if (res.ok) {
        subStatus = `✅ ${user ? '구독이 완료되었습니다!' : '구독 완료! 메일함을 확인하세요.'}`;
        if (!user) email = '';
      } else {
        const err = await res.json();
        subStatus = `⚠️ ${err.error || '오류가 발생했습니다.'}`;
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

      <div class="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 max-w-md mx-auto backdrop-blur-sm">
        
        {#if user}
          <div class="text-center">
            <div class="flex items-center justify-center gap-3 mb-4">
              {#if user.user_metadata?.avatar_url}
                <img src={user.user_metadata.avatar_url} alt="Profile" class="w-10 h-10 rounded-full border-2 border-blue-500" />
              {/if}
              <div class="text-left">
                <p class="text-sm text-slate-400">환영합니다!</p>
                <p class="font-bold text-white">{user.email}</p>
              </div>
            </div>
            
            <div class="flex flex-col gap-3">
              <button 
                on:click={subscribe} 
                disabled={isSubmitting}
                class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-70"
              >
                {isSubmitting ? '처리 중...' : '🔥 원클릭으로 구독하기'}
              </button>
              
              <button on:click={signOut} class="text-xs text-slate-500 hover:text-slate-300 underline">
                로그아웃
              </button>
            </div>
          </div>

        {:else}
          <div class="flex flex-col gap-4">
            <button 
              on:click={signInWithGoogle}
              class="flex items-center justify-center gap-3 w-full py-3 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google 계정으로 계속하기
            </button>

            <div class="relative py-2">
              <div class="absolute inset-0 flex items-center"><span class="w-full border-t border-slate-600"></span></div>
              <div class="relative flex justify-center text-xs uppercase"><span class="bg-slate-800 px-2 text-slate-400">또는 이메일 직접 입력</span></div>
            </div>

            <div class="flex gap-2">
              <input 
                type="email" 
                bind:value={email} 
                placeholder="developer@example.com" 
                class="flex-1 px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                disabled={isSubmitting}
                on:keydown={(e) => e.key === 'Enter' && subscribe()}
              />
              <button 
                on:click={subscribe} 
                disabled={isSubmitting}
                class="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                구독
              </button>
            </div>
          </div>
        {/if}

        {#if subStatus}
          <p class="mt-4 text-center text-sm font-medium {subStatus.includes('✅') ? 'text-green-400' : 'text-red-400'}">
            {subStatus}
          </p>
        {/if}
      </div>
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
          <article class="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col h-full overflow-hidden hover:-translate-y-1 relative">
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
                <button class="text-left w-full focus:outline-none after:absolute after:inset-0" on:click={() => openModal(trend)}>{trend.title}</button>
              </h2>
              <div class="mb-4 text-sm text-slate-700 font-medium bg-slate-50 p-3 rounded-lg border-l-4 border-blue-400">"{trend.oneLineSummary || trend.summary.slice(0, 60)}..."</div>
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