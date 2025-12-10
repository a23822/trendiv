<script lang="ts">
	/**
	 * TypingDotsSpinner - 타이핑 도트 로더
	 *
	 * @prop size - 'sm' | 'md' | 'lg' (기본: 'md')
	 * @prop withBackground - 배경 박스 표시 여부 (기본: true)
	 */

	interface Props {
		size?: 'sm' | 'md' | 'lg';
		withBackground?: boolean;
	}

	const { size = 'md', withBackground = true }: Props = $props();

	const sizeConfig = {
		sm: {
			dot: 'w-1.5 h-1.5',
			gap: 'gap-1',
			wrapper: 'px-3 py-2 rounded-lg'
		},
		md: {
			dot: 'w-2 h-2',
			gap: 'gap-1.5',
			wrapper: 'px-5 py-3 rounded-[20px]'
		},
		lg: {
			dot: 'w-3 h-3',
			gap: 'gap-2',
			wrapper: 'px-6 py-4 rounded-3xl'
		}
	};

	const config = $derived(sizeConfig[size]);
</script>

<div
	class="inline-flex items-center {config.gap} {withBackground ? `${config.wrapper} bg-mint-50 dark:bg-mint-900/20` : ''}"
	role="status"
	aria-label="로딩 중"
>
	<span class="typing-dot {config.dot} rounded-full bg-mint-500 dark:bg-mint-400"></span>
	<span class="typing-dot {config.dot} rounded-full bg-mint-500 dark:bg-mint-400"></span>
	<span class="typing-dot {config.dot} rounded-full bg-mint-500 dark:bg-mint-400"></span>
</div>

<style lang="scss">
	// 타이핑 도트 애니메이션
@keyframes typing-bounce {
	0%,
	60%,
	100% {
		transform: translateY(0);
	}
	30% {
		transform: translateY(-8px);
	}
}

.typing-dot {
	animation: typing-bounce 1.4s ease-in-out infinite;

	&:nth-child(1) {
		animation-delay: 0ms;
	}
	&:nth-child(2) {
		animation-delay: 200ms;
	}
	&:nth-child(3) {
		animation-delay: 400ms;
	}
}
</style>