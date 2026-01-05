export function formatDate(date: string | undefined | null): string {
	if (!date) return '';

	const parsed = new Date(date);
	if (isNaN(parsed.getTime())) return '';

	const now = Date.now();
	const diff = now - parsed.getTime();
	const isFuture = diff < 0;
	const absDiff = Math.abs(diff);

	const minutes = Math.floor(absDiff / (1000 * 60));
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	const suffix = isFuture ? '후' : '전';

	// 1. 1분 미만 (방금/곧)
	if (minutes < 1) {
		return isFuture ? '곧' : '방금 전';
	}

	// 2. 24시간 미만 (N시간 전/후)
	if (hours < 24) {
		return `${hours}시간 ${suffix}`;
	}

	// 3. 7일 미만 (N일 전/후)
	if (days < 7) {
		return `${days}일 ${suffix}`;
	}

	// 4. 그 외: YYYY.M.D 형식 (예: 2024.10.2)
	const year = parsed.getFullYear();
	const month = parsed.getMonth() + 1; // 월은 0부터 시작하므로 +1
	const day = parsed.getDate();

	return `${year}.${month}.${day}`;
}
