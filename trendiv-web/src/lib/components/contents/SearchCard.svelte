<script lang="ts">
	import SearchChip from '$lib/components/pure/Chip/SearchChip.svelte';
	import SearchBar from '$lib/components/pure/Search/SearchBar.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import IconRefresh from '$lib/icons/icon_refresh.svelte';
	import { cn } from '$lib/utils/ClassMerge';
	import { tick } from 'svelte';

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

	type AnimatedTag = {
		name: string;
		is_showing: boolean;
		is_hiding: boolean;
		is_initial: boolean;
	};

	const ANIMATION_DURATION = 450;

	let animatedSelectedTags = $state<AnimatedTag[]>([]);
	let animatedUnselectedTags = $state<AnimatedTag[]>([]);

	// 컨테이너 애니메이션 상태
	let containerState = $state<'hidden' | 'showing' | 'visible' | 'hiding'>(
		'hidden'
	);

	$effect(() => {
		if (
			animatedSelectedTags.length === 0 &&
			animatedUnselectedTags.length === 0 &&
			tags.length > 0
		) {
			animatedSelectedTags = selectedTags.map((name) => ({
				name,
				is_showing: false,
				is_hiding: false,
				is_initial: false
			}));
			animatedUnselectedTags = tags
				.filter((tag) => !selectedTags.includes(tag))
				.map((name) => ({
					name,
					is_showing: false,
					is_hiding: false,
					is_initial: false
				}));

			// 초기 상태 설정
			containerState = selectedTags.length > 0 ? 'visible' : 'hidden';
		}
	});

	const hasSelected = $derived(selectedTags.length > 0);

	async function showContainer() {
		containerState = 'showing';
		await tick();
		requestAnimationFrame(() => {
			containerState = 'visible';
		});
	}

	async function selectTag(tag: string) {
		const isFirstTag =
			animatedSelectedTags.length === 0 ||
			animatedSelectedTags.every((t) => t.is_hiding);

		if (isFirstTag) {
			await showContainer();
		}

		animatedUnselectedTags = animatedUnselectedTags.map((t) =>
			t.name === tag ? { ...t, is_hiding: true, is_showing: false } : t
		);

		animatedSelectedTags = [
			...animatedSelectedTags,
			{ name: tag, is_showing: false, is_hiding: false, is_initial: true }
		];

		await tick();
		requestAnimationFrame(() => {
			animatedSelectedTags = animatedSelectedTags.map((t) =>
				t.name === tag ? { ...t, is_initial: false, is_showing: true } : t
			);
		});

		setTimeout(() => {
			selectedTags = [...selectedTags, tag];
			animatedSelectedTags = animatedSelectedTags.map((t) =>
				t.name === tag ? { ...t, is_showing: false } : t
			);
			animatedUnselectedTags = animatedUnselectedTags.filter(
				(t) => t.name !== tag
			);
			onchange?.(selectedTags);
		}, ANIMATION_DURATION);
	}

	async function unselectTag(tag: string) {
		const isLastTag =
			animatedSelectedTags.filter((t) => !t.is_hiding).length === 1;

		if (isLastTag) {
			containerState = 'hiding';
		}

		animatedSelectedTags = animatedSelectedTags.map((t) =>
			t.name === tag ? { ...t, is_hiding: true, is_showing: false } : t
		);

		animatedUnselectedTags = [
			...animatedUnselectedTags,
			{ name: tag, is_showing: false, is_hiding: false, is_initial: true }
		];

		await tick();
		requestAnimationFrame(() => {
			animatedUnselectedTags = animatedUnselectedTags.map((t) =>
				t.name === tag ? { ...t, is_initial: false, is_showing: true } : t
			);
		});

		setTimeout(() => {
			selectedTags = selectedTags.filter((t) => t !== tag);
			animatedUnselectedTags = animatedUnselectedTags.map((t) =>
				t.name === tag ? { ...t, is_showing: false } : t
			);
			animatedSelectedTags = animatedSelectedTags.filter((t) => t.name !== tag);
			onchange?.(selectedTags);

			if (isLastTag) {
				containerState = 'hidden';
			}
		}, ANIMATION_DURATION);
	}

	async function resetAll() {
		const currentSelectedNames = selectedTags.slice();

		containerState = 'hiding';

		animatedSelectedTags = animatedSelectedTags.map((tag) => ({
			...tag,
			is_hiding: true,
			is_showing: false
		}));

		const tagsToMove = currentSelectedNames.map((name) => ({
			name,
			is_showing: false,
			is_hiding: false,
			is_initial: true
		}));

		animatedUnselectedTags = [...animatedUnselectedTags, ...tagsToMove];

		await tick();
		requestAnimationFrame(() => {
			animatedUnselectedTags = animatedUnselectedTags.map((t) =>
				currentSelectedNames.includes(t.name) && t.is_initial
					? { ...t, is_initial: false, is_showing: true }
					: t
			);
		});

		setTimeout(() => {
			selectedTags = [];
			animatedSelectedTags = [];
			animatedUnselectedTags = animatedUnselectedTags.map((t) => ({
				...t,
				is_showing: false
			}));
			onchange?.(selectedTags);

			containerState = 'hidden';
		}, ANIMATION_DURATION);
	}
