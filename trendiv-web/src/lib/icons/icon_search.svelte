<script lang="ts">
	interface Props {
		size?: number;
		strokeWidth?: number;
		className?: string;
	}
	let { size = 24, strokeWidth = 2, className }: Props = $props();
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
	class={className}
>
	<circle
		cx="11"
		cy="11"
		r="8"
	/>
	<path d="m21 21-4.3-4.3" />
</svg>
