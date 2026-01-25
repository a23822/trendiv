import { browser } from '$app/environment';
import AgreementModalBottom from '$lib/components/modal/AgreementModalBottom.svelte';
import NoticeModal from '$lib/components/modal/NoticeModal.svelte';
import { TERMS_TEXT, PRIVACY_TEXT } from '$lib/constants/policy';
import IconLogoGoogle from '$lib/icons/icon_logo_google.svelte';
import { supabase } from '$lib/stores/db';
import { modal } from '$lib/stores/modal.svelte.js';
import type { User } from '@supabase/supabase-js';

class AuthStore {
	// 상태 선언
	user = $state<User | null>(null);
	avatarColor = $state<string>('#fff');

	constructor() {
		// SSR 안전: 브라우저에서만 구독 설정
		if (browser && supabase) {
			supabase.auth.onAuthStateChange((event, session) => {
				this.user = session?.user || null;
				this.updateAvatarColor();
			});
		}
	}

	// 아바타 색상 로직
	private updateAvatarColor() {
		if (this.user && !this.user.user_metadata?.avatar_url) {
			const colors = [
				'#FF6B6B',
				'#4ECDC4',
				'#45B7D1',
				'#96CEB4',
				'#FFEEAD',
				'#D4A5A5',
				'#9B59B6',
				'#3498DB'
			];
			this.avatarColor = colors[Math.floor(Math.random() * colors.length)];
		} else {
			this.avatarColor = '#fff';
		}
	}

	// 로그인 모달 열기
	openLoginModal() {
		modal.open(NoticeModal, {
			title: '서비스 이용 동의',
			confirmText: 'Google로 시작하기',
			tabs: [
				{ title: '이용약관', content: TERMS_TEXT },
				{ title: '개인정보처리방침', content: PRIVACY_TEXT }
			],
			bottomComponent: AgreementModalBottom,
			bottomProps: {
				confirmIcon: IconLogoGoogle,
				agreements: [
					{ id: 'terms', text: '[필수] 이용약관 동의', required: true },
					{
						id: 'privacy',
						text: '[필수] 개인정보 수집 및 이용 동의',
						required: true
					}
				]
			},
			onOk: () => {
				this.signInWithGoogle();
			}
		});
	}

	// 구글 로그인 실행
	async signInWithGoogle(redirectTo?: string) {
		if (!supabase) return;
		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: { redirectTo: redirectTo || window.location.origin }
			});
			if (error) throw error;
		} catch (e) {
			console.error(e);
			modal.open(NoticeModal, {
				tabs: [{ title: '오류', content: '로그인 도중 오류가 발생했습니다.' }]
			});
		}
	}

	// 로그아웃 실행
	async signOut() {
		if (!supabase) return;
		await supabase.auth.signOut();
	}
}

// 전역 인스턴스 export
export const auth = new AuthStore();
