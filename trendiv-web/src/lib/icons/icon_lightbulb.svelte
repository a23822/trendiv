<script lang="ts">
	interface Props {
		class?: string;
		size?: number;
		stroke?: string;
		strokeWidth?: number;
	}

	let {
		class: className,
		size = 24,
		stroke = 'currentColor',
		strokeWidth = 2
	}: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	fill="none"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	class={className}
	aria-hidden="true"
	{stroke}
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
>
	<path
		d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
	/>
	<path d="M9 18h6" />
	<path d="M10 22h4" />
</svg>
