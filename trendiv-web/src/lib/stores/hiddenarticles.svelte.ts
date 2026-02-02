import { browser } from '$app/environment';
import { supabase } from '$lib/stores/db';
import type { Trend, HiddenArticle } from '$lib/types';
import { auth } from './auth.svelte.js';
import { SvelteSet } from 'svelte/reactivity';

// [필수] Svelte 5 전용 Set

class HiddenArticlesStore {
	// 일반 데이터 상태
	hiddenArticles = $state<HiddenArticle[]>([]);
	isLoading = $state(false);
	isReady = $state(false);

	// [수정] 내장 Set 대신 SvelteSet 사용 ($state 불필요)
	// .add, .delete 호출 시 즉시 반응형 업데이트가 발생합니다.
	recentlyHidden = new SvelteSet<string>();

	// 콜백 (페이지 이동 시 초기화 대상)
	onHide: ((hiddenLink: string) => void) | null = null;

	// 중복 클릭 방지용 (UI 렌더링과 무관하므로 일반 Set 유지)
	private processingUrls = new Set<string>();

	get list(): string[] {
		return this.hiddenArticles.map((h) => h.article_url);
	}

	// [로직] 숨김 상태이면서(AND) '방금 숨김' 목록에 없어야 완전히 화면에서 사라짐
	isFullyHidden(url: string): boolean {
		return this.isHidden(url) && !this.recentlyHidden.has(url);
	}

	isRecentlyHidden(url: string): boolean {
		return this.recentlyHidden.has(url);
	}

	// [중요] 페이지 이동 시 호출: 이전 페이지의 콜백 및 애니메이션 상태 초기화
	resetView() {
		this.recentlyHidden.clear(); // [수정] SvelteSet 메서드로 초기화
		this.onHide = null; // 잘못된 콜백 실행 방지
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
		// 토글 중 충돌 방지
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
			// === [CASE 1: 숨김 해제] ===
			if (this.isHidden(article.link)) {
				// 1. 목록 데이터 업데이트
				this.hiddenArticles = this.hiddenArticles.filter(
					(h) => h.article_url !== article.link
				);

				// 2. 애니메이션 상태 정리 (SvelteSet 메서드 사용)
				if (this.recentlyHidden.has(article.link)) {
					this.recentlyHidden.delete(article.link);
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
			}
			// === [CASE 2: 숨김 추가] ===
			else {
				// 1. [순서 중요] recentlyHidden 먼저 추가하여 애니메이션 트리거
				// SvelteSet.add는 즉시 반응성을 가집니다.
				this.recentlyHidden.add(article.link);

				const newHidden = {
					user_id: auth.user.id,
					article_url: article.link,
					article_title: article.title
				};

				// 임시 ID (-Time으로 고유성 확보)
				const tempId = -Date.now();
				const tempHidden: HiddenArticle = {
					...newHidden,
					id: tempId,
					created_at: new Date().toISOString()
				};

				// 2. 목록 업데이트
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
							h.article_url === article.link && h.id === tempId
								? (data as HiddenArticle)
								: h
						);
					}
				} catch (e) {
					console.error('관심없음 추가 오류:', e);
					// 롤백
					this.hiddenArticles = this.hiddenArticles.filter(
						(h) => h.article_url !== article.link
					);
					this.recentlyHidden.delete(article.link); // 롤백도 delete 사용
					this.fetchHiddenArticles();
				}
			}
		} finally {
			this.processingUrls.delete(article.link);

			// 숨김 상태일 때만 콜백 호출
			if (this.isHidden(article.link)) {
				this.onHide?.(article.link);
			}
		}
	}
}

export const hiddenArticles = new HiddenArticlesStore();
