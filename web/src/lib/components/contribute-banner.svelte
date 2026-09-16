<script>
  import { onMount } from "svelte";
  import { buildContactAddress, buildContactMailto } from "$lib/contact";

  /**
   * Invitation to report a missing campaign, an anecdote or an error.
   *
   * The href is filled in on mount rather than during render. The site is
   * prerendered, so anything computed while rendering lands in the static HTML
   * — which is exactly the file an address harvester fetches. After hydration
   * the link is a real link, focusable and middle-clickable like any other.
   */
  let href = $state(null);
  let address = $state(null);
  let showFallback = $state(false);
  let copied = $state(false);

  onMount(() => {
    href = buildContactMailto();
    address = buildContactAddress();
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // Clipboard access can be refused; the address is selectable anyway.
    }
  }
</script>

<aside
  class="w-full max-w-[900px] px-4 mt-8 mb-6 mx-auto text-center text-sm text-[var(--color-text-muted)]"
>
  <div
    class="rounded-lg border border-[var(--color-input-border)] bg-[var(--color-surface)] px-4 py-4"
  >
    <p class="mb-3">
      Une campagne manque à l'appel ? Une anecdote à raconter ? Une info fausse ?
    </p>

    <!--
      An anchor rather than a button that navigates: it keeps middle-click,
      right-click → copier l'adresse, and the right screen-reader announcement.

      The href is a mailto:, not a route, so there is nothing for resolve() to
      resolve — and it is built at runtime, so the rule cannot see that for
      itself and assumes the worst.
    -->
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a {href}
      onclick={() => (showFallback = true)}
      class="inline-block px-5 py-2.5 rounded-lg bg-[var(--color-accent)] text-[var(--color-text)] font-semibold no-underline cursor-pointer transition-opacity hover:opacity-85"
    >
      Nous écrire
    </a>

    {#if showFallback && address}
      <!--
        mailto: fails silently when no mail client is registered — nothing
        throws, nothing navigates, the user is just stuck. Showing the address
        after the click is the only way out of that.
      -->
      <p class="mt-3 text-xs">
        Rien ne s'est ouvert ? L'adresse est <span
          class="select-all text-[var(--color-text)]">{address}</span
        >
        <button
          type="button"
          onclick={copy}
          class="ml-1 underline cursor-pointer hover:text-[var(--color-text)]"
        >
          {copied ? "copiée !" : "copier"}
        </button>
      </p>
    {/if}
  </div>
</aside>
