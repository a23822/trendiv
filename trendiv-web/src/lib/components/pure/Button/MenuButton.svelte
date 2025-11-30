<script lang="ts">
  export let isOpen = false;
  export let onClick: () => void;
  export let className = "";
</script>

<button type="button" class="btn_menu {className}" aria-expanded={isOpen} onclick={onClick} aria-label="메뉴">
  <span class="block h-[2px] w-6 rounded-[2px] bg-neutral-700"></span>
  <span class="block h-[2px] w-6 rounded-[2px] bg-neutral-700"></span>
  <span class="block h-[2px] w-6 rounded-[2px] bg-neutral-700"></span>
</button>

<style lang="scss">
  .btn_menu {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 6px;
    width: 48px;
    height: 48px;
    padding: 12px;
  }
</style>