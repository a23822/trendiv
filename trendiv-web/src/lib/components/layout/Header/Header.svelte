<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import SideMenu from '$lib/components/layout/Aside/SideMenu.svelte';
	import MenuButton from '$lib/components/pure/Button/MenuButton.svelte';
	import IconLogo from '$lib/icons/icon_logo.svelte';

	export let user: any;
	export let supabase: any;

	// ✅ 메뉴 상태 관리
	let isMenuOpen = false;

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	function closeMenu() {
		isMenuOpen = false;
	}

	let email = '';
	let subStatus = '';
	let isSubmitting = false;
	const API_URL = PUBLIC_API_URL || 'http://127.0.0.1:3000';

	// 구글 로그인
	async function signInWithGoogle() {
		await supabase?.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: window.location.origin }
		});
	}

	// 로그아웃
	async function signOut() {
		await supabase?.auth.signOut();
		email = '';
		subStatus = '';
	}

	// 구독 로직
	async function subscribe() {
		const targetEmail = user?.email || email;
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
				subStatus = user ? '✅ 구독 완료!' : '✅ 메일함을 확인해주세요.';
				if (!user) email = '';
			} else {
				const err = await res.json();
				subStatus = `⚠️ ${err.error || '오류가 발생했습니다.'}`;
			}
		} catch {
			subStatus = '❌ 연결 실패';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<header class="bg-bg-body">
	<div class="flex h-[60px] items-center justify-between gap-2 px-4 md:px-6 xl:px-8">
		<IconLogo width="76" height="44" />
		<span class="text-primary mr-auto font-mono text-xl font-bold tracking-tight">Trendiv</span>
		<MenuButton isOpen={isMenuOpen} onClick={toggleMenu} />
	</div>
</header>
<SideMenu isOpen={isMenuOpen} {closeMenu} />
<!-- <header class="w-full border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
  <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
    
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg">T</div>
      <span class="text-xl font-bold tracking-tight text-gray-900">Trendiv</span>
    </div>

    <div class="flex items-center gap-4">
      {#if user}
        <div class="hidden md:flex items-center gap-3 text-sm">
          <span class="text-gray-500">{user.email}</span>
          <button 
            on:click={subscribe}
            disabled={isSubmitting}
            class="px-4 py-2 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            {isSubmitting ? '...' : '구독하기'}
          </button>
          <button on:click={signOut} class="text-gray-400 hover:text-gray-600">로그아웃</button>
        </div>
        <button on:click={signOut} class="md:hidden text-sm text-gray-500">로그아웃</button>

      {:else}
        <button 
          on:click={signInWithGoogle}
          class="text-sm font-medium text-gray-600 hover:text-black transition-colors"
        >
          로그인
        </button>
        <button 
          on:click={signInWithGoogle}
          class="px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
        >
          시작하기
        </button>
      {/if}
    </div>
  </div>
  
  {#if subStatus}
    <div class="absolute top-16 left-0 w-full bg-gray-900 text-white text-center text-sm py-2 animate-fade-in">
      {subStatus}
    </div>
  {/if}
</header> -->
