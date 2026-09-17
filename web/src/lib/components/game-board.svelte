<script>
  import { onMount } from "svelte";
  import {
    getCampaignForPeriod,
    getCampaignForSeed,
    loadCampaigns,
  } from "$lib/campaign-data";
  import { compareCampaigns } from "$lib/classic-mode";
  import { pickNote } from "$lib/notes";
  import { getCurrentPeriod } from "$lib/schedule";
  import {
    clearExpiredCache,
    clearUnlimitedState,
    createGame,
    getOrCreateUnlimitedSeed,
    hasAbandonedPeriod,
    loadUnlimitedStats,
    saveUnlimitedStats,
    submitGuess,
  } from "$lib/game-engine";
  import {
    breakStreak,
    loadStreak,
    nextStreak,
    saveStreak,
  } from "$lib/streak";
  import CampaignSearch from "./campaign-search.svelte";
  import GameOver from "./game-over.svelte";
  import GuessGrid from "./guess-grid.svelte";
  import NotePopup from "./note-popup.svelte";
  import StatsDisplay from "./stats-display.svelte";

  let mode = $state("weekly");
  let game = $state(null);
  let loading = $state(true);
  let error = $state(null);
  let stats = $state(null);
  let period = $state(null);
  let streak = $state(null);

  let excludeNames = $derived(game ? game.guesses.map((g) => g.name) : []);
  let bubble = $state(null);

  const noteBubble = {
    isOpenFor(id) {
      return Boolean(bubble && bubble.id === id);
    },
    open(trigger, notes, openedBy, id) {
      const text = pickNote(notes);
      if (!text) return;
      bubble = { text, trigger, openedBy, id };
    },
    close(openedBy) {
      if (!bubble) return;
      if (openedBy && bubble.openedBy !== openedBy) return;
      bubble = null;
    },
    toggle(trigger, notes, id) {
      if (bubble && bubble.id === id) {
        if (bubble.openedBy === "click") {
          bubble = null;
          return;
        }
        bubble = { ...bubble, openedBy: "click" };
        return;
      }
      const text = pickNote(notes);
      if (!text) return;
      bubble = { text, trigger, openedBy: "click", id };
    },
  };

  function dismissBubble({ restoreFocus = false } = {}) {
    const trigger = bubble?.trigger;
    bubble = null;
    if (restoreFocus) trigger?.focus();
  }

  function initGame(gameMode) {
    const seed =
      gameMode === "unlimited" ? getOrCreateUnlimitedSeed() : period.seed;
    const target =
      gameMode === "unlimited"
        ? getCampaignForSeed(seed)
        : getCampaignForPeriod(period.index);
    const maxGuesses = 6;

    game = createGame({
      target,
      compareFn: compareCampaigns,
      maxGuesses,
      mode: gameMode,
      seed,
    });
    stats = gameMode === "unlimited" ? loadUnlimitedStats() : null;
  }

  onMount(async () => {
    try {
      await loadCampaigns();
      period = getCurrentPeriod();

      const stored = loadStreak();
      streak = hasAbandonedPeriod(period.seed) ? breakStreak(stored) : stored;
      if (streak !== stored) saveStreak(streak);

      clearExpiredCache(period.seed);
      initGame("weekly");
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  });

  function switchMode(newMode) {
    mode = newMode;
    initGame(newMode);
  }

  function handleGuess(campaign) {
    if (!game) return;

    const updated = submitGuess(game, campaign);
    if (!updated) return;

    game = updated;

    if (updated.isOver && updated.mode === "unlimited") {
      saveUnlimitedStats(updated);
      stats = loadUnlimitedStats();
    }

    if (updated.isOver && updated.mode === "weekly") {
      streak = nextStreak(streak, period.index, updated.isWon);
      saveStreak(streak);
    }
  }

  function handleNewGame() {
    clearUnlimitedState();
    initGame("unlimited");
  }
</script>

{#if loading}
  <p class="text-center text-[var(--color-text-muted)] py-8">
    Chargement des campagnes...
  </p>
{:else if error}
  <p class="text-center text-[var(--color-wrong)] py-8">
    Impossible de charger les campagnes. Rechargez la page.
  </p>
{:else if game}
  <!-- Mode toggle -->
  <div
    class="flex justify-center gap-1 my-3 bg-[var(--color-surface)] rounded-lg p-1 w-fit mx-auto"
  >
    <button
      onclick={() => switchMode("weekly")}
      class="px-5 py-2 rounded-md border-none text-sm font-medium cursor-pointer transition-all {mode ===
      'weekly'
        ? 'bg-[var(--color-action)] text-[var(--color-bg)]'
        : 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'}"
    >
      Hebdomadaire
    </button>
    <button
      onclick={() => switchMode("unlimited")}
      class="px-5 py-2 rounded-md border-none text-sm font-medium cursor-pointer transition-all {mode ===
      'unlimited'
        ? 'bg-[var(--color-action)] text-[var(--color-bg)]'
        : 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'}"
    >
      Illimité
    </button>
  </div>

  {#if stats}
    <StatsDisplay {stats} />
  {/if}

  <CampaignSearch
    {excludeNames}
    onSelect={handleGuess}
    disabled={game.isOver}
  />

  <p class="text-center text-[var(--color-text-muted)] text-sm my-3">
    {game.guesses.length} / {game.maxGuesses} essais
  </p>

  <GuessGrid guesses={game.guesses} results={game.results} {noteBubble} />

  {#if game.isOver}
    <GameOver
      isWon={game.isWon}
      target={game.target}
      guessCount={game.guesses.length}
      results={game.results}
      mode={mode}
      onNewGame={mode === "unlimited" ? handleNewGame : undefined}
      endsAt={mode === "unlimited" ? undefined : period.endsAt}
      streak={mode === "unlimited" || streak?.lastPeriod !== period.index
        ? undefined
        : streak}
    />
  {/if}

  <!--
    Rendered here, outside GuessGrid, on purpose — see the comment in
    note-popup.svelte. Moving it inside the grid breaks it silently.
  -->
  <NotePopup {bubble} onDismiss={dismissBubble} />
{/if}
