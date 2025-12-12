<script lang="ts">
	import { IDs } from '$lib/constants/ids';

	interface Props {
		onclick?: () => void;
		className?: string;
		isOpen: boolean;
	}

	let { isOpen = false, onclick, className }: Props = $props();
</script>

<button
	type="button"
	class="btn_menu {className}"
	aria-expanded={isOpen}
	{onclick}
	aria-label="메뉴"
	aria-controls={IDs.LAYOUT.SIDE_MENU}
>
	<span class="block h-[2px] w-6 rounded-[2px] bg-neutral-700"></span>
	<span class="block h-[2px] w-6 rounded-[2px] bg-neutral-700"></span>
	<span class="block h-[2px] w-6 rounded-[2px] bg-neutral-700"></span>
</button>

<style lang="scss">
	.btn_menu {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 6px;
		width: 48px;
		height: 48px;
		padding: 12px;
	}
</style>
