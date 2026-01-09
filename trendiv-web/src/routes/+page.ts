import { PUBLIC_API_URL } from '$env/static/public';
import { supabase } from '$lib/stores/db';
import type { Trend } from '$lib/types';
import type { PageLoad } from './$types';

// supabase 클라이언트 가져오기

export const load: PageLoad = async ({ fetch }) => {
	// 1. 카테고리 가져오기 함수
	const fetchCategories = async () => {
		const { data, error } = await supabase
			.from('trend')
			.select('category')
			.eq('status', 'ANALYZED');

		if (error || !data) return [];

		const unique = [...new Set(data.map((d) => d.category))];
		return unique.filter(Boolean); // 혹시 모를 null/빈값 제거
	};

	try {
		const [trendsRes, categories] = await Promise.all([
			fetch(`${PUBLIC_API_URL || 'http://127.0.0.1:3000'}/api/trends?limit=20`),
			fetchCategories()
		]);

		let trends: Trend[] = [];
		if (trendsRes.ok) {
			const result = await trendsRes.json();
			if (result.success) trends = result.data;
		}

		// 3. 페이지로 데이터 전달
		return {
			trends,
			categories
		};
	} catch (err) {
		console.error('❌ 데이터 로딩 실패:', err);
		return { trends: [], categories: [] };
	}
};
