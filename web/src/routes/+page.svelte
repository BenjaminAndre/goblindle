<script>
  import { asset } from "$app/paths";
  import ContributeBanner from "$lib/components/contribute-banner.svelte";
  import GameBoard from "$lib/components/game-board.svelte";
  import Headbar from "$lib/components/headbar.svelte";
</script>

<main class="flex flex-col items-center min-h-screen">
  <header class="pt-6 pb-2 w-full max-w-[900px]">
    <div class="flex items-center justify-center gap-3">
      <!--
        Decorative: the wordmark sits right beside it. Dimensions are explicit
        so the header does not shift when the badge finishes loading.
      -->
      <img
        src={asset("/logo.png")}
        alt=""
        width="44"
        height="44"
        decoding="async"
        class="shrink-0"
      />
      <h1 class="text-3xl font-bold tracking-wider">
        Gob<span class="text-[var(--color-accent)]">l</span>indle
      </h1>
    </div>
    <Headbar />
  </header>
  <GameBoard />
  <ContributeBanner />
  <footer
    class="mt-auto flex w-full max-w-[900px] items-center justify-center gap-2 border-t border-[var(--color-input-border)] px-4 py-5 text-center text-xs text-[var(--color-text-muted)]"
  >
    <span>© 2026 Gobelins &amp; Gremlins</span>
    <span aria-hidden="true">·</span>
    <a
      href="https://discord.com/invite/nHNM6mYxuk"
      target="_blank"
      rel="noreferrer"
      class="transition-colors hover:text-[var(--color-text)]"
    >Rejoins-nous sur Discord</a>
  </footer>
</main>
