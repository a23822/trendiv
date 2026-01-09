<script lang="ts">
	import FilterContent from '$lib/components/contents/FilterContent/FilterContent.svelte';
	import ModalLayout from '$lib/components/modal/ModalLayout.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import IconRefresh from '$lib/icons/icon_refresh.svelte';
	import { modal } from '$lib/stores/modal.svelte.js';
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		open?: boolean;
		tags?: string[];
		selectedTags?: string[];
		categoryList?: string[];
		selectedCategory?: string[];
		onselectCategory?: (category: string) => void;
		onchange?: (selectedTags: string[]) => void;
		onapply?: () => void;
	}

	let {
		open = $bindable(false),
		tags = [],
		selectedTags = [],
		categoryList = [],
		selectedCategory = [],
		onselectCategory,
		onchange,
		onapply
	}: Props = $props();

	// ✅ 로컬 상태 (모달 내부에서만 사용)
	let localSelectedTags = $state<string[]>([]);
	let localSelectedCategory = $state<string[]>([]);

	// ✅ 모달 열릴 때 props로 초기화
	$effect(() => {
		if (open) {
			localSelectedTags = [...selectedTags];
			localSelectedCategory = [...selectedCategory];
		}
	});

	// ✅ 로컬 상태 변경 핸들러
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

	// ✅ 적용 버튼 - 부모에게 최종 결과 전달
	function handleApply() {
		onchange?.(localSelectedTags);

		// 카테고리 변경사항도 전달
		const addedCategories = localSelectedCategory.filter(
			(c) => !selectedCategory.includes(c)
		);
		const removedCategories = selectedCategory.filter(
			(c) => !localSelectedCategory.includes(c)
		);

		[...addedCategories, ...removedCategories].forEach((cat) => {
			onselectCategory?.(cat);
		});

		onapply?.();
		open = false;
	}

	// ✅ 초기화 버튼
	function handleReset() {
		localSelectedTags = [];
		localSelectedCategory = [];
	}
</script>

{#snippet headerComponent()}
	<div class="flex items-center justify-between gap-3">
		<h2 class="text-xl font-bold text-gray-800">필터</h2>
		<button
			type="button"
			onclick={handleReset}
			class={cn(
				'flex items-center gap-1',
				'text-sm text-gray-700',
				'sm:text-gray-500 sm:hover:text-gray-700',
				CommonStyles.DEFAULT_TRANSITION
			)}
		>
			<IconRefresh size={16} />
			초기화
		</button>
	</div>
{/snippet}

{#snippet footerComponent()}
	{@const totalCount = localSelectedTags.length + localSelectedCategory.length}

	<div
		class={cn(
			'flex items-center justify-between gap-3',
			'border-border-default border-t',
			'px-5 py-4'
		)}
	>
		<div class="flex items-center text-sm text-gray-500">
			{#if totalCount > 0}
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
			onchange={handleTagChange}
			onselectCategory={handleCategorySelect}
			variant="flat"
		/>
	</div>
</ModalLayout>
