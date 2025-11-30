<script lang="ts">
  export let width = "76";
  export let height = "44";
  export let className = "";
</script>

<svg 
  {width} 
  {height} 
  class={className} 
  viewBox="0 0 76 44" 
  fill="none" 
  xmlns="http://www.w3.org/2000/svg"
>
  <defs>
    <linearGradient id="cubeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4DD0BD"/>
      <stop offset="100%" style="stop-color:#1BA896"/>
    </linearGradient>
    <linearGradient id="tagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#80DED1"/>
      <stop offset="100%" style="stop-color:#26C6A8"/>
    </linearGradient>
  </defs>
  <path d="M4 22 L10 15 M4 22 L10 29" stroke="url(#tagGrad)" stroke-width="3.5" stroke-linecap="round"/>
  <rect x="16" y="6" width="32" height="32" rx="10" fill="url(#cubeGrad)"/>
  <rect x="21" y="11" width="22" height="6" rx="3" fill="white"/>
  <rect x="27" y="15" width="10" height="17" rx="3" fill="white"/>
  <circle cx="26" cy="14" r="1.8" fill="#0D6B63"/>
  <circle cx="38" cy="14" r="1.8" fill="#0D6B63"/>
  <circle cx="25.4" cy="13.4" r="0.7" fill="white"/>
  <circle cx="37.4" cy="13.4" r="0.7" fill="white"/>
  <circle cx="26.4" cy="14.4" r="0.35" fill="white"/>
  <circle cx="38.4" cy="14.4" r="0.35" fill="white"/>
  <path d="M29 17.5 Q32 19.5 35 17.5" stroke="#0D6B63" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <path d="M54 32 L58 12" stroke="url(#tagGrad)" stroke-width="3" stroke-linecap="round"/>
  <path d="M72 22 L66 15 M72 22 L66 29" stroke="url(#tagGrad)" stroke-width="3.5" stroke-linecap="round"/>
</svg>