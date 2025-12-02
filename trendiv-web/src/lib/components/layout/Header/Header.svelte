<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import SideMenu from '$lib/components/layout/Aside/SideMenu.svelte';
	import MenuButton from '$lib/components/pure/Button/MenuButton.svelte';
	import IconLogo from '$lib/icons/icon_logo.svelte';
	import { isSideMenuOpen } from '$lib/stores/state';

	export let user: any;
	export let supabase: any;

	function toggleMenu() {
		isSideMenuOpen.update((v) => !v);
	}

	function closeMenu() {
		isSideMenuOpen.set(false);
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

<header class="bg-bg-body/70 sticky left-0 right-0 top-0 z-[90] backdrop-blur-md">
	<div class="h-header-height flex items-center justify-between gap-2 px-4 md:px-6 xl:px-8">
		<IconLogo width="76" height="44" />
		<h1 class="text-primary mr-auto font-mono text-xl font-bold tracking-tight">Trendiv</h1>
		<MenuButton isOpen={$isSideMenuOpen} onClick={toggleMenu} />
	</div>
</header>
<SideMenu isOpen={$isSideMenuOpen} {closeMenu} />
