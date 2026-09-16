<script>
  import CampaignAvatar from "./campaign-avatar.svelte";

  /** Win/loss message with optional new game button */
  let { isWon, target, guessCount, onNewGame } = $props();
</script>

<div class="text-center py-6 px-4 mx-auto max-w-[400px]">
  <h2
    class="text-2xl font-bold mb-2 {isWon
      ? 'text-[var(--color-correct)]'
      : 'text-[var(--color-wrong)]'}"
  >
    {isWon ? "Bravo !" : "Perdu"}
  </h2>

  {#if isWon}
    <!-- French pluralises from 2, so "0 essai" and "1 essai" both stay singular. -->
    <p class="text-[var(--color-text-muted)] mb-3">
      Vous avez trouvé <strong class="text-[var(--color-text)]">{target.name}</strong>
      en <strong class="text-[var(--color-text)]">{guessCount}</strong>
      essai{guessCount > 1 ? "s" : ""} !
    </p>
  {:else}
    <p class="text-[var(--color-text-muted)] mb-3">
      La campagne était <strong class="text-[var(--color-text)]"
        >{target.name}</strong
      >
    </p>
    <div class="flex justify-center">
      <CampaignAvatar campaign={target} size={80} />
    </div>
  {/if}

  {#if onNewGame}
    <button
      onclick={onNewGame}
      class="mt-4 px-6 py-2.5 rounded-lg bg-[var(--color-accent)] text-[var(--color-text)] font-semibold cursor-pointer transition-opacity hover:opacity-85"
    >
      Nouvelle partie
    </button>
  {/if}
</div>
