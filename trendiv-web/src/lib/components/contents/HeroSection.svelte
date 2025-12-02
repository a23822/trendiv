<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { supabase } from '$lib/stores/db';
	import type { User } from '@supabase/supabase-js';

	export let onClickLogin: () => void;
	export let onSubscribe: () => void;
	export let email = '';
	export let isSubmitting = false;

	$: currentUser = $user as User | null;

	// 로그인 핸들러
	async function handleLogin() {
		onClickLogin();
		await supabase?.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: window.location.origin }
		});
	}
</script>

<section class="bg-bg-body relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
	<div class="mx-auto max-w-2xl text-center">
		<h2 class="font-mono text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
			<span class="text-gray-400">&lt;</span><span class="text-primary">div</span><span
				class="text-gray-400">&gt;</span
			>Trend<span class="text-gray-400">&lt;/</span><span class="text-primary">div</span><span
				class="text-gray-400">&gt;</span
			>
		</h2>

		<p class="mt-8 text-lg leading-8 text-gray-600">
			흩어진 데이터를 수집하고 분석하여<br class="hidden sm:inline" />
			지금 가장 뜨거운 <span class="font-semibold text-gray-900">개발 트렌드</span>를 한눈에
			보여드립니다.
		</p>
		<div class="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
			{#if !currentUser}
				<div class="relative w-full sm:w-80">
					<label for="email-address" class="sr-only">Email address</label>
					<input
						id="email-address"
						name="email"
						type="email"
						autocomplete="email"
						required
						placeholder="이메일을 입력하세요"
						bind:value={email}
						class="focus:ring-primary w-full rounded-xl border-0 bg-white px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
					/>
				</div>
			{/if}
			<button
				type="submit"
				class="w-full flex-none rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
				on:click={onSubscribe}
				disabled={isSubmitting}
			>
				{isSubmitting ? '처리 중...' : '무료로 구독하기'}
			</button>
		</div>
		{#if !currentUser}
			<div class="mt-6 text-sm text-gray-500">
				이미 계정이 있으신가요?
				<button
					on:click={onClickLogin}
					class="text-primary hover:text-primary-hover ml-1 font-semibold hover:underline"
				>
					로그인하기
				</button>
			</div>
		{/if}
	</div>

	<div
		class="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 transform-gpu blur-3xl"
		aria-hidden="true"
	>
		<div
			class="to-primary aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] opacity-20"
			style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
		></div>
	</div>
</section>