</script>

<section class={cn(CommonStyles.CARD, 'mb-4 sm:mb-6')}>
	<h2 class="sr-only">검색 카드</h2>
	<SearchBar
		{onsearch}
		{onclear}
	/>
	<div class="border-border-default mt-4 border-t-2">
		<div class={cn()}>
			<!-- Selected Tags -->
			<div
				class={cn(
					'grid overflow-hidden',
					'transition-[grid-template-rows] duration-150 ease-out',
					(containerState === 'hidden' ||
						containerState === 'showing' ||
						containerState === 'hiding') &&
						'grid-rows-[0fr]',
					containerState === 'visible' && 'grid-rows-[1fr]'
				)}
			>
				<div class="overflow-hidden">
					<div class="border-default flex items-center border-b-2 py-4">
						<div class="-ml-2 flex flex-wrap gap-y-2">
							{#each animatedSelectedTags as tag (tag.name)}
								<div
									class={cn(
										'inline-grid overflow-hidden',
										'transition-[grid-template-columns,margin] duration-150 ease-out',
										(tag.is_initial || tag.is_hiding) && 'ml-0 grid-cols-[0fr]',
										tag.is_showing && 'ml-2 grid-cols-[1fr]',
										!tag.is_initial &&
											!tag.is_hiding &&
											!tag.is_showing &&
											'ml-2 grid-cols-[1fr]'
									)}
								>
									<div
										class={cn(
											'self-center overflow-hidden',
											'transition-[opacity,transform] duration-400 ease-out',
											(tag.is_initial || tag.is_hiding) && 'scale-0 opacity-0',
											tag.is_showing && 'scale-100 opacity-100 delay-150',
											!tag.is_initial &&
												!tag.is_hiding &&
												!tag.is_showing &&
												'scale-100 opacity-100'
										)}
									>
										<SearchChip
											active={true}
											onclick={() => unselectTag(tag.name)}
											hasClose={true}
										>
											{tag.name}
										</SearchChip>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<!-- Unselected Tags -->
			<div class="mt-4 -ml-2 flex flex-wrap gap-y-2">
				<div class="ml-2">
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
				{#each animatedUnselectedTags as tag (tag.name)}
					<div
						class={cn(
							'inline-grid overflow-hidden',
							'transition-[grid-template-columns,margin] duration-150 ease-out',
							(tag.is_initial || tag.is_hiding) && 'ml-0 grid-cols-[0fr]',
							tag.is_showing && 'ml-2 grid-cols-[1fr]',
							!tag.is_initial &&
								!tag.is_hiding &&
								!tag.is_showing &&
								'ml-2 grid-cols-[1fr]'
						)}
					>
						<div
							class={cn(
								'self-center overflow-hidden',
								'transition-[opacity,transform] duration-400 ease-out',
								(tag.is_initial || tag.is_hiding) && 'scale-0 opacity-0',
								tag.is_showing && 'scale-100 opacity-100 delay-150',
								!tag.is_initial &&
									!tag.is_hiding &&
									!tag.is_showing &&
									'scale-100 opacity-100'
							)}
						>
							<SearchChip
								active={false}
								onclick={() => selectTag(tag.name)}
							>
								{tag.name}
							</SearchChip>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>
