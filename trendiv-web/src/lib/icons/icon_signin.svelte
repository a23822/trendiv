<script lang="ts">
	export let width = '24';
	export let height = '24';
	export let className = '';
</script>

<svg
	class="{className} group-hover:stroke-alert h-5 w-5 shrink-0 overflow-visible stroke-gray-800 stroke-2 text-gray-400 transition-colors duration-300"
	{width}
	{height}
	viewBox="0 0 24 24"
	fill="none"
	stroke-linecap="round"
	stroke-linejoin="round"
	xmlns="http://www.w3.org/2000/svg"
>
	<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />

	<g class="arrow">
		<polyline points="16 17 21 12 16 7" />
		<line x1="21" y1="12" x2="9" y2="12" />
	</g>
</svg>

<style>
	@keyframes poke-right {
		0% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(3px);
		}
		100% {
			transform: translateX(0);
		}
	}

	:global(.btn_auth:hover) .arrow {
		animation: poke-right 0.5s ease-in-out;
	}
</style>
