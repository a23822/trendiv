import { browser } from '$app/environment';
import { supabase } from '$lib/stores/db';
import type { Trend, Bookmark } from '$lib/types';
import { auth } from './auth.svelte.js';

class BookmarkStore {
	// 상태 선언
	bookmarks = $state<Bookmark[]>([]);
	isLoading = $state(false);

	// 중복 클릭 방지용 처리 중인 URL Set
	private processingUrls = new Set<string>();

	constructor() {
		// SSR 안전: 브라우저에서만 구독 설정
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

	// URL로 북마크 여부 확인
	isBookmarked(url: string) {
		return this.bookmarks.some((b) => b.article_url === url);
	}

	// 북마크 목록 불러오기
	async fetchBookmarks(userId?: string) {
		// supabase 가드
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

	// 북마크 토글 로직
	async toggle(article: Trend) {
		// supabase 가드
		if (!supabase) return;

		if (!auth.user) {
			auth.openLoginModal();
			return;
		}

		// 유효하지 않은 link 체크
		if (!article.link) {
			console.error('북마크 토글 실패: article.link가 없습니다.');
			return;
		}

		// 중복 클릭 방지
		if (this.processingUrls.has(article.link)) {
			return;
		}
		this.processingUrls.add(article.link);

		try {
			if (this.isBookmarked(article.link)) {
				// 삭제 로직 (Optimistic UI)
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
			} else {
				// 추가 로직
				const newBookmark = {
					user_id: auth.user.id,
					article_url: article.link,
					article_title: article.title,
					article_date: article.date,
					article_source: article.source
				};

				// 임시 데이터 추가 (Optimistic UI)
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
			// 처리 완료 후 Set에서 제거
			this.processingUrls.delete(article.link);
		}
	}
}

export const bookmarks = new BookmarkStore();
