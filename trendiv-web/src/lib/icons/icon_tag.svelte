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
		d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"
	/>
	<path d="M7 7h.01" />
</svg>
