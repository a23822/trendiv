<script lang="ts">
	import AgreementCheckBoxGroup from '$lib/components/pure/CheckBox/AgreementCheckBoxGroup.svelte';
	import { IDs } from '$lib/constants/ids';
	import { cn } from '$lib/utils/ClassMerge';
	import type { Component } from 'svelte';

	interface Agreement {
		id: string;
		text: string;
		required: boolean;
	}

	interface Props {
		onCancel: () => void;
		onConfirm: () => void;
		confirmText?: string;
		confirmIcon?: Component;
		agreements?: Agreement[];
	}

	let {
		onCancel,
		onConfirm,
		confirmText = '확인',
		confirmIcon: ConfirmIcon,
		agreements = []
	}: Props = $props();

	// 1. AgreementList가 사용할 데이터 포맷으로 변환 (초기화)
	// AgreementList 내부에서 checked를 변경하면 items 배열도 같이 업데이트됩니다.
	let items = $state(
		agreements.map((a) => ({
			id: a.id,
			label: a.text,
			checked: false, // 초기값 false
			required: a.required
		}))
	);

	// 2. 필수 항목 체크 여부 확인 (버튼 활성화용)
	// items 배열의 변화를 감지하여 계산합니다.
	let isAllRequiredChecked = $derived(
		items.filter((i) => i.required).every((i) => i.checked)
	);

	function handleConfirm() {
		if (isAllRequiredChecked) onConfirm();
	}
</script>

<div>
	{#if agreements.length > 0}
		<AgreementCheckBoxGroup
			className="mb-4"
			accordianId={IDs.MODAL.AGREEMENT_CHECKBOX_GROUP}
			bind:items
		/>
	{/if}
	<div class={cn('flex justify-center gap-2')}>
		<button
			class={cn(
				'h-[52px] shrink-0 rounded-xl px-6',
				'bg-gray-300/80',
				'text-xl font-bold text-gray-600',
				'transition-colors duration-300 ease-in-out',
				'hover:bg-gray-400/90'
			)}
			onclick={onCancel}
		>
			취소
		</button>

		<button
			class={cn(
				'flex items-center justify-center gap-2 overflow-hidden',
				'h-[52px] flex-1 rounded-xl px-2',
				'bg-gray-800/90',
				'text-[clamp(1rem,0.9rem+0.5vw,1.25rem)]',
				'text-gray-0/95 font-semibold',
				'transition-colors duration-300 ease-in-out',
				`${isAllRequiredChecked ? 'hover:text-gray-0 hover:bg-gray-900 hover:font-bold' : 'bg-gray-500/90 text-gray-300/80'}`
			)}
			onclick={handleConfirm}
			disabled={!isAllRequiredChecked}
		>
			{#if ConfirmIcon}
				<ConfirmIcon class="h-5 w-5 shrink-0 fill-current" />
			{/if}
			<span class="truncate">
				{confirmText}
			</span>
		</button>
	</div>
</div>
