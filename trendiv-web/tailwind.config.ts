import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
	darkMode: 'class',
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {
			colors: {
				bg: {
					body: 'rgb(var(--bg-body) / <alpha-value>)',
					main: 'rgb(var(--bg-main) / <alpha-value>)',
					surface: 'rgb(var(--bg-surface) / <alpha-value>)',
					elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
					hover: 'rgb(var(--bg-hover) / <alpha-value>)',
					active: 'rgb(var(--bg-active) / <alpha-value>)',
					selected: 'rgb(var(--bg-selected) / <alpha-value>)'
				},
				border: {
					default: 'rgb(var(--border-default) / <alpha-value>)',
					subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
					strong: 'rgb(var(--border-strong) / <alpha-value>)',
					focus: 'rgb(var(--border-focus) / <alpha-value>)'
				},
				primary: {
					DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
					hover: 'rgb(var(--primary-hover) / <alpha-value>)',
					active: 'rgb(var(--primary-active) / <alpha-value>)',
					subtle: 'rgb(var(--primary-subtle) / <alpha-value>)',
					text: 'rgb(var(--primary-text) / <alpha-value>)'
				},
				confirm: {
					DEFAULT: 'rgb(var(--confirm) / <alpha-value>)',
					hover: 'rgb(var(--confirm-hover) / <alpha-value>)',
					subtle: 'rgb(var(--confirm-subtle) / <alpha-value>)',
					text: 'rgb(var(--confirm-text) / <alpha-value>)'
				},
				caution: {
					DEFAULT: 'rgb(var(--caution) / <alpha-value>)',
					hover: 'rgb(var(--caution-hover) / <alpha-value>)',
					subtle: 'rgb(var(--caution-subtle) / <alpha-value>)',
					text: 'rgb(var(--caution-text) / <alpha-value>)'
				},
				alert: {
					DEFAULT: 'rgb(var(--alert) / <alpha-value>)',
					hover: 'rgb(var(--alert-hover) / <alpha-value>)',
					subtle: 'rgb(var(--alert-subtle) / <alpha-value>)',
					text: 'rgb(var(--alert-text) / <alpha-value>)'
				},
				info: {
					DEFAULT: 'rgb(var(--info) / <alpha-value>)',
					hover: 'rgb(var(--info-hover) / <alpha-value>)',
					subtle: 'rgb(var(--info-subtle) / <alpha-value>)',
					text: 'rgb(var(--info-text) / <alpha-value>)'
				},
				shadow: {
					sm: 'rgb(var(--shadow-sm) / <alpha-value>)',
					md: 'rgb(var(--shadow-md) / <alpha-value>)',
					lg: 'rgb(var(--shadow-lg) / <alpha-value>)',
					xl: 'rgb(var(--shadow-xl) / <alpha-value>)'
				},
				mint: {
					0: 'rgb(var(--mint-0) / <alpha-value>)',
					50: 'rgb(var(--mint-50) / <alpha-value>)',
					100: 'rgb(var(--mint-100) / <alpha-value>)',
					200: 'rgb(var(--mint-200) / <alpha-value>)',
					300: 'rgb(var(--mint-300) / <alpha-value>)',
					400: 'rgb(var(--mint-400) / <alpha-value>)',
					500: 'rgb(var(--mint-500) / <alpha-value>)',
					600: 'rgb(var(--mint-600) / <alpha-value>)',
					700: 'rgb(var(--mint-700) / <alpha-value>)',
					800: 'rgb(var(--mint-800) / <alpha-value>)',
					900: 'rgb(var(--mint-900) / <alpha-value>)',
					1000: 'rgb(var(--mint-1000) / <alpha-value>)'
				},
				forest: {
					0: 'rgb(var(--forest-0) / <alpha-value>)',
					50: 'rgb(var(--forest-50) / <alpha-value>)',
					100: 'rgb(var(--forest-100) / <alpha-value>)',
					200: 'rgb(var(--forest-200) / <alpha-value>)',
					300: 'rgb(var(--forest-300) / <alpha-value>)',
					400: 'rgb(var(--forest-400) / <alpha-value>)',
					500: 'rgb(var(--forest-500) / <alpha-value>)',
					600: 'rgb(var(--forest-600) / <alpha-value>)',
					700: 'rgb(var(--forest-700) / <alpha-value>)',
					800: 'rgb(var(--forest-800) / <alpha-value>)',
					900: 'rgb(var(--forest-900) / <alpha-value>)',
					1000: 'rgb(var(--forest-1000) / <alpha-value>)'
				},
				gray: {
					0: 'rgb(var(--gray-0) / <alpha-value>)',
					100: 'rgb(var(--gray-100) / <alpha-value>)',
					200: 'rgb(var(--gray-200) / <alpha-value>)',
					300: 'rgb(var(--gray-300) / <alpha-value>)',
					400: 'rgb(var(--gray-400) / <alpha-value>)',
					500: 'rgb(var(--gray-500) / <alpha-value>)',
					600: 'rgb(var(--gray-600) / <alpha-value>)',
					700: 'rgb(var(--gray-700) / <alpha-value>)',
					800: 'rgb(var(--gray-800) / <alpha-value>)',
					900: 'rgb(var(--gray-900) / <alpha-value>)',
					1000: 'rgb(var(--gray-1000) / <alpha-value>)'
				},
				neutral: {
					0: 'rgb(var(--neutral-0) / <alpha-value>)',
					100: 'rgb(var(--neutral-100) / <alpha-value>)',
					200: 'rgb(var(--neutral-200) / <alpha-value>)',
					300: 'rgb(var(--neutral-300) / <alpha-value>)',
					400: 'rgb(var(--neutral-400) / <alpha-value>)',
					500: 'rgb(var(--neutral-500) / <alpha-value>)',
					600: 'rgb(var(--neutral-600) / <alpha-value>)',
					700: 'rgb(var(--neutral-700) / <alpha-value>)',
					800: 'rgb(var(--neutral-800) / <alpha-value>)',
					900: 'rgb(var(--neutral-900) / <alpha-value>)',
					1000: 'rgb(var(--neutral-1000) / <alpha-value>)'
				},
				'mint-fixed': {
					0: 'rgb(var(--mint-0-fixed) / <alpha-value>)',
					50: 'rgb(var(--mint-50-fixed) / <alpha-value>)',
					100: 'rgb(var(--mint-100-fixed) / <alpha-value>)',
					200: 'rgb(var(--mint-200-fixed) / <alpha-value>)',
					300: 'rgb(var(--mint-300-fixed) / <alpha-value>)',
					400: 'rgb(var(--mint-400-fixed) / <alpha-value>)',
					500: 'rgb(var(--mint-500-fixed) / <alpha-value>)',
					600: 'rgb(var(--mint-600-fixed) / <alpha-value>)',
					700: 'rgb(var(--mint-700-fixed) / <alpha-value>)',
					800: 'rgb(var(--mint-800-fixed) / <alpha-value>)',
					900: 'rgb(var(--mint-900-fixed) / <alpha-value>)',
					1000: 'rgb(var(--mint-1000-fixed) / <alpha-value>)'
				},
				'forest-fixed': {
					0: 'rgb(var(--forest-0-fixed) / <alpha-value>)',
					50: 'rgb(var(--forest-50-fixed) / <alpha-value>)',
					100: 'rgb(var(--forest-100-fixed) / <alpha-value>)',
					200: 'rgb(var(--forest-200-fixed) / <alpha-value>)',
					300: 'rgb(var(--forest-300-fixed) / <alpha-value>)',
					400: 'rgb(var(--forest-400-fixed) / <alpha-value>)',
					500: 'rgb(var(--forest-500-fixed) / <alpha-value>)',
					600: 'rgb(var(--forest-600-fixed) / <alpha-value>)',
					700: 'rgb(var(--forest-700-fixed) / <alpha-value>)',
					800: 'rgb(var(--forest-800-fixed) / <alpha-value>)',
					900: 'rgb(var(--forest-900-fixed) / <alpha-value>)',
					1000: 'rgb(var(--forest-1000-fixed) / <alpha-value>)'
				},
				'gray-fixed': {
					0: 'rgb(var(--gray-0-fixed) / <alpha-value>)',
					100: 'rgb(var(--gray-100-fixed) / <alpha-value>)',
					200: 'rgb(var(--gray-200-fixed) / <alpha-value>)',
					300: 'rgb(var(--gray-300-fixed) / <alpha-value>)',
					400: 'rgb(var(--gray-400-fixed) / <alpha-value>)',
					500: 'rgb(var(--gray-500-fixed) / <alpha-value>)',
					600: 'rgb(var(--gray-600-fixed) / <alpha-value>)',
					700: 'rgb(var(--gray-700-fixed) / <alpha-value>)',
					800: 'rgb(var(--gray-800-fixed) / <alpha-value>)',
					900: 'rgb(var(--gray-900-fixed) / <alpha-value>)',
					1000: 'rgb(var(--gray-1000-fixed) / <alpha-value>)'
				},
				'neutral-fixed': {
					0: 'rgb(var(--neutral-0-fixed) / <alpha-value>)',
					100: 'rgb(var(--neutral-100-fixed) / <alpha-value>)',
					200: 'rgb(var(--neutral-200-fixed) / <alpha-value>)',
					300: 'rgb(var(--neutral-300-fixed) / <alpha-value>)',
					400: 'rgb(var(--neutral-400-fixed) / <alpha-value>)',
					500: 'rgb(var(--neutral-500-fixed) / <alpha-value>)',
					600: 'rgb(var(--neutral-600-fixed) / <alpha-value>)',
					700: 'rgb(var(--neutral-700-fixed) / <alpha-value>)',
					800: 'rgb(var(--neutral-800-fixed) / <alpha-value>)',
					900: 'rgb(var(--neutral-900-fixed) / <alpha-value>)',
					1000: 'rgb(var(--neutral-1000-fixed) / <alpha-value>)'
				},
				teal: {
					0: '#FFFFFF',
					50: '#E0F5F5',
					100: '#B0E4E6',
					200: '#7DD3D6',
					300: '#4ABFC4',
					400: '#22A9B0',
					500: '#17909A',
					600: '#117580',
					700: '#0B5B65',
					800: '#07434A',
					900: '#042B30'
				},
				emerald: {
					0: '#FFFFFF',
					50: '#E0F7ED',
					100: '#B0EBCF',
					200: '#7DDEB0',
					300: '#4ACF90',
					400: '#24BF75',
					500: '#18A162',
					600: '#128450',
					700: '#0C663E',
					800: '#084B2E',
					900: '#04301D'
				},
				petrol: {
					0: '#FFFFFF',
					50: '#E0F2F4',
					100: '#B0DDE4',
					200: '#7DC8D4',
					300: '#4AB0C2',
					400: '#2297AD',
					500: '#177D94',
					600: '#11647A',
					700: '#0B4C5E',
					800: '#073845',
					900: '#04242D'
				}
			},
			fontFamily: {
				sans: [
					'Pretendard',
					'Inter',
					'ui-sans-serif',
					'system-ui',
					'sans-serif'
				],
				serif: ['Merriweather', 'serif'],
				mono: ['Fira Code', 'monospace']
			},
			borderRadius: {
				inherit: 'inherit'
			},
			spacing: {
				'scrollbar-gap': 'var(--scrollbar-gap)',
				sidemenu: '460px',
				'header-height': '60px'
			},
			lineClamp: {
				7: '7',
				8: '8',
				10: '10'
			}
		}
	},

	plugins: [
		typography,

		plugin(function ({ matchUtilities, theme }) {
			matchUtilities(
				{
					'line-clamp': (value) => ({
						display: '-webkit-box',
						'-webkit-box-orient': 'vertical',
						'-webkit-line-clamp': value,
						overflow: 'hidden',
						'text-overflow': 'ellipsis',
						'word-break': 'break-all',
						'word-wrap': 'break-word'
					})
				},
				{ values: theme('lineClamp') }
			);
		})
	]
} as Config;
