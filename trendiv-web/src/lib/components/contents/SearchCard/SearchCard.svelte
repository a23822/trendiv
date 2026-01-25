<script lang="ts">
	import FilterContent from '$lib/components/contents/FilterContent/FilterContent.svelte';
	import SearchBar from '$lib/components/pure/Search/SearchBar.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import IconFilter from '$lib/icons/icon_filter.svelte';
	import type { ArticleStatusFilter } from '$lib/types';
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		tags?: string[];
		selectedTags?: string[];
		searchKeyword?: string;
		categoryList: string[];
		selectedCategory?: string[];
		/** 개인화 필터 상태 */
		statusFilter?: ArticleStatusFilter;
		onselectCategory?: (category: string) => void;
		onsearch?: (value: string) => void;
		onclear?: () => void;
		onchange?: (selectedTags: string[]) => void;
		/** 개인화 필터 변경 콜백 */
		onstatusChange?: (status: ArticleStatusFilter) => void;
	}

	let {
		tags = [],
		selectedTags = [],
		searchKeyword = $bindable(''),
		categoryList = [],
		selectedCategory = [],
		statusFilter = 'all',
		onselectCategory = () => {},
		onsearch = () => {},
		onclear = () => {},
		onchange = () => {},
		onstatusChange = () => {}
	}: Props = $props();
</script>

<section class={cn(CommonStyles.CARD, 'mb-4 sm:mb-6')}>
	<h2 class="sr-only">검색 카드</h2>
	<SearchBar
		{onsearch}
		{onclear}
		bind:value={searchKeyword}
	/>

	<div class="border-border-default mt-4 border-t-2">
		<div
			class={cn(
				'flex items-center gap-1',
				'text-mint-700/70 mt-4 text-lg font-bold'
			)}
		>
			<IconFilter
				class="shrink-0"
				size={20}
			/>
			<span class="truncate">필터</span>
		</div>
	</div>

	<FilterContent
		{tags}
		{selectedTags}
		{categoryList}
		{selectedCategory}
		{statusFilter}
		{onselectCategory}
		{onchange}
		{onstatusChange}
		variant="collapsible"
	/>
</section>
