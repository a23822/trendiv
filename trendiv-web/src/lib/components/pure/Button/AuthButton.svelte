<script lang="ts">
	import { CommonStyles } from '$lib/constants/styles';
	import IconLogoGoogle from '$lib/icons/icon_logo_google.svelte';
	import IconSignin from '$lib/icons/icon_signin.svelte';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		onclick?: () => void;
		className?: string;
	}

	let { onclick = () => {}, className }: Props = $props();

	// 사용자 정보 가공
	const userName = $derived(
		auth.user?.user_metadata?.full_name ||
			auth.user?.email?.split('@')[0] ||
			'사용자'
	);
	const userEmail = $derived(auth.user?.email || '');
	const userAvatar = $derived(auth.user?.user_metadata?.avatar_url || '');
	const userInitials = $derived((userName || '').slice(0, 2).toUpperCase());

	// 로그인 핸들러
	async function handleLogin() {
		onclick();
		auth.openLoginModal();
	}

	// 로그아웃 핸들러
	async function handleLogout() {
		await auth.signOut();
		onclick(); // 로그아웃 후 메뉴 닫기
	}
</script>

{#if auth.user}
	<button
		class={cn(
			'btn_auth group',
			'flex items-center justify-center gap-3',
			'bg-bg-surface ml-auto w-full rounded-xl p-3',
			CommonStyles.DEFAULT_TRANSITION,
			'hover:bg-gray-200 hover:shadow-md',
			className
		)}
		onclick={handleLogout}
	>
		<div
			class={cn(
				'h-[40px] w-[40px] shrink-0',
				'bg-gray-0 relative rounded-full shadow-xs',
				'before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-gray-500/30'
			)}
			style:background={userAvatar ? '#fff' : auth.avatarColor}
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
		class="border-border-default bg-gray-0 flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 transition-all duration-400 hover:bg-gray-100 hover:shadow-xs {className}"
		onclick={handleLogin}
	>
		<IconLogoGoogle />
		<span class="font-sans text-sm font-semibold text-gray-700"
			>Google로 시작하기</span
		>
	</button>
{/if}
