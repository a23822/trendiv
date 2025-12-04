<script lang="ts">
	import { closeModal } from '$lib/stores/modal';

	// 1. Props에 onConfirm(실행할 함수)과 confirmText(버튼 이름) 추가
	interface Props {
		tabs?: { title: string; content: string }[];
		confirmText?: string;
		onConfirm?: () => void; // 이 함수가 있으면 확인 버튼이 생김
	}

	let { tabs = [], confirmText = '확인', onConfirm }: Props = $props();
	let activeIndex = $state(0);

	// 확인 버튼 클릭 핸들러
	function handleConfirm() {
		if (onConfirm) onConfirm(); // 전달받은 함수(로그인) 실행
		closeModal(); // 모달 닫기
	}
</script>

<div class="modal-overlay" onclick={closeModal}>
	<div class="modal-box" onclick={(e) => e.stopPropagation()}>
		{#if tabs.length > 1}{/if}

		<div class="scroll-content"></div>

		<div class="modal-footer">
			{#if onConfirm}
				<button class="btn-cancel" onclick={closeModal}>취소</button>
				<button class="btn-confirm" onclick={handleConfirm}>
					{confirmText}
				</button>
			{:else}
				<button class="btn-close" onclick={closeModal}>닫기</button>
			{/if}
		</div>
	</div>
</div>

<style>
	/* ... 배경 및 박스 스타일은 기존 유지 ... */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 9999;
	}
	.modal-box {
		background: white;
		width: 400px;
		max-width: 90%;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	/* 탭 스타일 */
	.tabs-header {
		display: flex;
		background: #f1f1f1;
		border-bottom: 1px solid #ddd;
	}
	.tabs-header button {
		flex: 1;
		padding: 12px;
		border: none;
		background: transparent;
		cursor: pointer;
		color: #666;
		font-weight: bold;
	}
	.tabs-header button.active {
		background: white;
		color: #333;
		border-bottom: 2px solid #007bff;
	}
	.single-title {
		margin: 0;
		padding: 15px;
		text-align: center;
		background: #f8f9fa;
		border-bottom: 1px solid #eee;
	}

	/* 👇 여기가 핵심! PolicyViewer에 있던 스타일을 가져왔습니다 */
	.scroll-content {
		padding: 20px;
		max-height: 400px; /* 이 높이를 넘어가면 스크롤 생성 */
		overflow-y: auto; /* 세로 스크롤 */
		font-size: 14px;
		line-height: 1.6;
		color: #333;
		white-space: pre-wrap; /* 줄바꿈 유지 */
	}

	.modal-footer {
		padding: 10px;
		text-align: center;
		border-top: 1px solid #eee;
	}
	.btn-close {
		padding: 8px 20px;
		cursor: pointer;
		background: #333;
		color: white;
		border: none;
		border-radius: 4px;
	}
	/* 버튼 스타일 추가 */
	.modal-footer {
		display: flex;
		gap: 10px;
		justify-content: center;
		padding: 15px;
		border-top: 1px solid #eee;
	}

	.btn-cancel {
		padding: 10px 20px;
		border: 1px solid #ddd;
		background: white;
		border-radius: 6px;
		cursor: pointer;
	}
	.btn-close {
		padding: 10px 20px;
		background: #333;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	/* 눈에 띄는 색상으로 */
	.btn-confirm {
		padding: 10px 20px;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 6px;
		font-weight: bold;
		cursor: pointer;
	}
	.btn-confirm:hover {
		background: #0056b3;
	}
</style>
