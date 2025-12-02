<svg class="h-auto w-full" viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<linearGradient id="tagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" style="stop-color: #80ded1" />
			<stop offset="100%" style="stop-color: #26c6a8" />
		</linearGradient>
		<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur stdDeviation="4" result="coloredBlur" />
			<feFlood flood-color="#4DD0BD" flood-opacity="0.5" />
			<feComposite in2="coloredBlur" operator="in" />
			<feMerge>
				<feMergeNode />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</defs>
	<!-- <div> -->
	<text
		x="20"
		y="55"
		font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
		font-size="42"
		font-weight="700"
		fill="url(#tagGrad)"
		filter="url(#glow)"
	>
		&lt;div&gt;
	</text>
	<!-- Trend -->
	<text
		x="138"
		y="55"
		font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
		font-size="42"
		font-weight="700"
		fill="#ffffff"
		filter="url(#glow)"
	>
		Trend
	</text>
	<!-- 커서 -->
	<rect
		class="animate-blink"
		x="258"
		y="20"
		width="4"
		height="40"
		rx="2"
		fill="#4DD0BD"
		filter="url(#glow)"
	/>
	<!-- </div> -->
	<text
		x="265"
		y="55"
		font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
		font-size="42"
		font-weight="700"
		fill="url(#tagGrad)"
		filter="url(#glow)"
	>
		&lt;/div&gt;
	</text>
</svg>

<style>
	@keyframes blink {
		0%,
		50% {
			opacity: 1;
		}
		51%,
		100% {
			opacity: 0;
		}
	}

	.animate-blink {
		animation: blink 1s infinite;
	}
</style>
