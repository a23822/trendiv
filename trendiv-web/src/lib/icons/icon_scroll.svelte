<script lang="ts">
	interface Props {
		size?: number;
		strokeWidth?: number;
		className?: string;
	}
	let { size = 24, strokeWidth = 2, className }: Props = $props();

	const width = size * 0.6;
	const height = size;
	const borderRadius = width / 2;
	const dotWidth = size * 0.15;
	const dotHeight = size * 0.25;
</script>

<svg
	{width}
	{height}
	viewBox="0 0 14 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
>
	<rect
		x="1"
		y="1"
		width="12"
		height="22"
		rx="6"
		ry="6"
	/>
	<rect
		class="mouse_wheel"
		x="5.5"
		y="5"
		width="3"
		height="5"
		rx="1.5"
		fill="currentColor"
		stroke="none"
	/>
</svg>

<style>
	.mouse-wheel {
		animation: mouseScroll 1.5s ease-out infinite;
	}

	@keyframes mouseScroll {
		0% {
			opacity: 1;
			transform: translateY(0);
		}
		50% {
			opacity: 0.5;
			transform: translateY(4px);
		}
		100% {
			opacity: 0;
			transform: translateY(8px);
		}
	}
</style>
