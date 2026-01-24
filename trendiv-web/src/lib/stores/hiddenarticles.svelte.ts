import { supabase } from '$lib/stores/db';
import type { Trend, HiddenArticle } from '$lib/types';
import { auth } from './auth.svelte.js';

class HiddenArticlesStore {
	// 상태 선언
	hiddenArticles = $state<HiddenArticle[]>([]);
	isLoading = $state(false);

	constructor() {
		if (supabase) {
			supabase.auth.onAuthStateChange((event, session) => {
				if (session?.user) {
					this.fetchHiddenArticles(session.user.id);
				} else {
					this.hiddenArticles = [];
				}
			});
		}
	}

	/** URL로 관심없음 여부 확인 */
	isHidden(url: string): boolean {
		return this.hiddenArticles.some((h) => h.article_url === url);
	}

	/** 관심없음 목록 불러오기 */
	async fetchHiddenArticles(userId?: string) {
		const targetId = userId || auth.user?.id;

		if (!targetId || this.isLoading) return;

		this.isLoading = true;
		try {
			const { data, error } = await supabase
				.from('hidden_articles')
				.select('*')
				.eq('user_id', targetId);

			if (error) throw error;
			if (data) this.hiddenArticles = data as HiddenArticle[];
		} catch (e) {
			console.error('관심없음 로드 오류:', e);
		} finally {
			this.isLoading = false;
		}
	}

	/** 관심없음 토글 */
	async toggle(article: Trend) {
		if (!auth.user) {
			auth.openLoginModal();
			return;
		}

		if (this.isHidden(article.link)) {
			// 삭제 로직 (Optimistic UI)
			this.hiddenArticles = this.hiddenArticles.filter(
				(h) => h.article_url !== article.link
			);

			try {
				const { error } = await supabase
					.from('hidden_articles')
					.delete()
					.match({ article_url: article.link, user_id: auth.user.id });

				if (error) throw error;
			} catch (e) {
				console.error('관심없음 삭제 오류:', e);
				this.fetchHiddenArticles();
			}
		} else {
			// 추가 로직
			const newHidden = {
				user_id: auth.user.id,
				article_url: article.link,
				article_title: article.title
			};

			// 임시 데이터 추가 (Optimistic UI)
			const tempHidden: HiddenArticle = {
				...newHidden,
				id: -1,
				created_at: new Date().toISOString()
			};
			this.hiddenArticles = [...this.hiddenArticles, tempHidden];

			try {
				const { data, error } = await supabase
					.from('hidden_articles')
					.insert(newHidden)
					.select()
					.single();

				if (error) throw error;

				if (data) {
					this.hiddenArticles = this.hiddenArticles.map((h) =>
						h.article_url === article.link && h.id === -1
							? (data as HiddenArticle)
							: h
					);
				}
			} catch (e) {
				console.error('관심없음 추가 오류:', e);
				this.hiddenArticles = this.hiddenArticles.filter(
					(h) => h.article_url !== article.link
				);
				this.fetchHiddenArticles();
			}
		}
	}
}

export const hiddenArticles = new HiddenArticlesStore();
