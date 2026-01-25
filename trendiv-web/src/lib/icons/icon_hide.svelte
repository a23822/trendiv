<script lang="ts">
	/**
	 * IconHide - 관심없음/숨김 아이콘 컴포넌트
	 *
	 * @prop size - 아이콘 크기 (px 단위 숫자)
	 * @prop class - 추가 클래스
	 * @prop canVisible - true면 가로지르는 선 숨김 (눈 보이는 상태)
	 */

	interface Props {
		size?: number;
		class?: string;
		canVisible?: boolean;
	}

	let { size = 16, class: className, canVisible = false }: Props = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	fill="none"
	stroke="currentColor"
	viewBox="0 0 24 24"
	aria-hidden="true"
>
	<path
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
	/>
	<path
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
	/>

	<path
		class="transition-all duration-300 ease-in-out"
		style:opacity={canVisible ? 0 : 1}
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		d="M3 3l18 18"
	/>
</svg>
