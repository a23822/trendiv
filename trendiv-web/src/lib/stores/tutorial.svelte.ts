import { browser } from '$app/environment';

class TutorialStore {
	// 'theme_tutorial_seen' 키를 사용해 로컬 스토리지 확인
	isSeen = $state(false);

	constructor() {
		if (browser) {
			const stored = localStorage.getItem('theme_tutorial_seen');
			this.isSeen = stored === 'true';
		}
	}

	// 튜토리얼 닫기 (영구 저장)
	complete() {
		this.isSeen = true;
		if (browser) {
			localStorage.setItem('theme_tutorial_seen', 'true');
		}
	}

	// (테스트용) 튜토리얼 리셋
	reset() {
		this.isSeen = false;
		if (browser) {
			localStorage.removeItem('theme_tutorial_seen');
		}
	}
}

export const tutorial = new TutorialStore();
