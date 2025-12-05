<script lang="ts">
	interface Props {
		onclick?: () => void;
		className?: string;
		variant?: 'normal' | 'inverted';
		size?: number;
	}

	let { onclick, className = '', variant = 'normal', size = 60 }: Props = $props();

	// 1. 내부 원 크기: 전체의 약 66% (40px / 60px)
	const innerSize = $derived(size * 0.66);
	// 2. X자 선 길이: 전체의 약 33% (20px / 60px)
	const lineLength = $derived(size * 0.33);
	// 3. 선 두께: 크기가 작아지면 얇게, 커지면 두껍게 (최소 2px)
	const thickness = $derived(Math.max(2, size * 0.03));

	const styles = {
		normal: {
			line: 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-800 group-hover:dark:bg-gray-100',
			bg: 'group-hover:bg-gray-100 group-hover:dark:bg-gray-800',
			hoverShadow: 'group-hover:shadow-md'
		},
		inverted: {
			line: 'bg-gray-800 group-hover:bg-gray-100 group-hover:dark:bg-gray-100',
			bg: 'group-hover:bg-gray-800 group-hover:dark:bg-gray-800',
			hoverShadow: 'group-hover:shadow-lg'
		}
	};

	const currentStyle = styles[variant];
</script>

<button
	type="button"
	class="group flex items-center justify-center active:scale-95 {className}"
	style="width: {size}px; height: {size}px;"
	aria-label="닫기"
	{onclick}
>
	<span
		class="relative block rounded-full drop-shadow-lg transition-all duration-200 ease-in-out {currentStyle.bg} {currentStyle.hoverShadow}"
		style="width: {innerSize}px; height: {innerSize}px;"
	>
		<span
			class="absolute left-1/2 top-1/2 origin-center -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full drop-shadow-md transition-colors duration-300 ease-in-out {currentStyle.line}"
			style="width: {lineLength}px; height: {thickness}px;"
		></span>
		<span
			class="absolute left-1/2 top-1/2 origin-center -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full drop-shadow-md transition-colors duration-300 ease-in-out {currentStyle.line}"
			style="width: {lineLength}px; height: {thickness}px;"
		></span>
	</span>
</button>
