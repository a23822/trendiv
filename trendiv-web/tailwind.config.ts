import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {
			colors: {
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
