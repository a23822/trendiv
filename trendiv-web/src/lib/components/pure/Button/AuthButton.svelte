<script lang="ts">
	import IconLogoGoogle from '$lib/icons/icon_logo_google.svelte';
	import IconSignin from '$lib/icons/icon_signin.svelte';
	import {
		user,
		avatarColor,
		openLoginModal,
		signOut
	} from '$lib/stores/auth.svelte.js';
	import type { User } from '@supabase/supabase-js';

	let { onClick = () => {}, className = '' } = $props();

	// 사용자 정보 가공
	const currentUser = $derived($user);
	const currentAvatarColor = $derived($avatarColor);

	const userName = $derived(
		currentUser?.user_metadata?.full_name ||
			currentUser?.email?.split('@')[0] ||
			'사용자'
	);
	const userEmail = $derived(currentUser?.email || '');
	const userAvatar = $derived(currentUser?.user_metadata?.avatar_url || '');
	const userInitials = $derived((userName || '').slice(0, 2).toUpperCase());

	// 로그인 핸들러
	async function handleLogin() {
		onClick();
		openLoginModal();
	}

	// 로그아웃 핸들러
	async function handleLogout() {
		await signOut();
		onClick(); // 로그아웃 후 메뉴 닫기
	}
</script>

{#if currentUser}
	<button
		class="btn_auth bg-bg-surface group flex w-full items-center justify-center gap-3 rounded-xl p-3 transition-all duration-200 hover:bg-gray-200 hover:shadow-md {className}"
		on:click={handleLogout}
	>
		<div
			class="bg-gray-0 before:rounded-inherit relative h-[40px] w-[40px] shrink-0 rounded-full shadow-sm before:absolute before:inset-0 before:border before:border-gray-500/30"
			style:background={userAvatar ? '#fff' : $avatarColor}
		>
			{#if userAvatar}
				<img
					width="40"
					height="40"
					src={userAvatar}
					alt=""
					class="rounded-inherit object-cover"
				/>
			{:else}
				<span class="text-sm font-semibold">{userInitials}</span>
			{/if}
		</div>

		<div class="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
			<span class="w-full truncate text-sm font-medium text-gray-900">
				{userName}<span class="text-xs font-normal text-gray-500">님</span>
			</span>
			<span class="w-full truncate text-[11px] text-gray-500">
				{userEmail}
			</span>
		</div>
		<IconSignin className="shrink-0" />
	</button>
{:else}
	<button
		class="border-border-default bg-gray-0 duration-400 flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 transition-all hover:bg-gray-100 hover:shadow-sm {className}"
		on:click={handleLogin}
	>
		<IconLogoGoogle />
		<span class="font-sans text-sm font-semibold text-gray-700"
			>Google로 시작하기</span
		>
	</button>
{/if}
