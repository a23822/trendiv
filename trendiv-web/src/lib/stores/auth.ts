import { writable } from 'svelte/store';
import type { User } from '@supabase/supabase-js';

// 사용자 정보를 담는 스토어 (초기값: null)
export const user = writable<User | null>(null);
