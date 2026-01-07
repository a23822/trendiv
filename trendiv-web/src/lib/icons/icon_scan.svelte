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
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	{stroke}
	stroke-width={strokeWidth}
	class={className}
	><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"
	></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path
		d="M7 21H5a2 2 0 0 1-2-2v-2"
	></path><circle
		cx="12"
		cy="12"
		r="3"
	></circle><path d="m16 16-1.9-1.9"></path></svg
>
