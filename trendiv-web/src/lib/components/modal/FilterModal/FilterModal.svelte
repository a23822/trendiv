<script lang="ts">
	import FilterContent from '$lib/components/contents/FilterContent/FilterContent.svelte';
	import ModalLayout from '$lib/components/modal/ModalLayout.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import IconRefresh from '$lib/icons/icon_refresh.svelte';
	import { modal } from '$lib/stores/modal.svelte.js';
	import type { ArticleStatusFilter } from '$lib/types';
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		open?: boolean;
		tags?: string[];
		selectedTags?: string[];
		categoryList?: string[];
		selectedCategory?: string[];
		statusFilter?: ArticleStatusFilter;
		onchangeCategory?: (categories: string[]) => void;
		onchange?: (selectedTags: string[]) => void;
		onstatusChange?: (status: ArticleStatusFilter) => void;
		onapply?: () => void;
	}

	let {
		open = $bindable(false),
		tags = [],
		selectedTags = [],
		categoryList = [],
		selectedCategory = [],
		statusFilter = 'all',
		onchangeCategory,
		onchange,
		onstatusChange,
		onapply
	}: Props = $props();

	// 로컬 상태 (모달 내부에서만 사용)
	let localSelectedTags = $state<string[]>([]);
	let localSelectedCategory = $state<string[]>([]);
	let localStatusFilter = $state<ArticleStatusFilter>('all');

	// 모달이 "열리는 순간"에만 초기화 (편집 중 덮어쓰기 방지)
	let wasOpen = $state(false);

	$effect(() => {
		if (open && !wasOpen) {
			// open이 false → true로 변할 때만 실행
			localSelectedTags = [...selectedTags];
			localSelectedCategory = [...selectedCategory];
			localStatusFilter = statusFilter; // 추가: statusFilter 초기화
		}
		wasOpen = open;
	});

	// 로컬 상태 변경 핸들러
	function handleTagChange(newTags: string[]) {
		localSelectedTags = newTags;
	}

	function handleCategorySelect(category: string) {
		if (localSelectedCategory.includes(category)) {
			localSelectedCategory = localSelectedCategory.filter(
				(c) => c !== category
			);
		} else {
			localSelectedCategory = [...localSelectedCategory, category];
		}
	}

	function handleStatusChange(status: ArticleStatusFilter) {
		localStatusFilter = status;
	}

	// 적용 버튼 - 배열로 한 번에 전달
	function handleApply() {
		onchange?.(localSelectedTags);
		onchangeCategory?.(localSelectedCategory);
		onstatusChange?.(localStatusFilter);
		onapply?.();
		modal.close();
		open = false;
	}

	// 초기화 버튼
	function handleReset() {
		localSelectedTags = [];
		localSelectedCategory = [];
		localStatusFilter = 'all';
	}
</script>

{#snippet headerComponent()}
	<div class="flex items-center justify-between gap-3">
		<h2 class="text-xl font-bold text-gray-800">필터</h2>
	</div>
{/snippet}

{#snippet footerComponent()}
	{@const totalCount = localSelectedTags.length + localSelectedCategory.length}
	{@const hasStatusFilter = localStatusFilter !== 'all'}

	<div
		class={cn(
			'flex items-center justify-between gap-3',
			'border-border-default border-t',
			'px-5 py-4'
		)}
	>
		<div class="flex items-center text-sm text-gray-500">
			{#if totalCount > 0 || hasStatusFilter}
				{#if hasStatusFilter}
					<span
						class="before:mx-2 before:text-gray-300 before:content-['|'] first:before:content-none"
					>
						{localStatusFilter === 'bookmarked' ? '북마크' : '숨김'}
					</span>
				{/if}
				{#if localSelectedTags.length > 0}
					<span
						class="before:mx-2 before:text-gray-300 before:content-['|'] first:before:content-none"
						>태그 {localSelectedTags.length}</span
					>
				{/if}
				{#if localSelectedCategory.length > 0}
					<span
						class="before:mx-2 before:text-gray-300 before:content-['|'] first:before:content-none"
						>출처 {localSelectedCategory.length}</span
					>
				{/if}
				<span class="ml-2">선택됨</span>
			{/if}
		</div>
		<button
			type="button"
			onclick={handleReset}
			class={cn(
				'ml-auto flex items-center gap-1 px-2',
				'text-sm text-gray-700',
				'sm:text-gray-500 sm:hover:text-gray-700',
				CommonStyles.DEFAULT_TRANSITION
			)}
		>
			<IconRefresh size={16} />
			초기화
		</button>
		<button
			type="button"
			onclick={handleApply}
			class={cn(
				'rounded-lg px-4 py-2',
				'bg-mint-500 text-white',
				'hover:bg-mint-600',
				CommonStyles.DEFAULT_TRANSITION
			)}
		>
			적용
		</button>
	</div>
{/snippet}

<ModalLayout
	bind:open
	onclose={() => modal.close()}
	{headerComponent}
	{footerComponent}
>
	<div class="py-4">
		<FilterContent
			{tags}
			selectedTags={localSelectedTags}
			{categoryList}
			selectedCategory={localSelectedCategory}
			statusFilter={localStatusFilter}
			onchange={handleTagChange}
			onselectCategory={handleCategorySelect}
			onresetCategory={() => (localSelectedCategory = [])}
			onstatusChange={handleStatusChange}
			variant="flat"
		/>
	</div>
</ModalLayout>
