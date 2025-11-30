<script lang="ts">
  export let onClick: () => void;
  export let className = "";
</script>

<button type="button" class="relative w-12 h-12 {className}" aria-expanded="false" onclick={onClick} aria-label="닫기">
  <span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-6 rounded-[2px] bg-neutral-700 rotate-45 origin-center"></span>
  <span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-6 rounded-[2px] bg-neutral-700 -rotate-45 origin-center"></span>
</button>