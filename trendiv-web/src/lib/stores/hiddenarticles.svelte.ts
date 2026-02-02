import { browser } from '$app/environment';
import { supabase } from '$lib/stores/db';
import type { Trend, HiddenArticle } from '$lib/types';
import { auth } from './auth.svelte.js';
import { tick } from 'svelte';

class HiddenArticlesStore {
	// 일반 데이터 상태
	hiddenArticles = $state<HiddenArticle[]>([]);
	isLoading = $state(false);
	isReady = $state(false);

	// [핵심] $state 배열 사용 → 반응성 보장
	recentlyHidden = $state<string[]>([]);

	// 콜백 (페이지 이동 시 초기화 대상)
	onHide: ((hiddenLink: string) => void) | null = null;

	// 중복 클릭 방지용 (UI 렌더링과 무관하므로 일반 Set 유지)
	private processingUrls = new Set<string>();

	get list(): string[] {
		return this.hiddenArticles.map((h) => h.article_url);
	}

	// [로직] 숨김 상태이면서(AND) '방금 숨김' 목록에 없어야 완전히 화면에서 사라짐
	isFullyHidden(url: string): boolean {
		return this.isHidden(url) && !this.recentlyHidden.includes(url);
	}

	isRecentlyHidden(url: string): boolean {
		return this.recentlyHidden.includes(url);
	}

	// [중요] 페이지 이동 시 호출: 이전 페이지의 콜백 및 애니메이션 상태 초기화
	resetView() {
		this.recentlyHidden = [];
		this.onHide = null;
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

				// 2. 애니메이션 상태 정리
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
			}
			// === [CASE 2: 숨김 추가] ===
			else {
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

				// [핵심] 두 상태를 동시에 업데이트하여 하나의 렌더 사이클에서 처리
				// recentlyHidden에 먼저 추가한 새 배열 생성
				const newRecentlyHidden = [...this.recentlyHidden, article.link];
				const newHiddenArticles = [...this.hiddenArticles, tempHidden];

				// 두 상태를 연속으로 할당 (Svelte가 배칭 처리)
				this.recentlyHidden = newRecentlyHidden;
				this.hiddenArticles = newHiddenArticles;

				// tick()으로 DOM 업데이트 완료 대기
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
					// 롤백
					this.hiddenArticles = this.hiddenArticles.filter(
						(h) => h.article_url !== article.link
					);
					this.recentlyHidden = this.recentlyHidden.filter(
						(url) => url !== article.link
					);
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
