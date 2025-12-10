<script lang="ts">
	/**
	 * @prop size - 'sm' | 'md' | 'lg' (기본: 'md')
	 * @prop speed - 애니메이션 속도 ms (기본: 1000)
	 */

	interface Props {
		size?: 'sm' | 'md' | 'lg';
		speed?: number;
	}

	const { size = 'md', speed = 1000 }: Props = $props();

	const sizeConfig = {
		sm: {
			width: 'w-1',
			height: 'h-4',
			gap: 'gap-[3px]',
			radius: 'rounded-sm'
		},
		md: {
			width: 'w-2',
			height: 'h-8',
			gap: 'gap-1.5',
			radius: 'rounded'
		},
		lg: {
			width: 'w-3',
			height: 'h-12',
			gap: 'gap-2',
			radius: 'rounded-md'
		}
	};

	const config = $derived(sizeConfig[size]);
	const cssVarStyles = $derived(`--spinner-speed: ${speed}ms`);
</script>

<div
	class="spinner-brick-glow flex {config.gap}"
	style={cssVarStyles}
	role="status"
	aria-label="로딩 중"
>
	<span
		class="brick {config.width} {config.height} {config.radius}"
		style="--delay: 0"
	></span>
	<span
		class="brick {config.width} {config.height} {config.radius}"
		style="--delay: 1"
	></span>
	<span
		class="brick {config.width} {config.height} {config.radius}"
		style="--delay: 2"
	></span>
</div>

<style>
	.spinner-brick-glow {
		--speed: var(--spinner-speed, 1000ms);
	}

	.brick {
		background: rgb(var(--mint-500));
		animation: brick-glow var(--speed) ease-in-out infinite;
		animation-delay: calc(var(--delay) * 100ms);
	}

	@keyframes brick-glow {
		0%,
		100% {
			transform: translateY(0);
			opacity: 0.5;
			box-shadow: 0 0 5px rgba(27, 168, 150, 0.2);
		}
		50% {
			transform: translateY(-14px);
			opacity: 1;
			box-shadow:
				0 0 10px rgba(77, 208, 189, 0.35),
				0 0 18px rgba(27, 168, 150, 0.2),
				0 6px 16px rgba(27, 168, 150, 0.15);
		}
	}

	:global(.dark) .brick {
		background: rgb(var(--mint-400));
		animation-name: brick-glow-dark;
	}

	@keyframes brick-glow-dark {
		0%,
		100% {
			transform: translateY(0);
			opacity: 0.5;
			box-shadow: 0 0 6px rgba(77, 208, 189, 0.25);
		}
		50% {
			transform: translateY(-14px);
			opacity: 1;
			box-shadow:
				0 0 12px rgba(77, 208, 189, 0.5),
				0 0 22px rgba(77, 208, 189, 0.25),
				0 6px 18px rgba(77, 208, 189, 0.2);
		}
	}
</style>
