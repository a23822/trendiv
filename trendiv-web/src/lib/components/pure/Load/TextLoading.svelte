<script lang="ts">
	interface Props {
		text?: string;
		class?: string;
		backgroundColor?: string;
	}

	let { text = 'Loading', class: className = '', backgroundColor = '#000' }: Props = $props();
</script>

<div class="inline-flex items-center font-mono {className}" style="--dots-bg: {backgroundColor};">
	<span class="opacity-60">&lt;</span>{text}<span class="dots-wrapper">...</span><span
		class="spin-slash"
	></span><span class="opacity-60">&gt;</span>
</div>

<style lang="scss">
	.dots-wrapper {
		position: relative;
	}

	.dots-wrapper::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 3ch;
		background-color: var(--dots-bg);
		animation: reveal 1.4s steps(5) infinite;
	}

	@keyframes reveal {
		0% {
			width: 3ch;
		}
		100% {
			width: 0%;
		}
	}

	.spin-slash {
		display: inline-block;
		width: 1ch;
		text-align: center;
	}

	.spin-slash::after {
		content: '/';
		animation: spin-text 0.5s steps(8) infinite;
	}

	@keyframes spin-text {
		0% {
			content: '/';
		}
		25% {
			content: '—';
		}
		50% {
			content: '\\';
		}
		75% {
			content: '|';
		}
	}
</style>
