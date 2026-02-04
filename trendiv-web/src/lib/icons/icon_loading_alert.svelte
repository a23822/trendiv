<script lang="ts">
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		size?: number;
		class?: string;
		backgroundColor?: string;
	}

	let {
		size = 120,
		class: className,
		backgroundColor = 'fill-bg-surface'
	}: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 120 120"
	fill="none"
	class={className}
>
	<!-- 뒤 카드 -->
	<g class="animate-float-back">
		<rect
			x="42"
			y="32"
			width="44"
			height="56"
			rx="6"
			fill="currentColor"
			stroke="currentColor"
			stroke-width="1.5"
			transform="rotate(-8, 64, 60)"
			class={cn(backgroundColor, 'stroke-gray-400')}
		/>
	</g>

	<!-- 앞 카드 -->
	<g class="animate-float-front">
		<rect
			x="34"
			y="36"
			width="44"
			height="56"
			rx="6"
			fill="white"
			stroke="currentColor"
			stroke-width="2"
			class={cn(backgroundColor, 'stroke-gray-400')}
		/>
		<!-- 경고 아이콘 -->
		<path
			d="M56 53L44 73H68L56 53Z"
			stroke="currentColor"
			stroke-width="2"
			fill="none"
			stroke-linejoin="round"
			class="stroke-alert"
		/>
		<line
			x1="56"
			y1="60"
			x2="56"
			y2="66"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			class="stroke-alert"
		/>
		<circle
			cx="56"
			cy="70"
			r="1.5"
			fill="transparent"
			class="fill-alert"
		/>
	</g>
</svg>

<style>
	@keyframes float-back {
		0%,
		100% {
			transform: translate(0, 0) rotate(-8deg);
		}
		50% {
			transform: translate(-3px, -8px) rotate(-10deg);
		}
	}

	@keyframes float-front {
		0%,
		100% {
			transform: translate(0, 0) rotate(0deg);
		}
		50% {
			transform: translate(0, -10px) rotate(2deg);
		}
	}

	.animate-float-back {
		animation: float-back 3s ease-in-out infinite;
	}

	.animate-float-front {
		animation: float-front 3s ease-in-out infinite 0.3s;
	}
</style>
