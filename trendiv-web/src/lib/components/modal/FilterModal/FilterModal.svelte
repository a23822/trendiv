<script lang="ts">
	import ModalLayout from '$lib/components/modal/ModalLayout.svelte';
	import { CommonStyles } from '$lib/constants/styles';
	import { modal } from '$lib/stores/modal.svelte.js';
	import { cn } from '$lib/utils/ClassMerge';

	interface Props {
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	// 닫기 핸들러 (적용 버튼 등에서 사용)
	function close() {
		open = false;
	}
</script>

{#snippet headerComponent()}
	<h2 class="text-xl font-bold text-gray-800">필터</h2>
{/snippet}

{#snippet footerComponent()}
	<div
		class={cn(
			'flex items-center justify-end gap-3',
			'border-border-default border-t',
			'px-5 py-4'
		)}
	>
		<button
			type="button"
			onclick={close}
			class={cn(
				'rounded-lg px-4 py-2',
				'bg-mint-500 text-white',
				'hover:bg-mint-600',
				CommonStyles.DEFAULT_TRANSITION
			)}
		>
			적용
		</button>
	</div>
{/snippet}

<ModalLayout
	bind:open
	onclose={() => modal.close()}
	{headerComponent}
	{footerComponent}
>
	<div class="px-5 py-4">
		<p class="text-sm text-gray-500">
			여기에 필터 옵션들이 들어갑니다.<br />
			내용이 길어지면 자동으로 스크롤됩니다.
		</p>
	</div>
</ModalLayout>
