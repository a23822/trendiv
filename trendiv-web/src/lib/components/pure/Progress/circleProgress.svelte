<script lang="ts">
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		score: number;
		max?: number;
		size?: number;
		strokeWidth?: number;
		class?: string;
	}

	let {
		score,
		max = 10,
		size = 40,
		strokeWidth = 4,
		class: className
	}: Props = $props();

	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;

	const progress = $derived(Math.min(Math.max(score / max, 0), 1));
	const dashOffset = $derived(circumference * (1 - progress));
</script>

<div
	class={cn('relative flex items-center justify-center', className)}
	style="width: {size}px; height: {size}px;"
>
	<svg
		width={size}
		height={size}
		viewBox="0 0 {size} {size}"
		class="-rotate-90"
	>
		<defs>
			<linearGradient
				id="scoreGradient"
				x1="0%"
				y1="0%"
				x2="100%"
				y2="100%"
			>
				<stop
					offset="0%"
					stop-color="var(--color-mint-500)"
				/>
				<stop
					offset="100%"
					stop-color="var(--color-mint-200)"
				/>
			</linearGradient>
		</defs>

		<!-- 배경 원 (트랙) -->
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke="var(--color-mint-50)"
			stroke-width={strokeWidth}
		/>

		<!-- 프로그레스 원 -->
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke="url(#scoreGradient)"
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={dashOffset}
			class="transition-all duration-500 ease-out"
		/>
	</svg>

	<!-- 중앙 숫자 -->
	<span class="text-mint-800 absolute text-sm font-semibold">
		{score}
	</span>
</div>
