import type { PageLoad } from './$types';
import type { Trend } from '$lib/types';
import { PUBLIC_API_URL } from '$env/static/public';

export const load: PageLoad = async ({ fetch }) => {
	try {
		// 1. 백엔드 API 호출 (도커로 띄운 서버)
		// limit=20: 최신 20개만 가져오기
		const apiUrl = PUBLIC_API_URL || 'http://127.0.0.1:3000';
		const res = await fetch(`${apiUrl}/api/trends?limit=20`);

		if (!res.ok) {
			throw new Error(`API Error: ${res.status}`);
		}

		const result = await res.json();

		if (result.success) {
			return {
				trends: result.data as Trend[]
			};
		}
		return { trends: [] };
	} catch (err) {
		console.error('❌ 데이터 로딩 실패:', err);
		return { trends: [] };
	}
};
