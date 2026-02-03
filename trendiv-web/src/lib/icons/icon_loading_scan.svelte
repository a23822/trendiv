<script lang="ts">
	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 120, class: className }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 120 120"
	fill="none"
	class={className}
>
	<rect
		x="32"
		y="36"
		width="56"
		height="48"
		rx="8"
		stroke="currentColor"
		stroke-width="2"
		fill="none"
		class="text-gray-400"
	/>
	<line
		x1="40"
		y1="52"
		x2="80"
		y2="52"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		class="text-gray-400"
	/>
	<line
		x1="40"
		y1="60"
		x2="72"
		y2="60"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		class="text-gray-400"
	/>
	<line
		x1="40"
		y1="68"
		x2="76"
		y2="68"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		class="text-gray-400"
	/>
	<line
		x1="32"
		y1="60"
		x2="88"
		y2="60"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		class="animate-scan text-primary"
	/>
</svg>

<style>
	@keyframes scan {
		0% {
			transform: translateY(-20px);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		80% {
			opacity: 1;
		}
		100% {
			transform: translateY(20px);
			opacity: 0;
		}
	}

	.animate-scan {
		animation: scan 2s ease-in-out infinite;
	}
</style>
