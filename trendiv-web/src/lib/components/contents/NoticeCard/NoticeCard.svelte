<script lang="ts">
	import CloseButton from '$lib/components/pure/Button/CloseButton.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import IconLogoModel from '$lib/icons/icon_logo_model.svelte';
	import { IDs } from '$lib/stores/ids';
	import { cn } from '$lib/utils/ClassMerge';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';

	// Svelte 5: 반응형 상태 선언
	let isVisible = $state(false);

	onMount(() => {
		const isHidden = localStorage.getItem('trendiv_notice_hidden');

		if (!isHidden) {
			isVisible = true;
		}
	});

	function handleClose() {
		isVisible = false;
		localStorage.setItem('trendiv_notice_hidden', 'true');
	}
</script>

{#if isVisible}
	<div
		transition:slide={{ duration: 300, axis: 'y' }}
		class={cn(CommonStyles.CARD, 'mb-4 sm:mb-6', 'p-0 sm:p-0')}
	>
		<div class={cn('relative', 'flex gap-3', 'p-4 sm:p-6')}>
			<div class="text-primary shrink-0">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle
						cx="12"
						cy="12"
						r="10"
					/><path d="M12 16v-4" /><path d="M12 8h.01" />
				</svg>
			</div>

			<div class="flex-1 text-sm leading-relaxed text-gray-800">
				<p class="mb-2 font-semibold">AI 분석 모델 안내</p>
				<p class="whitespace-pre-line">
					{`기본적으로 Gemini-3-flash-preview 로 요약하고 틈틈이 Gemini-3-pro, grok 버전으로도 요약합니다.\n일부 플랫폼은 최적화된 AI 모델로 분석됩니다.\n`}
					<span class="font-bold">X(구 Twitter)</span> -
					<span
						class={cn(
							'inline-flex items-center gap-0.5 align-top',
							'font-bold'
						)}
						><IconLogoModel
							model="grok"
							id={`${IDs.LAYOUT.MAIN_NOTICE}-grok`}
						/>Grok</span
					><br />
					<span class="font-bold">YouTube</span> -
					<span
						class={cn(
							'inline-flex items-center gap-0.5 align-top',
							'font-bold'
						)}
						><IconLogoModel
							model="gemini"
							id={`${IDs.LAYOUT.MAIN_NOTICE}-gemini`}
							size={12}
						/>Gemini</span
					>
				</p>
			</div>

			<CloseButton
				onclick={handleClose}
				size={30}
				class={cn('absolute top-2 right-2')}
			/>
		</div>
	</div>
{/if}
