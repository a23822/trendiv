<script lang="ts">
	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 16, class: className = '' }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 16 16"
	fill="none"
	class={className}
>
	<path
		d="M2 3.5H14"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
	/>
	<path
		d="M4 8H12"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
	/>
	<path
		d="M6 12.5H10"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
	/>
</svg>
