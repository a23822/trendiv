<script lang="ts">
	import { cn } from '$lib/utils/ClassMerge';

	interface AgreementItem {
		id: string;
		label: string;
		checked: boolean;
		required?: boolean;
	}

	interface Props {
		items: AgreementItem[];
		className?: string;
		accordianId?: string;
	}

	let { items = $bindable([]), className = '', accordianId }: Props = $props();

	// 전체 동의 여부 (자동 계산)
	const isAllChecked = $derived(
		items.length > 0 && items.every((i) => i.checked)
	);

	let isCollapsed = $state(false);

	$effect(() => {
		isCollapsed = isAllChecked;
	});

	// 전체 동의 핸들러 (Input change 이벤트)
	function handleAllChange(e: Event) {
		const checked = (e.target as HTMLInputElement).checked;
		items = items.map((item) => ({ ...item, checked }));
	}

	function toggleAccordion() {
		isCollapsed = !isCollapsed;
	}
</script>

{#snippet checkbox(checked: boolean)}
	<div
		class={cn(
			'check-wrapper',
			'relative h-4 w-4 shrink-0 rounded-full',
			'peer-focus-visible:ring-primary peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2',
			{ checked }
		)}
	>
		<div class="ring-pulse"></div>
		<div
			class={cn(
				'absolute inset-0',
				'transition-colors duration-300 ease-in-out',
				'rounded-full border-2',
				`${checked ? 'border-forest-300' : 'border-gray-300/30'}`
			)}
		></div>
		<div
			class={cn(
				'check-circle',
				'absolute inset-0 rounded-full',
				'bg-forest-400/70'
			)}
		></div>
		<svg
			class={cn(
				'absolute inset-0',
				'h-4 w-4 p-0.5',
				'transition-all duration-300 ease-in-out',
				`${checked ? 'text-gray-0-fixed scale-90' : 'text-gray-0-fixed/30 scale-50 opacity-0'}`
			)}
			viewBox="0 0 24 24"
			fill="none"
		>
			<path
				d="M4 12.5L9 17.5L20 6.5"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</div>
{/snippet}

<div
	class={cn(
		'overflow-hidden rounded-lg border',
		'transition-all duration-300',
		`${isAllChecked ? 'border-mint-200 shadow-md' : 'border-mint-100'}`,
		className
	)}
>
	<div class={cn('flex w-full items-center', 'bg-forest-100/50 p-1')}>
		<label
			class={cn(
				'flex flex-1 items-center gap-3',
				'p-2',
				'cursor-pointer',
				'group'
			)}
		>
			<input
				type="checkbox"
				class="peer sr-only"
				checked={isAllChecked}
				onchange={handleAllChange}
			/>

			{@render checkbox(isAllChecked)}

			<span
				class={cn(
					'text-forest-600 text-xs font-semibold',
					'group-hover:text-forest-700 group-hover:font-bold',
					'transition-colors duration-300 ease-in-out'
				)}
			>
				{isAllChecked ? '모두 동의 완료 ✓' : '전체 동의하기'}
			</span>
		</label>

		<button
			type="button"
			class={cn(
				'flex items-center justify-center',
				'h-8 w-8 rounded-full',
				'text-forest-600',
				'transition-colors duration-300 ease-in-out',
				'hover:text-forest-700 hover:bg-forest-200/50'
			)}
			onclick={toggleAccordion}
			aria-expanded={!isCollapsed}
			aria-label={isCollapsed ? '동의 체크박스 펼치기' : '동의 체크박스 접기'}
			aria-controls={accordianId}
		>
			<svg
				class={cn(
					'h-3 w-3',
					'transition-transform duration-300 ease-in-out',
					`${isCollapsed && 'rotate-180'}`
				)}
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 9l-7 7-7-7"
				/>
			</svg>
		</button>
	</div>

	<div
		id={accordianId}
		class={cn(
			'accordion',
			`${isCollapsed && 'collapsed'}`,
			'border-mint-100 border-t',
			'bg-gray-0'
		)}
	>
		<div>
			<div class="flex flex-col">
				{#each items as item}
					<label
						class={cn(
							'group',
							'flex w-full cursor-pointer items-center gap-3',
							'p-3',
							'transition-colors duration-300 ease-in-out',
							'hover:bg-forest-100/20'
						)}
					>
						<input
							type="checkbox"
							class="peer sr-only"
							bind:checked={item.checked}
						/>

						{@render checkbox(item.checked)}

						<span
							class={cn(
								'flex-1 text-xs text-gray-700/90 select-none',
								'transition-all duration-300 ease-in-out',
								'group-hover:text-gray-900'
							)}
						>
							{item.label}
						</span>
					</label>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.accordion {
		display: grid;
		grid-template-rows: 1fr;
		transition:
			0.3s grid-template-rows ease-in-out,
			0.5s opacity ease-in-out;
	}
	.accordion.collapsed {
		grid-template-rows: 0fr;
		opacity: 0;
	}
	.accordion > div {
		overflow: hidden;
		align-self: start;
	}

	@keyframes bounceIn {
		0% {
			transform: scale(0);
		}
		40% {
			transform: scale(1.3);
		}
		70% {
			transform: scale(0.9);
		}
		100% {
			transform: scale(1);
		}
	}
	@keyframes rippleOut {
		0% {
			transform: scale(1);
			opacity: 0.5;
		}
		100% {
			transform: scale(1.6);
			opacity: 0;
		}
	}

	.check-circle {
		transform: scale(0);
	}
	.checked .check-circle {
		animation: bounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	.ring-pulse {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 2px solid rgb(var(--primary));
		opacity: 0;
		pointer-events: none;
	}
	.checked .ring-pulse {
		animation: rippleOut 0.7s ease-out;
	}
</style>
