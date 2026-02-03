import { browser } from '$app/environment';
import { supabase } from '$lib/stores/db';
import type { Trend, HiddenArticle } from '$lib/types';
import { auth } from './auth.svelte.js';
import { tick } from 'svelte';

class HiddenArticlesStore {
	// 데이터 상태
	hiddenArticles = $state<HiddenArticle[]>([]);
	isLoading = $state(false);
	isReady = $state(false);

	// 애니메이션 상태 (전체 목록에서 숨김 추가 시 사용)
	recentlyHidden = $state<string[]>([]);

	// 콜백
	onHide: ((hiddenLink: string) => void) | null = null;
	onUnhide: ((unhiddenLink: string) => void) | null = null;

	// 중복 클릭 방지
	private processingUrls = new Set<string>();

	get list(): string[] {
		return this.hiddenArticles.map((h) => h.article_url);
	}

	// 완전히 숨김 상태 (애니메이션 완료)
	isFullyHidden(url: string): boolean {
		return this.isHidden(url) && !this.recentlyHidden.includes(url);
	}

	isRecentlyHidden(url: string): boolean {
		return this.recentlyHidden.includes(url);
	}

	// 페이지 이동 시 초기화
	resetView() {
		this.recentlyHidden = [];
		this.onHide = null;
		this.onUnhide = null;
		this.processingUrls.clear();
	}

	constructor() {
		if (browser && supabase) {
			supabase.auth.onAuthStateChange((event, session) => {
				if (session?.user) {
					this.fetchHiddenArticles(session.user.id);
				} else {
					this.hiddenArticles = [];
					this.isReady = true;
				}
			});
		} else if (browser) {
			this.isReady = true;
		}
	}

	isHidden(url: string): boolean {
		return this.hiddenArticles.some((h) => h.article_url === url);
	}

	async fetchHiddenArticles(userId?: string) {
		if (!supabase) {
			this.isReady = true;
			return;
		}
		if (this.processingUrls.size > 0) return;

		const targetId = userId || auth.user?.id;
		if (!targetId || this.isLoading) {
			if (!targetId) this.isReady = true;
			return;
		}

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
			this.isReady = true;
		}
	}

	async toggle(article: Trend) {
		if (!supabase) return;
		if (!auth.user) {
			auth.openLoginModal();
			return;
		}
		if (!article.link) return;
		if (this.processingUrls.has(article.link)) return;

		this.processingUrls.add(article.link);

		try {
			if (this.isHidden(article.link)) {
				// === 숨김 해제 ===
				this.hiddenArticles = this.hiddenArticles.filter(
					(h) => h.article_url !== article.link
				);

				// recentlyHidden에서도 제거
				if (this.recentlyHidden.includes(article.link)) {
					this.recentlyHidden = this.recentlyHidden.filter(
						(url) => url !== article.link
					);
				}

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

				// 숨김 해제 콜백 호출 (버퍼 보충)
				this.onUnhide?.(article.link);
			} else {
				// === 숨김 추가 ===
				const newHidden = {
					user_id: auth.user.id,
					article_url: article.link,
					article_title: article.title
				};

				const tempId = -Date.now();
				const tempHidden: HiddenArticle = {
					...newHidden,
					id: tempId,
					created_at: new Date().toISOString()
				};

				// 두 상태 동시 업데이트
				this.recentlyHidden = [...this.recentlyHidden, article.link];
				this.hiddenArticles = [...this.hiddenArticles, tempHidden];

				await tick();

				try {
					const { data, error } = await supabase
						.from('hidden_articles')
						.insert(newHidden)
						.select()
						.single();

					if (error) throw error;

					if (data) {
						this.hiddenArticles = this.hiddenArticles.map((h) =>
							h.article_url === article.link && h.id === tempId
								? (data as HiddenArticle)
								: h
						);
					}
				} catch (e) {
					console.error('관심없음 추가 오류:', e);
					this.hiddenArticles = this.hiddenArticles.filter(
						(h) => h.article_url !== article.link
					);
					this.recentlyHidden = this.recentlyHidden.filter(
						(url) => url !== article.link
					);
					this.fetchHiddenArticles();
				}

				// 숨김 추가 콜백 호출 (버퍼 보충)
				this.onHide?.(article.link);
			}
		} finally {
			this.processingUrls.delete(article.link);
		}
	}
}

export const hiddenArticles = new HiddenArticlesStore();
