import { cn } from '$lib/utils/ClassMerge';

const BASE_TRANSITION = 'transition-all duration-300 ease-in-out';
const BASE_TRANSITION_COLOR = 'transition-colors duration-300 ease-in-out';
export const CommonStyles = {
	CARD: cn(
		'group',
		'bg-gray-0 rounded-xl',
		'p-4 sm:p-6',
		'border border-gray-300/60',
		'hover:border-gray-400 hover:shadow-xs',
		BASE_TRANSITION
	),
	DEFAULT_TRANSITION_COLOR: cn(BASE_TRANSITION_COLOR),
	DEFAULT_TRANSITION: cn(BASE_TRANSITION)
} as const;
