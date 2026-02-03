import { browser } from '$app/environment';
import { supabase } from '$lib/stores/db';
import type { Trend, Bookmark } from '$lib/types';
import { auth } from './auth.svelte.js';

class BookmarkStore {
	// 데이터 상태
	bookmarks = $state<Bookmark[]>([]);
	isLoading = $state(false);

	// 콜백
	onUnbookmark: ((unbookmarkedLink: string) => void) | null = null;

	// 중복 클릭 방지
	private processingUrls = new Set<string>();

	get list(): string[] {
		return this.bookmarks.map((b) => b.article_url);
	}

	// 페이지 이동 시 초기화
	resetView() {
		this.onUnbookmark = null;
		this.processingUrls.clear();
	}

	constructor() {
		if (browser && supabase) {
			supabase.auth.onAuthStateChange((event, session) => {
				if (session?.user) {
					this.fetchBookmarks(session.user.id);
				} else {
					this.bookmarks = [];
				}
			});
		}
	}

	isBookmarked(url: string) {
		return this.bookmarks.some((b) => b.article_url === url);
	}

	async fetchBookmarks(userId?: string) {
		if (!supabase) return;

		const targetId = userId || auth.user?.id;
		if (!targetId || this.isLoading) return;

		this.isLoading = true;
		try {
			const { data, error } = await supabase
				.from('bookmarks')
				.select('*')
				.eq('user_id', targetId);

			if (error) throw error;
			if (data) this.bookmarks = data as Bookmark[];
		} catch (e) {
			console.error('북마크 로드 오류:', e);
		} finally {
			this.isLoading = false;
		}
	}

	async toggle(article: Trend) {
		if (!supabase) return;
		if (!auth.user) {
			auth.openLoginModal();
			return;
		}
		if (!article.link) {
			console.error('북마크 토글 실패: article.link가 없습니다.');
			return;
		}
		if (this.processingUrls.has(article.link)) return;

		this.processingUrls.add(article.link);

		try {
			if (this.isBookmarked(article.link)) {
				// === 북마크 해제 ===
				this.bookmarks = this.bookmarks.filter(
					(b) => b.article_url !== article.link
				);

				try {
					const { error } = await supabase
						.from('bookmarks')
						.delete()
						.match({ article_url: article.link, user_id: auth.user.id });

					if (error) throw error;
				} catch (e) {
					console.error('북마크 삭제 오류:', e);
					this.fetchBookmarks();
				}

				// 북마크 해제 콜백 호출 (버퍼 보충)
				this.onUnbookmark?.(article.link);
			} else {
				// === 북마크 추가 ===
				const newBookmark = {
					user_id: auth.user.id,
					article_url: article.link,
					article_title: article.title,
					article_date: article.date,
					article_source: article.source
				};

				const tempBookmark: Bookmark = {
					...newBookmark,
					id: -1,
					created_at: new Date().toISOString()
				} as Bookmark;
				this.bookmarks = [...this.bookmarks, tempBookmark];

				try {
					const { data, error } = await supabase
						.from('bookmarks')
						.insert(newBookmark)
						.select()
						.single();

					if (error) throw error;

					if (data) {
						this.bookmarks = this.bookmarks.map((b) =>
							b.article_url === article.link && b.id === -1
								? (data as Bookmark)
								: b
						);
					}
				} catch (e) {
					console.error('북마크 추가 오류:', e);
					this.bookmarks = this.bookmarks.filter(
						(b) => b.article_url !== article.link
					);
					this.fetchBookmarks();
				}
			}
		} finally {
			this.processingUrls.delete(article.link);
		}
	}
}

export const bookmarks = new BookmarkStore();
