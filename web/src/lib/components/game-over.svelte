<script>
  import CampaignAvatar from "./campaign-avatar.svelte";
  import Countdown from "./countdown.svelte";
  import { STREAK_RULE, streakMessage } from "$lib/streak";

  /** Win/loss message, with a countdown in weekly mode and a button in unlimited */
  let { isWon, target, guessCount, onNewGame, endsAt, streak } = $props();

  // undefined in unlimited mode, and when the stored streak belongs to an
  // earlier period than the one just played.
  let showStreak = $derived(Boolean(streak));
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

  <!-- Both branches: a player who has just broken a long run needs this more. -->
  {#if showStreak}
    <div
      class="mt-4 pt-3 border-t border-[var(--color-input-border)] text-[var(--color-text)]"
    >
      <p>
        {streakMessage({
          current: streak.current,
          previous: streak.previous,
          isWon,
        })}
      </p>
      <p class="mt-1 text-xs text-[var(--color-text-muted)]">{STREAK_RULE}</p>
    </div>
  {/if}

  {#if onNewGame}
    <button
      onclick={onNewGame}
      class="mt-4 px-6 py-2.5 rounded-lg bg-[var(--color-action)] text-[var(--color-bg)] font-semibold cursor-pointer transition-opacity hover:opacity-85"
    >
      Nouvelle partie
    </button>
  {:else if endsAt}
    <!-- Weekly mode has no replay, so this panel is on screen for up to a week. -->
    <Countdown {endsAt} />
  {/if}
</div>
