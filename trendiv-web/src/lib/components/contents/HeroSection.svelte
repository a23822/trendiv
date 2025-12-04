<script lang="ts">
	import TextLoading from '$lib/components/pure/Load/TextLoading.svelte';
	import { IDs } from '$lib/constants/ids';
	import IconLogoHero from '$lib/icons/icon_logo_hero.svelte';
	import { user, openLoginModal } from '$lib/stores/auth';
	import { supabase } from '$lib/stores/db';
	import { isSideMenuOpen } from '$lib/stores/state';
	import type { User } from '@supabase/supabase-js';
	import { onMount } from 'svelte';

	export let onSubscribe: () => void;
	export let email = '';
	export let isSubmitting = false;

	$: currentUser = $user as User | null;

	let heroSection: HTMLElement;
	let isVisible = true;

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					isVisible = entry.isIntersecting;
				});
			},
			{ threshold: 0 }
		);

		if (heroSection) observer.observe(heroSection);

		return () => {
			if (heroSection) observer.unobserve(heroSection);
		};
	});

	// 로그인 핸들러
	async function handleLogin() {
		openLoginModal();
	}
</script>

<section
	bind:this={heroSection}
	class:paused={!isVisible || $isSideMenuOpen}
	class="relative overflow-hidden bg-[#1a1a1a] px-4 py-12 sm:px-6 sm:py-20"
>
	<div
		class="animate-mesh1 pointer-events-none absolute inset-[-50%] bg-[radial-gradient(circle_at_30%_30%,rgba(77,208,189,0.25)_0%,transparent_40%)]"
	></div>
	<div
		class="animate-mesh2 pointer-events-none absolute inset-[-50%] bg-[radial-gradient(circle_at_70%_60%,rgba(128,222,209,0.2)_0%,transparent_35%)]"
	></div>
	<div
		class="animate-mesh3 pointer-events-none absolute inset-[-50%] bg-[radial-gradient(circle_at_50%_80%,rgba(27,168,150,0.18)_0%,transparent_40%)]"
	></div>
	<div
		class="animate-mesh4 pointer-events-none absolute inset-[-50%] bg-[radial-gradient(circle_at_20%_70%,rgba(77,208,189,0.15)_0%,transparent_30%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-3xl text-center">
		<h2>
			<IconLogoHero aria-hidden="true" />
		</h2>
		<p class="mt-4 text-lg font-bold leading-8 text-gray-300 dark:text-gray-600">
			트렌디한 <span class="text-gray-100 dark:text-gray-900">HTML, CSS, A11y</span> 정보를<br />
			<span class="text-gray-100 dark:text-gray-900">AI</span>가 직접 선별해서 보여드립니다.
		</p>
		<form
			class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
			on:submit|preventDefault={onSubscribe}
		>
			{#if !currentUser}
				<div class="w-full flex-1">
					<label for={IDs.HERO.EMAIL_INPUT} class="sr-only">Email address</label>
					<input
						id={IDs.HERO.EMAIL_INPUT}
						name="email"
						type="email"
						autocomplete="email"
						required
						placeholder="이메일을 입력해주세요."
						bind:value={email}
						class="w-full rounded-2xl bg-white px-6 py-4 text-xl"
					/>
				</div>
			{/if}
			<button
				type="submit"
				class="grid shrink-0 place-items-center rounded-2xl bg-black px-6 py-4 text-xl text-white"
				disabled={isSubmitting}
				aria-label={isSubmitting ? '구독 처리 중' : '이메일로 구독하기'}
			>
				<span
					aria-hidden="true"
					class="col-start-1 row-start-1 transition-opacity duration-200 {isSubmitting
						? 'opacity-0'
						: 'opacity-100'}"
				>
					이메일로 구독하기
				</span>

				<div
					aria-hidden="true"
					class="col-start-1 row-start-1 flex justify-center transition-opacity duration-200 {isSubmitting
						? 'opacity-100'
						: 'opacity-0'}"
				>
					<TextLoading />
				</div>
			</button>
		</form>
		{#if !currentUser}
			<div class="mt-6 text-sm text-white">
				{'Google 계정으로 계속할까요?'}
				<button
					on:click={handleLogin}
					class="text-primary hover:text-primary-hover ml-1 font-bold hover:underline"
				>
					로그인하기
				</button>
			</div>
		{/if}
	</div>

	<div
		class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform-gpu blur-3xl"
		aria-hidden="true"
		class:aurora_paused={!isVisible || $isSideMenuOpen}
	>
		<div
			class="to-primary aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] opacity-20"
			style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
		></div>
	</div>
</section>

<style>
	@keyframes mesh1 {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		25% {
			transform: translate(10%, 5%) scale(1.1);
		}
		50% {
			transform: translate(5%, 10%) scale(1.05);
		}
		75% {
			transform: translate(-5%, 5%) scale(1.15);
		}
	}
	@keyframes mesh2 {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(-8%, 8%) scale(1.1);
		}
		66% {
			transform: translate(8%, -5%) scale(0.95);
		}
	}
	@keyframes mesh3 {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		50% {
			transform: translate(6%, -8%) scale(1.2);
		}
	}
	@keyframes mesh4 {
		0%,
		100% {
			transform: translate(0, 0) scale(1) rotate(0deg);
		}
		50% {
			transform: translate(-10%, 10%) scale(1.15) rotate(5deg);
		}
	}
	.animate-mesh1,
	.animate-mesh2,
	.animate-mesh3,
	.animate-mesh4 {
		transition: opacity 0.3s ease;
		will-change: transform, opacity;
	}
	@media (min-width: theme('spacing.sidemenu')) {
		.animate-mesh1,
		.animate-mesh2,
		.animate-mesh3,
		.animate-mesh4 {
			transition: none;
			will-change: transform;
		}
	}
	.animate-mesh1 {
		animation: mesh1 8s ease-in-out infinite;
	}
	.animate-mesh2 {
		animation: mesh2 10s ease-in-out infinite;
	}
	.animate-mesh3 {
		animation: mesh3 12s ease-in-out infinite;
	}
	.animate-mesh4 {
		animation: mesh4 9s ease-in-out infinite;
	}

	.paused .animate-mesh1,
	.paused .animate-mesh2,
	.paused .animate-mesh3,
	.paused .animate-mesh4 {
		animation: none;
		opacity: 0;
	}
	@media (min-width: theme('spacing.sidemenu')) {
		.paused .animate-mesh1,
		.paused .animate-mesh2,
		.paused .animate-mesh3,
		.paused .animate-mesh4 {
			opacity: 1;
			animation-play-state: paused;
		}
	}
	.aurora_paused {
		display: none;
	}
</style>
