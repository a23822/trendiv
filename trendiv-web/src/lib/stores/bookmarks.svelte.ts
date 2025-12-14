import { supabase } from '$lib/stores/db';
import type { Trend, Bookmark } from '$lib/types';
import { auth } from './auth.svelte.js';

class BookmarkStore {
	// 1. 상태 선언 ($state)
	bookmarks = $state<Bookmark[]>([]);
	isLoading = $state(false);

	constructor() {
		// $effect는 컴포넌트 외부(전역 스토어 초기화 시점)에서 사용할 수 없습니다.
		if (supabase) {
			supabase.auth.onAuthStateChange((event, session) => {
				if (session?.user) {
					// 세션이 있으면 해당 유저의 북마크를 가져옴
					// (auth.user가 아직 업데이트되기 전일 수 있으므로 session.user.id를 직접 사용)
					this.fetchBookmarks(session.user.id);
				} else {
					// 로그아웃 시 목록 초기화
					this.bookmarks = [];
				}
			});
		}
	}

	// 2. URL로 북마크 여부 확인
	isBookmarked(url: string) {
		return this.bookmarks.some((b) => b.article_url === url);
	}

	// 3. 북마크 목록 불러오기
	// userId 인자를 선택적으로 받도록 수정하여 유연성 확보
	async fetchBookmarks(userId?: string) {
		// 인자로 받은 ID가 없으면 현재 auth 스토어의 ID 사용
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

	// 4. 북마크 토글 로직
	async toggle(article: Trend) {
		if (!auth.user) {
			auth.openLoginModal();
			return;
		}

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
				this.fetchBookmarks(); // 실패 시 롤백(재조회)
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

				// 성공 시 임시 데이터를 실제 DB 데이터로 교체
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
	}
}

export const bookmarks = new BookmarkStore();
