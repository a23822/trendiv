import AgreementModalBottom from '$lib/components/modal/AgreementModalBottom.svelte';
import NoticeModal from '$lib/components/modal/NoticeModal.svelte';
import { TERMS_TEXT, PRIVACY_TEXT } from '$lib/constants/policy';
import IconLogoGoogle from '$lib/icons/icon_logo_google.svelte';
import { supabase } from '$lib/stores/db';
import { modal } from '$lib/stores/modal.svelte.js';
import type { User } from '@supabase/supabase-js';
import { writable } from 'svelte/store';

// 사용자 정보를 담는 스토어 (초기값: null)
export const user = writable<User | null>(null);

export const avatarColor = writable<string>('#fff');

// Supabase의 상태가 변하면(로그인/로그아웃) 업데이트!
if (supabase) {
	supabase.auth.onAuthStateChange((event, session) => {
		user.set(session?.user || null);
	});
}

/**
 * 로그인 전 약관 모달
 */
export function openLoginModal() {
	modal.open(NoticeModal, {
		title: '서비스 이용 동의',
		tabs: [
			{ title: '이용약관', content: TERMS_TEXT },
			{ title: '개인정보처리방침', content: PRIVACY_TEXT }
		],
		bottomComponent: AgreementModalBottom,
		bottomProps: {
			confirmText: 'Google로 시작하기',
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
			signInWithGoogle();
		}
	});
}

/**
 * 구글 로그인 실행
 */
async function signInWithGoogle(redirectTo?: string) {
	if (!supabase) return;
	try {
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: redirectTo || window.location.origin }
		});
		if (error) throw error;
	} catch (e) {
		console.error(e);
		// 에러 났을 때는 단순 알림 모달 띄우기 (onConfirm 없음)
		modal.open(NoticeModal, {
			tabs: [{ title: '오류', content: '로그인 도중 오류가 발생했습니다.' }]
		});
	}
}

/**
 * 로그아웃 실행
 */
export async function signOut() {
	if (!supabase) return;
	await supabase.auth.signOut();
}

//아바타가 없으면 랜덤 색상 생성
user.subscribe((currentUser) => {
	if (currentUser && !currentUser.user_metadata?.avatar_url) {
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
		const randomColor = colors[Math.floor(Math.random() * colors.length)];
		avatarColor.set(randomColor);
	} else {
		// 로그아웃 시 초기화
		avatarColor.set('#fff');
	}
});
