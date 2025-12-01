import { writable } from 'svelte/store';
import type { User } from '@supabase/supabase-js';

// 사용자 정보를 담는 스토어 (초기값: null)
export const user = writable<User | null>(null);

export const avatarColor = writable<string>('#fff');

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
