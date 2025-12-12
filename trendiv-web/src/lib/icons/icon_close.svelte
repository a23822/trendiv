<script lang="ts">
	interface Props {
		size?: number;
		strokeWidth?: number;
	}
	let { size = 24, strokeWidth = 2 }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
>
	<path d="M18 6 6 18" />
	<path d="m6 6 12 12" />
</svg>
