<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		className?: string;
	}

	let { className }: Props = $props();

	let visualDark = $state(theme.isDark);
	let animatingTo = $state<'to-dark' | 'to-light' | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		return () => {
			if (timer) clearTimeout(timer);
		};
	});

	function handleToggle() {
		if (animatingTo) return;

		animatingTo = visualDark ? 'to-light' : 'to-dark';
		theme.toggle();

		timer = setTimeout(() => {
			visualDark = theme.isDark;
			animatingTo = null;
		}, 800);
	}
</script>

<button
	type="button"
	class={cn(
		'relative w-full transform-gpu overflow-hidden',
		'h-header-height',
		className
	)}
	class:dark={visualDark}
	class:to-dark={animatingTo === 'to-dark'}
	class:to-light={animatingTo === 'to-light'}
	onclick={handleToggle}
	aria-label={theme.isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
>
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-0"
	>
		<div class="bg absolute inset-0">
			<div class="bg-night absolute inset-0"></div>
		</div>

		<div class="cloud-wrapper cloud-1">
			<div class="cloud-inner absolute inset-0 rounded-full"></div>
			<div class="cloud-bright absolute inset-0 rounded-full"></div>
		</div>
		<div class="cloud-wrapper cloud-2">
			<div class="cloud-inner absolute inset-0 rounded-full"></div>
			<div class="cloud-bright absolute inset-0 rounded-full"></div>
		</div>
		<div class="cloud-wrapper cloud-3">
			<div class="cloud-inner absolute inset-0 rounded-full"></div>
			<div class="cloud-bright absolute inset-0 rounded-full"></div>
		</div>

		<div class="star star-1"></div>
		<div class="star star-2"></div>
		<div class="star star-3"></div>
		<div class="star star-4"></div>
		<div class="star star-5"></div>

		<div
			class="celestial absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
		>
			<svg
				width="48"
				height="48"
				viewBox="0 0 48 48"
				class="overflow-visible"
			>
				<defs>
					<mask id="moonMask">
						<circle
							cx="24"
							cy="24"
							r="24"
							fill="white"
						/>
						<circle
							cx="24"
							cy="24"
							r="20"
							fill="black"
							class="mask-hole"
						/>
					</mask>

					<linearGradient
						id="sunGrad"
						x1="0%"
						y1="0%"
						x2="100%"
						y2="100%"
					>
						<stop
							offset="0%"
							stop-color="#ffd93d"
						/>
						<stop
							offset="50%"
							stop-color="#ff9f1c"
						/>
						<stop
							offset="100%"
							stop-color="#ff6b35"
						/>
					</linearGradient>

					<linearGradient
						id="moonGrad"
						x1="0%"
						y1="0%"
						x2="100%"
						y2="100%"
					>
						<stop
							offset="0%"
							stop-color="#f5f5dc"
						/>
						<stop
							offset="50%"
							stop-color="#e8e8d0"
						/>
						<stop
							offset="100%"
							stop-color="#fffacd"
						/>
					</linearGradient>
				</defs>

				<g mask="url(#moonMask)">
					<circle
						cx="24"
						cy="24"
						r="24"
						class="body"
					/>
					<circle
						cx="24"
						cy="24"
						r="24"
						class="body-overlay"
					/>
					<circle
						cx="24"
						cy="24"
						r="24"
						class="body-bright"
					/>
				</g>
			</svg>
		</div>
	</div>
</button>

<style>
	/* 배경 */
	.bg {
		background: linear-gradient(180deg, #87ceeb 0%, #5cacee 60%, #4a90d9 100%);
	}
	.bg-night {
		background: linear-gradient(180deg, #0f0f23 0%, #16213e 60%, #1a1a2e 100%);
		opacity: 0;
	}
	.dark .bg-night {
		opacity: 1;
	}
	.to-dark .bg-night {
		animation: fadeIn 0.8s ease forwards;
	}
	.to-light .bg-night {
		animation: fadeOut 0.8s ease forwards;
	}

	/* 해/달 컨테이너 */
	.celestial {
		border-radius: 50%;
		transform: scale(1);
	}

	.celestial::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		box-shadow: 0 0 16px rgba(255, 200, 50, 0.7);
		z-index: -1;
		opacity: 1;
		transform: scale(1);
	}

	.dark .celestial::before {
		opacity: 0;
		transform: scale(0.5);
	}

	.dark .celestial {
		filter: drop-shadow(0 0 12px rgba(230, 230, 200, 0.6));
	}

	/* ☀️ 해가 될 때 (to-light) */
	.to-light .celestial::before {
		animation: sunGlowAppear 0.5s ease-out forwards;
	}
	.to-light .celestial {
		animation: moonShadowDisappear 0.5s ease forwards;
	}

	/* 🌙 달이 될 때 (to-dark) */
	.to-dark .celestial::before {
		opacity: 0;
		animation: none;
	}

	.to-dark .celestial {
		animation: moonShadowAppear 0.5s ease forwards;
	}

	/* ☀️ 해 글로우 등장 애니메이션 */
	@keyframes sunGlowAppear {
		0% {
			opacity: 0;
			transform: scale(0.5);
		}
		40% {
			opacity: 0;
			transform: scale(0.75);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* 🌙 달 그림자 등장/퇴장 */
	@keyframes moonShadowAppear {
		from {
			filter: drop-shadow(0 0 0 rgba(0, 0, 0, 0));
		}
		to {
			filter: drop-shadow(0 0 12px rgba(230, 230, 200, 0.6));
		}
	}

	@keyframes moonShadowDisappear {
		from {
			filter: drop-shadow(0 0 12px rgba(230, 230, 200, 0.6));
		}
		to {
			filter: drop-shadow(0 0 0 rgba(0, 0, 0, 0));
		}
	}

	/* 구름 */
	.cloud-wrapper {
		position: absolute;
		will-change: transform, opacity;
		opacity: 0.9;
	}
	.dark .cloud-wrapper {
		opacity: 0;
	}

	.cloud-1 {
		width: 60px;
		height: 20px;
		top: 20%;
		left: 10%;
	}
	.cloud-2 {
		width: 40px;
		height: 14px;
		top: 60%;
		right: 15%;
	}
	.cloud-3 {
		width: 30px;
		height: 10px;
		top: 30%;
		right: 25%;
	}

	.dark .cloud-1 {
		transform: translate(-20px, 20px);
	}
	.dark .cloud-2 {
		transform: translate(20px, 20px);
	}
	.dark .cloud-3 {
		transform: translate(10px, 20px);
	}

	.cloud-inner {
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.4) 0%,
			rgba(255, 255, 255, 0.9) 30%,
			rgba(255, 255, 255, 0.9) 70%,
			rgba(255, 255, 255, 0.4) 100%
		);
		animation: float 6s infinite ease-in-out;
	}
	.cloud-bright {
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.44) 0%,
			rgba(255, 255, 255, 0.99) 30%,
			rgba(255, 255, 255, 0.99) 70%,
			rgba(255, 255, 255, 0.44) 100%
		);
		opacity: 0;
		animation:
			cloudBrightness 3s ease-in-out infinite,
			float 6s infinite ease-in-out;
	}

	.cloud-2 .cloud-inner,
	.cloud-2 .cloud-bright {
		animation-delay: 1s;
	}
	.cloud-3 .cloud-inner,
	.cloud-3 .cloud-bright {
		animation-delay: 0.5s;
	}

	.to-dark .cloud-1 {
		animation: cloudToDark1 0.5s ease forwards;
	}
	.to-dark .cloud-2 {
		animation: cloudToDark2 0.5s ease forwards;
	}
	.to-dark .cloud-3 {
		animation: cloudToDark3 0.5s ease forwards;
	}
	.to-light .cloud-1 {
		animation: cloudToLight1 0.5s ease forwards;
	}
	.to-light .cloud-2 {
		animation: cloudToLight2 0.5s ease forwards;
	}
	.to-light .cloud-3 {
		animation: cloudToLight3 0.5s ease forwards;
	}

	@keyframes cloudToDark1 {
		from {
			opacity: 0.9;
			transform: translate(0, 0);
		}
		to {
			opacity: 0;
			transform: translate(-20px, 20px);
		}
	}
	@keyframes cloudToLight1 {
		from {
			opacity: 0;
			transform: translate(-20px, 20px);
		}
		to {
			opacity: 0.9;
			transform: translate(0, 0);
		}
	}
	@keyframes cloudToDark2 {
		from {
			opacity: 0.9;
			transform: translate(0, 0);
		}
		to {
			opacity: 0;
			transform: translate(20px, 20px);
		}
	}
	@keyframes cloudToLight2 {
		from {
			opacity: 0;
			transform: translate(20px, 20px);
		}
		to {
			opacity: 0.9;
			transform: translate(0, 0);
		}
	}
	@keyframes cloudToDark3 {
		from {
			opacity: 0.9;
			transform: translate(0, 0);
		}
		to {
			opacity: 0;
			transform: translate(10px, 20px);
		}
	}
	@keyframes cloudToLight3 {
		from {
			opacity: 0;
			transform: translate(10px, 20px);
		}
		to {
			opacity: 0.9;
			transform: translate(0, 0);
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
	@keyframes cloudBrightness {
		0%,
		100% {
			opacity: 0;
		}
		50% {
			opacity: 1;
		}
	}

	/* 별 */
	.star {
		position: absolute;
		background: radial-gradient(circle, #ffd700 0%, #ffc400 50%, #ffb347 100%);
		border-radius: 50%;
		box-shadow: 0 0 6px rgba(255, 215, 0, 0.8);
		opacity: 0;
		transform: scale(0);
	}
	.dark .star {
		opacity: 1;
		transform: scale(1);
		animation: twinkle 2s infinite ease-in-out;
	}

	.star-1 {
		width: 4px;
		height: 4px;
		top: 20%;
		left: 20%;
		animation-delay: 0s;
	}
	.star-2 {
		width: 3px;
		height: 3px;
		top: 70%;
		left: 15%;
		animation-delay: 0.1s;
	}
	.star-3 {
		width: 5px;
		height: 5px;
		top: 30%;
		right: 20%;
		animation-delay: 0.9s;
	}
	.star-4 {
		width: 4px;
		height: 4px;
		top: 80%;
		right: 15%;
		animation-delay: 0.5s;
	}
	.star-5 {
		width: 2px;
		height: 2px;
		top: 20%;
		left: 60%;
		animation-delay: 1.2s;
	}

	.to-dark .star {
		animation:
			starToDark 0.5s ease forwards,
			twinkle 2s infinite ease-in-out 0.5s;
	}
	.to-dark .star-1 {
		animation-delay: 0s, 0.5s;
	}
	.to-dark .star-2 {
		animation-delay: 0.1s, 0.6s;
	}
	.to-dark .star-3 {
		animation-delay: 0.2s, 1.4s;
	}
	.to-dark .star-4 {
		animation-delay: 0.15s, 1s;
	}
	.to-dark .star-5 {
		animation-delay: 0.25s, 1.7s;
	}
	.to-light .star {
		animation: starToLight 0.5s ease forwards;
	}

	@keyframes starToDark {
		from {
			opacity: 0;
			transform: scale(0);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	@keyframes starToLight {
		from {
			opacity: 1;
			transform: scale(1);
		}
		to {
			opacity: 0;
			transform: scale(0);
		}
	}
	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.6;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.3);
		}
	}

	/* 아이콘 내부 */
	.body {
		fill: url(#sunGrad);
	}
	.body-overlay {
		fill: url(#moonGrad);
		opacity: 0;
	}
	.dark .body-overlay {
		opacity: 1;
	}
	.to-dark .body-overlay {
		animation: fadeIn 0.5s ease forwards;
	}
	.to-light .body-overlay {
		animation: fadeOut 0.5s ease forwards;
	}

	.body-bright {
		fill: url(#sunGrad);
		opacity: 0;
		animation: pulse 3s ease-in-out infinite;
	}
	.dark .body-bright,
	.to-dark .body-bright {
		fill: url(#moonGrad);
		animation-duration: 4s;
	}
	.to-light .body-bright {
		fill: url(#sunGrad);
		animation-duration: 3s;
	}

	/* 마스크 애니메이션 */
	.mask-hole {
		transform-origin: center center;
		transform-box: fill-box;
		transform: translate(36px, -26px);
	}
	.dark .mask-hole {
		transform: translate(14px, -8px);
	}
	.to-dark .mask-hole {
		animation: maskToDark 0.5s ease forwards;
	}
	.to-light .mask-hole {
		animation: maskToLight 0.5s ease forwards;
	}

	@keyframes maskToDark {
		from {
			transform: translate(36px, -26px);
		}
		to {
			transform: translate(14px, -8px);
		}
	}
	@keyframes maskToLight {
		from {
			transform: translate(14px, -8px);
		}
		to {
			transform: translate(36px, -26px);
		}
	}

	/* 공통 */
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@keyframes fadeOut {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0;
		}
		50% {
			opacity: 0.4;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		*,
		.star,
		.cloud-wrapper,
		.celestial,
		.mask-hole {
			animation: none !important;
			transition: none !important;
		}
		.dark .bg-night,
		.dark .body-overlay,
		.dark .star {
			opacity: 1;
		}
		.dark .cloud-wrapper {
			opacity: 0;
		}
		.dark .mask-hole {
			transform: translate(14px, -8px);
		}
	}
</style>
