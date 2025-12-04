import { writable } from 'svelte/store';
import { supabase } from '$lib/stores/db';
import { openModal } from '$lib/stores/modal';
import NoticeModal from '$lib/components/modal/NoticeModal.svelte';
import type { User } from '@supabase/supabase-js';

// 사용자 정보를 담는 스토어 (초기값: null)
export const user = writable<User | null>(null);

export const avatarColor = writable<string>('#fff');

// Supabase의 상태가 변하면(로그인/로그아웃) 업데이트!
if (supabase) {
	supabase.auth.onAuthStateChange((event, session) => {
		user.set(session?.user || null);
	});
}

// 약관 텍스트 변수 (맨 아래에 있던 것)
const TERMS_TEXT = `<div style="text-align:left">...이용약관 내용...</div>`;
const PRIVACY_TEXT = `<div style="text-align:left">...개인정보 내용...</div>`;

/**
 * 로그인 전 약관 모달
 */
export function openLoginModal() {
	openModal(NoticeModal, {
		// 1. 탭 데이터 전달
		tabs: [
			{ title: '이용약관', content: TERMS_TEXT },
			{ title: '개인정보처리방침', content: PRIVACY_TEXT }
		],
		// 2. 버튼 설정 전달
		confirmText: '동의하고 구글 로그인',

		// 🔥 3. 확인 버튼을 누르면 실행될 함수 전달
		onConfirm: () => {
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
		openModal(NoticeModal, {
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
