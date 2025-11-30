<script lang="ts">
  export let isDark = false;

  function toggle() {
    isDark = !isDark;
  }
</script>

<button 
  class="theme-toggle" 
  class:dark={isDark} 
  on:click={toggle} 
  aria-label="Toggle Dark Mode"
  type="button"
>
  <div class="star-bg">
    <div class="star star-1"></div>
    <div class="star star-2"></div>
  </div>

  <div class="cloud-bg">
    <div class="cloud cloud-1"></div>
    <div class="cloud cloud-2"></div>
  </div>

  <div class="thumb">
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      
      <g class="rays">
        <path d="M12 3v1" />
        <path d="M17 5l-.7.7" />
        <path d="M20 12h1" />
        <path d="M17 19l-.7-.7" />
        <path d="M12 20v1" />
        <path d="M5 19l.7-.7" />
        <path d="M4 12h1" />
        <path d="M7 5l.7.7" />
      </g>
      
      <mask id="moon-mask">
        <rect x="0" y="0" width="100%" height="100%" fill="white" />
        <circle class="moon-shadow" cx="12" cy="12" r="6" fill="black" />
      </mask>
      
      <circle 
        class="sun-moon-body" 
        cx="12" 
        cy="12" 
        r="6" 
        mask="url(#moon-mask)" 
        fill="currentColor" 
      />
    </svg>
  </div>
</button>

<style>
  /* .theme-toggle {
    position: relative;
    width: 64px;
    height: 32px;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    overflow: hidden;
    transition: background-color 0.5s ease;
    background-color: #60A5FA;
  }

  .theme-toggle.dark {
    background-color: #1E293B;
  }

  .thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 28px;
    height: 28px;
    background-color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55), background-color 0.3s;
    z-index: 10;
    color: #F59E0B;
  }

  .theme-toggle.dark .thumb {
    transform: translateX(32px);
    background-color: transparent;
    color: #FCD34D;
    box-shadow: none;
  }

  .icon {
    width: 20px;
    height: 20px;
    transition: transform 0.5s ease;
  }

  .rays {
    transition: opacity 0.3s ease, transform 0.3s ease;
    transform-origin: center;
    stroke-width: 2;
    stroke-linecap: round;
  }

  .sun-moon-body {
    transition: fill 0.3s;
  }

  .moon-shadow {
    transition: transform 0.5s ease;
    transform: translate(12px, -12px);
  }

  .theme-toggle.dark .rays {
    opacity: 0;
    transform: scale(0.5) rotate(45deg);
  }

  .theme-toggle.dark .moon-shadow {
    transform: translate(5px, -2px); 
  }

  .theme-toggle.dark .icon {
    transform: rotate(-15deg);
  }

  .star-bg, .cloud-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0; left: 0;
    pointer-events: none;
  }

  .star {
    position: absolute;
    background: white;
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.4s ease, transform 0.4s ease;
  }
  .star-1 { width: 3px; height: 3px; top: 8px; left: 15px; }
  .star-2 { width: 2px; height: 2px; top: 20px; left: 25px; }

  .theme-toggle.dark .star { opacity: 1; transform: scale(1); }
  .theme-toggle.dark .star-1 { transition-delay: 0.2s; }
  .theme-toggle.dark .star-2 { transition-delay: 0.3s; }

  .cloud {
    position: absolute;
    background: white;
    border-radius: 99px;
    opacity: 0.4;
    transition: opacity 0.4s ease, transform 0.4s ease;
  }
  .cloud-1 { width: 12px; height: 4px; top: 8px; right: 12px; }
  .cloud-2 { width: 8px; height: 3px; top: 18px; right: 20px; }

  .theme-toggle.dark .cloud { opacity: 0; transform: translateX(10px); } */
</style>