<script lang="ts">
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
	import CloseButton from '$lib/components/pure/Button/CloseButton.svelte';
	import ThemeSwitch from '$lib/components/pure/ToggleSwitch/ThemeSwitch.svelte';
	import { IDs } from '$lib/constants/ids';
	import { user } from '$lib/stores/auth';
	import { supabase } from '$lib/stores/db';
	import { fly } from 'svelte/transition';

	export let isOpen = false;
	export let closeMenu: () => void;

	let dialog: HTMLDialogElement;

	$: if (dialog && isOpen && !dialog.open) {
		dialog.showModal();
	}

	function handleClose() {
		if (dialog && dialog.open) {
			dialog.close();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialog) {
			closeMenu();
		}
	}

	$: userName = $user?.user_metadata?.full_name || $user?.email?.split('@')[0] || '사용자';
	$: userEmail = $user?.email || '';
	$: userAvatar = $user?.user_metadata?.avatar_url || '';
	$: userInitials = userName.slice(0, 2).toUpperCase();

	async function handleLogin() {
		closeMenu();
		await supabase?.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: window.location.origin }
		});
	}

	async function handleLogout() {
		await supabase?.auth.signOut();
		closeMenu();
	}
</script>

<dialog
	bind:this={dialog}
	id={IDs.LAYOUT.SIDE_MENU}
	on:click={handleBackdropClick}
	on:close={closeMenu}
	class="side_menu"
	class:closed={!isOpen}
>
	{#if isOpen}
		<aside
			id={IDs.LAYOUT.SIDE_MENU}
			class="fixed right-0 top-0 z-40 flex h-dvh w-96 max-w-full flex-col justify-between bg-white shadow-2xl"
			transition:fly={{ x: 300, duration: 300 }}
			on:outroend={handleClose}
		>
			<div class="shrink-0">
				<ThemeSwitch />
			</div>
			<div class="absolute right-0 top-0">
				<CloseButton onClick={closeMenu} />
			</div>
			<nav class="flex-1 overflow-hidden">
				<ul>
					<li>1</li>
					<li>2</li>
					<li>3</li>
				</ul>
			</nav>
			<div class="border-border-default shrink-0 border-t p-4">
				{#if $user}
					<button class="profile-card" on:click={handleLogout}>
						<div class="avatar">
							{#if userAvatar}
								<img src={userAvatar} alt={userName} />
							{:else}
								<span>{userInitials}</span>
							{/if}
						</div>
						<div class="user-info">
							<span class="name">{userName}<span>님</span></span>
							<span class="email">{userEmail}</span>
						</div>
						<svg
							class="logout-icon"
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
							<polyline points="16 17 21 12 16 7" />
							<line x1="21" y1="12" x2="9" y2="12" />
						</svg>
					</button>
				{:else}
					<button class="login-btn" on:click={handleLogin}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
							<polyline points="10 17 15 12 10 7" />
							<line x1="15" y1="12" x2="3" y2="12" />
						</svg>
						<span>Google로 로그인</span>
					</button>
				{/if}
			</div>
			<div class="shrink-0 border-t bg-neutral-100">
				<p class="py-10 text-center text-xs text-gray-700">© 2025 Trendiv. All rights reserved.</p>
			</div>
		</aside>
	{/if}
</dialog>

<style lang="scss">
	.side_menu {
		&::backdrop {
			background-color: rgba(0, 0, 0, 0.4);
			transition: background-color 0.3s ease-in-out;
		}
		&.closed {
			&::backdrop {
				background-color: transparent;
			}
		}
	}

	.profile-card {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px;
		background: var(--bg-surface);
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background: var(--bg-hover);

			.logout-icon {
				color: var(--alert);
			}
		}
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #4dd0bd, #1ba896);
		flex-shrink: 0;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		span {
			font-size: 14px;
			font-weight: 600;
			color: white;
		}
	}

	.user-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		min-width: 0;
	}

	.name {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.email {
		font-size: 11px;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.logout-icon {
		color: var(--text-muted);
		flex-shrink: 0;
		transition: color 0.2s ease;
	}

	/* 로그인 버튼 */
	.login-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		width: 100%;
		padding: 12px 16px;
		background: var(--bg-surface);
		border: 1px solid var(--border-default);
		border-radius: 12px;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background: var(--bg-hover);
			border-color: var(--primary);
		}

		svg {
			color: var(--text-secondary);
		}
	}
</style>
