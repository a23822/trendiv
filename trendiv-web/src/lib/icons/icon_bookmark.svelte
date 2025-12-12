<script lang="ts">
	/**
	 * BookmarkIcon - 북마크 아이콘 컴포넌트
	 *
	 * @prop filled - 채워진 상태 여부
	 * @prop size - 아이콘 크기 (px 단위 숫자)
	 * @prop class - 추가 클래스
	 */

	interface Props {
		filled?: boolean;
		size?: number;
		class?: string;
	}

	let { filled = false, size = 16, class: className }: Props = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	fill={filled ? 'currentColor' : 'none'}
	stroke="currentColor"
	viewBox="0 0 24 24"
	aria-hidden="true"
>
	<path
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
	/>
</svg>
