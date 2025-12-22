<script lang="ts">
	import SearchChip from '$lib/components/pure/Chip/SearchChip.svelte';
	import SearchBar from '$lib/components/pure/Search/SearchBar.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import IconRefresh from '$lib/icons/icon_refresh.svelte';
	import { cn } from '$lib/utils/ClassMerge';
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';
	import { crossfade, fade, slide } from 'svelte/transition';

	interface Props {
		tags?: string[];
		selectedTags?: string[];
		searchKeyword?: string;
		isLoadingMore?: boolean;
		onsearch?: (value: string) => void;
		onclear?: () => void;
		onchange?: (selectedTags: string[]) => void;
	}

	let {
		tags = [],
		selectedTags = $bindable([]),
		searchKeyword = $bindable(''),
		isLoadingMore = false,
		onsearch,
		onclear,
		onchange
	}: Props = $props();

	const [send, receive] = crossfade({
		duration: 400,
		easing: quintOut,
		fallback(node, params) {
			// 이동할 곳이 없을 때(초기화 등)의 기본 트랜지션
			const style = getComputedStyle(node);
			const transform = style.transform === 'none' ? '' : style.transform;
			return {
				duration: 300,
				easing: quintOut,
				css: (t) => `
                transform: ${transform} scale(${t});
                opacity: ${t}
            `
			};
		}
	});

	const unselectedTags = $derived(
		tags.filter((tag) => !selectedTags.includes(tag))
	);
	const hasSelected = $derived(selectedTags.length > 0);

	// ✨ 로직 단순화: 그냥 상태만 바꾸면 Svelte가 알아서 이동시킵니다.
	function selectTag(tag: string) {
		selectedTags = [...selectedTags, tag];
		onchange?.(selectedTags);
	}

	function unselectTag(tag: string) {
		selectedTags = selectedTags.filter((t) => t !== tag);
		onchange?.(selectedTags);
	}

	function resetAll() {
		selectedTags = [];
		onchange?.(selectedTags);
	}
</script>

<section class={cn(CommonStyles.CARD, 'mb-4 sm:mb-6')}>
	<h2 class="sr-only">검색 카드</h2>
	<SearchBar
		{onsearch}
		{onclear}
	/>
	<div class="border-border-default mt-4 border-t-2">
		<div>
			{#if hasSelected}
				<div
					in:slide={{ duration: 300, easing: quintOut }}
					out:slide={{ duration: 300, easing: quintOut, delay: 200 }}
				>
					<div
						transition:fade={{ duration: 200 }}
						class="border-default mb-4 flex items-center gap-2 border-b-2 py-4"
					>
						<div
							in:fade={{ duration: 300, delay: 200 }}
							out:fade={{ duration: 200 }}
							class="flex flex-wrap gap-2"
						>
							{#each selectedTags as tag (tag)}
								<div
									animate:flip={{ duration: 300, delay: 100 }}
									in:receive={{ key: tag }}
									out:send={{ key: tag }}
								>
									<SearchChip
										active={true}
										onclick={() => unselectTag(tag)}
										hasClose={true}
									>
										{tag}
									</SearchChip>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<div class="mt-4 flex flex-wrap gap-2">
				<div transition:fade={{ duration: 200 }}>
					<SearchChip
						onclick={resetAll}
						active={false}
					>
						<span class="flex items-center gap-1">
							<IconRefresh size={16} />
							<span>초기화</span>
						</span>
					</SearchChip>
				</div>
				{#each unselectedTags as tag (tag)}
					<div
						animate:flip={{ duration: 300, delay: 100 }}
						in:receive={{ key: tag }}
						out:send={{ key: tag }}
					>
						<SearchChip
							active={false}
							onclick={() => selectTag(tag)}
						>
							{tag}
						</SearchChip>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>

<style lang="scss">
	@keyframes move-up {
		0% {
			opacity: 0;
			transform: translateY(16px) scale(0.9);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes move-down {
		0% {
			opacity: 0;
			transform: translateY(-16px) scale(0.9);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes fade-in {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}

	.animate-move-up {
		animation: move-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.animate-move-down {
		animation: move-down 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.animate-fade-in {
		animation: fade-in 0.2s ease-out;
	}
</style>
