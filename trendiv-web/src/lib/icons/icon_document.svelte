<script lang="ts">
	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 16, class: className = '' }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 16 16"
	fill="none"
	class={className}
>
	<rect
		x="4"
		y="1"
		width="10"
		height="12"
		rx="1.5"
		stroke="currentColor"
		stroke-width="1.5"
	/>
	<path
		d="M2 4V13C2 13.8284 2.67157 14.5 3.5 14.5H10"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
	/>
	<path
		d="M6.5 4.5H11.5"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
	/>
	<path
		d="M6.5 7.5H10"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
	/>
</svg>
