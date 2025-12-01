import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
	darkMode: 'class',
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {
			colors: {
				bg: {
					body: 'var(--bg-body)',
					main: 'var(--bg-main)',
					surface: 'var(--bg-surface)',
					elevated: 'var(--bg-elevated)',
					hover: 'var(--bg-hover)',
					active: 'var(--bg-active)',
					selected: 'var(--bg-selected)'
				},
				border: {
					default: 'var(--border-default)',
					subtle: 'var(--border-subtle)',
					strong: 'var(--border-strong)',
					focus: 'var(--border-focus)'
				},
				primary: {
					DEFAULT: 'var(--primary)',
					hover: 'var(--primary-hover)',
					active: 'var(--primary-active)',
					subtle: 'var(--primary-subtle)',
					text: 'var(--primary-text)'
				},
				confirm: {
					DEFAULT: 'var(--confirm)',
					hover: 'var(--confirm-hover)',
					subtle: 'var(--confirm-subtle)',
					text: 'var(--confirm-text)'
				},
				caution: {
					DEFAULT: 'var(--caution)',
					hover: 'var(--caution-hover)',
					subtle: 'var(--caution-subtle)',
					text: 'var(--caution-text)'
				},
				alert: {
					DEFAULT: 'var(--alert)',
					hover: 'var(--alert-hover)',
					subtle: 'var(--alert-subtle)',
					text: 'var(--alert-text)'
				},
				info: {
					DEFAULT: 'var(--info)',
					hover: 'var(--info-hover)',
					subtle: 'var(--info-subtle)',
					text: 'var(--info-text)'
				},
				shadow: {
					sm: 'var(--shadow-sm)',
					md: 'var(--shadow-md)',
					lg: 'var(--shadow-lg)',
					xl: 'var(--shadow-xl)'
				},
				mint: {
					0: '#fff',
					50: '#E0F7F4',
					100: '#B2EBE3',
					200: '#80DED1',
					300: '#4DD0BD',
					400: '#26C6A8',
					500: '#1BA896',
					600: '#148A7D',
					700: '#0D6B63',
					800: '#09504B',
					900: '#053330'
				},
				gray: {
					0: 'var(--gray-0)',
					100: 'var(--gray-100)',
					200: 'var(--gray-200)',
					300: 'var(--gray-300)',
					400: 'var(--gray-400)',
					500: 'var(--gray-500)',
					600: 'var(--gray-600)',
					700: 'var(--gray-700)',
					800: 'var(--gray-800)',
					900: 'var(--gray-900)',
					1000: 'var(--gray-1000)'
				},
				neutral: {
					0: 'var(--neutral-0)',
					100: 'var(--neutral-100)',
					200: 'var(--neutral-200)',
					300: 'var(--neutral-300)',
					400: 'var(--neutral-400)',
					500: 'var(--neutral-500)',
					600: 'var(--neutral-600)',
					700: 'var(--neutral-700)',
					800: 'var(--neutral-800)',
					900: 'var(--neutral-900)',
					1000: 'var(--neutral-1000)'
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
				},
				forest: {
					0: '#FFFFFF',
					50: '#E5F5EF',
					100: '#C2E8DA',
					200: '#96D9C2',
					300: '#68C7A8',
					400: '#42B391',
					500: '#2D9A7A',
					600: '#237D63',
					700: '#19604C',
					800: '#104538',
					900: '#082B23'
				}
			},
			fontFamily: {
				sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				serif: ['Merriweather', 'serif'],
				mono: ['Fira Code', 'monospace']
			}
		}
	},

	plugins: [typography]
} as Config;
