<script lang="ts">
	import Chip from '$lib/components/pure/Chip/SearchChip.svelte';
	import SearchBar from '$lib/components/pure/Search/SearchBar.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		tags?: string[];
		selectedTag?: string;
		onselect?: (tag: string) => void;
	}

	let { tags = [], selectedTag = $bindable(''), onselect }: Props = $props();

	function handleTagClick(tag: string) {
		selectedTag = selectedTag === tag ? '' : tag;
		onselect?.(selectedTag);
	}
</script>

<section class={cn(CommonStyles.CARD, 'mb-4 sm:mb-6')}>
	<h2 class="sr-only">검색 카드</h2>
	<SearchBar />
	<div class="border-default mt-4 border-t-2 p-4">
		<div
			class="flex flex-wrap gap-2"
			role="group"
			aria-label="태그 필터"
		>
			{#each tags as tag (tag)}
				<Chip
					active={selectedTag === tag}
					onclick={() => handleTagClick(tag)}
				>
					{tag}
				</Chip>
			{/each}
		</div>
	</div>
</section>
