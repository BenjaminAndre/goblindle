<script>
  import ContributeBanner from "$lib/components/contribute-banner.svelte";
  import GameBoard from "$lib/components/game-board.svelte";
</script>

<main class="flex flex-col items-center min-h-screen">
  <header class="text-center pt-6 pb-2 w-full max-w-[900px]">
    <h1 class="text-3xl font-bold tracking-wider">
      Gob<span class="text-[var(--color-accent)]">l</span>indle
    </h1>
  </header>
  <GameBoard />
  <ContributeBanner />
</main>
