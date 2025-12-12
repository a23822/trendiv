<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';

	interface Props {
		className?: string;
	}

	let { className }: Props = $props();
</script>

<button
	class="toggle {className}"
	class:dark={theme.isDark}
	onclick={theme.toggle}
	aria-label={theme.isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
	type="button"
>
	<div class="bg"></div>

	<div class="cloud-wrapper cloud-1">
		<div class="cloud-inner"></div>
	</div>
	<div class="cloud-wrapper cloud-2">
		<div class="cloud-inner"></div>
	</div>
	<div class="cloud-wrapper cloud-3">
		<div class="cloud-inner"></div>
	</div>

	<div class="star star-1"></div>
	<div class="star star-2"></div>
	<div class="star star-3"></div>
	<div class="star star-4"></div>
	<div class="star star-5"></div>

	<div class="celestial">
		<div class="sun-moon"></div>
	</div>
</button>

<style>
	@property --mask-size {
		syntax: '<percentage>';
		initial-value: 0%;
		inherits: true;
	}

	.toggle {
		position: relative;
		width: 100%;
		height: theme('spacing.header-height');
		border: none;
		cursor: pointer;
		overflow: hidden;
		padding: 0;
		border-radius: 0;
		--mask-size: 0%;
		transition: --mask-size 0.5s ease-in-out;
	}

	.toggle.dark {
		--mask-size: 50%;
	}

	.bg {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, #87ceeb 0%, #5cacee 60%, #4a90d9 100%);
	}

	.bg::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, #0f0f23 0%, #16213e 60%, #1a1a2e 100%);
		opacity: 0;
		transition: opacity 0.8s ease;
	}

	.dark .bg::after {
		opacity: 1;
	}

	.cloud-wrapper {
		position: absolute;
		transition:
			opacity 0.5s ease-in-out,
			transform 0.5s ease-in-out;
		opacity: 0.9;
	}

	.cloud-inner {
		width: 100%;
		height: 100%;
		border-radius: 99px;
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.4) 0%,
			rgba(255, 255, 255, 0.9) 30%,
			rgba(255, 255, 255, 0.9) 70%,
			rgba(255, 255, 255, 0.4) 100%
		);
		background-size: 200% 100%;
		animation:
			float 6s infinite ease-in-out,
			cloudShimmer 3s ease-in-out infinite;
	}

	.cloud-1 {
		width: 60px;
		height: 20px;
		top: 20%;
		left: 10%;
	}
	.cloud-1 .cloud-inner {
		animation-delay: 0s, 0s;
	}

	.cloud-2 {
		width: 40px;
		height: 14px;
		top: 60%;
		right: 15%;
	}
	.cloud-2 .cloud-inner {
		animation-direction: reverse;
		animation-delay: -2s, 1s;
	}

	.cloud-3 {
		width: 30px;
		height: 10px;
		top: 30%;
		right: 25%;
	}
	.cloud-3 .cloud-inner {
		animation-delay: -4s, 0.5s;
	}

	.dark .cloud-wrapper {
		opacity: 0;
	}

	.dark {
		.cloud-1 {
			transform: translate(-20px, 20px);
		}
		.cloud-2 {
			transform: translate(20px, 20px);
		}
		.cloud-3 {
			transform: translate(10px, 20px);
		}
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}

	@keyframes cloudShimmer {
		0%,
		100% {
			background-position: 0% 50%;
			filter: brightness(1);
		}
		50% {
			background-position: 100% 50%;
			filter: brightness(1.1);
		}
	}

	.star {
		position: absolute;
		background: radial-gradient(circle, #ffd700 0%, #ffc400 50%, #ffb347 100%);
		border-radius: 50%;
		opacity: 0;
		transform: scale(0);
		transition:
			opacity 0.5s ease,
			transform 0.5s ease;
		box-shadow: 0 0 4px rgba(255, 215, 0, 0.8);
	}

	.star-1 {
		width: 4px;
		height: 4px;
		top: 20%;
		left: 20%;
	}

	.star-2 {
		width: 3px;
		height: 3px;
		top: 70%;
		left: 15%;
	}

	.star-3 {
		width: 5px;
		height: 5px;
		top: 30%;
		right: 20%;
	}

	.star-4 {
		width: 4px;
		height: 4px;
		top: 80%;
		right: 15%;
	}

	.star-5 {
		width: 2px;
		height: 2px;
		top: 20%;
		left: 60%;
	}

	.dark .star {
		opacity: 1;
		transform: scale(1);
		animation: twinkle 2s infinite ease-in-out;
	}

	.dark .star-1 {
		animation-delay: 0s;
	}
	.dark .star-2 {
		animation-delay: 0.5s;
	}
	.dark .star-3 {
		animation-delay: 1.2s;
	}
	.dark .star-4 {
		animation-delay: 0.8s;
	}
	.dark .star-5 {
		animation-delay: 1.5s;
	}

	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.6;
			transform: scale(1);
			box-shadow: 0 0 4px rgba(255, 215, 0, 0.6);
		}
		50% {
			opacity: 1;
			transform: scale(1.3);
			box-shadow: 0 0 8px rgba(255, 215, 0, 0.9);
		}
	}

	.celestial {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 48px;
		height: 48px;
		transform: translate(-50%, -50%);
		transition: filter 0.5s ease;
		filter: drop-shadow(0 0 12px rgba(255, 200, 50, 0.7));
		z-index: 10;
	}

	.dark .celestial {
		filter: drop-shadow(0 0 12px rgba(230, 230, 200, 0.6));
	}

	.sun-moon {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: linear-gradient(135deg, #ffd93d 0%, #ff9f1c 50%, #ff6b35 100%);
		background-size: 200% 200%;
		animation: sunGlow 3s ease-in-out infinite;
		transition: background 0.5s ease;
		mask-image: radial-gradient(
			circle at 85% 15%,
			transparent var(--mask-size),
			black calc(var(--mask-size) + 1%)
		);
	}

	@keyframes sunGlow {
		0%,
		100% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
	}

	.dark .sun-moon {
		background: linear-gradient(135deg, #f5f5dc 0%, #e8e8d0 50%, #fffacd 100%);
		background-size: 200% 200%;
		animation: moonGlow 4s ease-in-out infinite;
	}

	@keyframes moonGlow {
		0%,
		100% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
	}
</style>
