<script>
  import { formatBoundaryDate, formatCountdown } from "$lib/schedule";

  /** Time left before the next campaign, shown once a game is finished. */
  let { endsAt } = $props();

  let now = $state(Date.now());
  let remaining = $derived(Math.max(0, endsAt - now));
  let expired = $derived(remaining === 0);

  // An interval recomputing from Date.now(), not one long setTimeout: a laptop
  // that sleeps through the boundary makes a timeout fire late or not at all,
  // while an interval re-reads the clock and corrects itself.
  $effect(() => {
    const tick = () => (now = Date.now());
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  });
</script>

<div class="mt-4 text-sm text-[var(--color-text-muted)]">
  {#if expired}
    <!--
      Deliberately not an automatic reset: doing that here would wipe the board
      the player is still reading, and sweep the finished week's state with it.
    -->
    <p class="mb-2">Une nouvelle campagne est disponible.</p>
    <button
      onclick={() => location.reload()}
      class="px-4 py-2 rounded-lg bg-[var(--color-action)] text-[var(--color-bg)] font-semibold cursor-pointer transition-opacity hover:opacity-85"
    >
      Charger la nouvelle campagne
    </button>
  {:else}
    <p>
      Prochaine campagne dans
      <!--
        The ticking value is hidden from assistive tech — a string changing
        every second inside a live region is unusable. The absolute date says
        the same thing once.
      -->
      <strong class="text-[var(--color-text)]" aria-hidden="true"
        >{formatCountdown(remaining)}</strong
      >
      <span class="sr-only">{formatBoundaryDate(endsAt)} à 19 h</span>
    </p>
  {/if}
</div>
