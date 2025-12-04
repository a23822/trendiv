<script module>
	// 여러 컴포넌트가 동시에 열릴 때를 대비
	let lockCount = 0;
</script>

<script>
	$effect(() => {
		lockCount++;

		// 첫 번째 잠금 요청일 때만 실행
		if (lockCount === 1) {
			document.body.classList.add('scroll-locked');
		}

		return () => {
			lockCount--;

			if (lockCount === 0) {
				document.body.classList.remove('scroll-locked');
			}
		};
	});
</script>
