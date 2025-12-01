<script lang="ts">
	export let onClick: () => void;
	export let className = '';
</script>

<button
	type="button"
	class="group flex h-[60px] w-[60px] items-center justify-center active:scale-95 {className}"
	aria-label="닫기"
	on:click={onClick}
>
	<span
		class="relative block h-10 w-10 rounded-full transition-colors duration-200 ease-in-out group-hover:bg-slate-100 group-hover:shadow-lg"
	>
		<span
			class="absolute left-1/2 top-1/2 h-[2px] w-5 origin-center -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-slate-100 drop-shadow-lg transition-colors duration-300 ease-in-out group-hover:bg-slate-700"
		></span>
		<span
			class="absolute left-1/2 top-1/2 h-[2px] w-5 origin-center -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-slate-100 drop-shadow-lg transition-colors duration-300 group-hover:bg-slate-700"
		></span>
	</span>
</button>
