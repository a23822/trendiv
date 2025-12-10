<script lang="ts">
	/**
	 * Chip - 선택 가능한 칩/태그 버튼
	 *
	 * @prop active - 활성화 상태 (기본: false)
	 * @prop disabled - 비활성화 상태 (기본: false)
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		active?: boolean;
		disabled?: boolean;
		onclick?: () => void;
		children: Snippet;
	}

	const {
		active = false,
		disabled = false,
		onclick,
		children
	}: Props = $props();
</script>

<button
	type="button"
	class="
		rounded-full border px-4 py-2
		text-[13px] font-semibold
		transition-all duration-200
		{active
		? 'border-mint-500 bg-mint-500 hover:border-mint-600 hover:bg-mint-600 dark:border-mint-400 dark:bg-mint-400 dark:hover:border-mint-300 dark:hover:bg-mint-300 text-white dark:text-neutral-900'
		: 'hover:border-mint-200 hover:bg-mint-50 hover:text-mint-700 dark:hover:border-mint-700 dark:hover:bg-mint-900/30 dark:hover:text-mint-400 border-transparent bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400'}
		disabled:cursor-not-allowed disabled:opacity-50
	"
	aria-pressed={active}
	{disabled}
	{onclick}
>
	{@render children()}
</button>
