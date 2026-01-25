<script lang="ts">
	/**
	 * IconUser - 사용자/개인화 아이콘 컴포넌트 (듀얼톤 스타일)
	 *
	 * @prop size - 아이콘 크기 (px 단위 숫자)
	 * @prop class - 추가 클래스
	 */

	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 18, class: className }: Props = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	aria-hidden="true"
>
	<!-- 머리: 반투명 채움 + 라인 -->
	<circle
		cx="12"
		cy="8"
		r="4"
		fill="currentColor"
		opacity="0.3"
	/>
	<circle
		cx="12"
		cy="8"
		r="4"
		stroke="currentColor"
		stroke-width="2"
	/>

	<!-- 몸통: 반투명 채움 + 닫힌 stroke -->
	<path
		d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8H4z"
		fill="currentColor"
		opacity="0.3"
	/>
	<path
		d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8H4z"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
