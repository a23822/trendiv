<script module>
	// 여러 컴포넌트가 동시에 열릴 때를 대비
	let lockCount = 0;
</script>

<script>
	$effect(() => {
		lockCount++;

		// 첫 번째 잠금 요청일 때만 실행
		if (lockCount === 1) {
			const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

			if (scrollbarWidth > 0) {
				document.body.style.paddingRight = `${scrollbarWidth}px`;
			}

			document.body.classList.add('overflow-hidden');
		}

		return () => {
			lockCount--;

			if (lockCount === 0) {
				document.body.style.paddingRight = '';
				document.body.classList.remove('overflow-hidden');
			}
		};
	});
</script>
