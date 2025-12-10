<script lang="ts">
	import SearchBar from '$lib/components/pure/Search/SearchBar.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import { cn } from '$lib/utils/ClassMerge';
</script>

<section class={cn(CommonStyles.CARD, 'mb-4 sm:mb-6')}>
	<h2 class="sr-only">검색 카드</h2>
	<SearchBar />
</section>
