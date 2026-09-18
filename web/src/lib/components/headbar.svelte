<script>
  import { CHANGELOG_HTML } from "$lib/generated/changelog";

  let isOpen = $state(false);
  let activePanel = $state("activity");
  let changelogHtml = $state(CHANGELOG_HTML);

  const panelButtons = [
    {
      id: "activity",
      label: "activités",
      hint: "Voir les statistiques de parties et le graphe d'activité",
      icon: "▦",
    },
    {
      id: "notes",
      label: "notes du trajet",
      hint: "Lire le journal des changements",
      icon: "📖",
    },
    {
      id: "help",
      label: "comment jouer",
      hint: "Comprendre les règles et les indices",
      icon: "?",
    },
  ];

  function togglePanel(id) {
    if (activePanel === id && isOpen) {
      isOpen = false;
      return;
    }
    activePanel = id;
    isOpen = true;
  }

  function closePanel() {
    isOpen = false;
  }
</script>

<div class="relative mt-4 flex justify-center">
  <div class="flex items-center gap-2 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-surface)] p-1.5 shadow-sm">
    {#each panelButtons as button (button.id)}
      <button
        type="button"
        title={button.hint}
        aria-label={button.hint}
        onclick={() => togglePanel(button.id)}
        class="group relative inline-flex items-center gap-2 rounded-md border border-transparent bg-transparent px-2.5 py-1.5 text-[0.75rem] font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-input-border)] hover:bg-[var(--color-surface-hover)]"
      >
        <span aria-hidden="true" class="text-base">{button.icon}</span>
        <span class="hidden sm:inline">{button.label}</span>
      </button>
    {/each}
  </div>

  {#if isOpen}
    <div class="absolute left-1/2 top-full z-50 mt-2 w-[min(92vw,540px)] -translate-x-1/2 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-bubble-bg)] p-4 shadow-lg">
      <div class="mb-3 flex items-center justify-between gap-4">
        <h2 class="text-base font-semibold text-[var(--color-text)]">
          {activePanel === "activity"
            ? "Activité"
            : activePanel === "notes"
              ? "Notes du trajet"
              : "Comment jouer"}
        </h2>
        <button
          type="button"
          aria-label="Fermer le panneau"
          onclick={closePanel}
          class="rounded-md border border-[var(--color-input-border)] bg-transparent px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
        >
          Fermer
        </button>
      </div>

      {#if activePanel === "activity"}
        <div class="space-y-3 text-sm text-[var(--color-text)]">
          <div class="grid grid-cols-7 gap-1">
            {#each Array.from({ length: 7 }, (_, index) => index) as value, index (index)}
              <div class="flex h-6 items-center justify-center rounded-sm bg-[var(--color-surface)] text-[10px] text-[var(--color-text-muted)]">
                {value + 1}
              </div>
            {/each}
          </div>
          <div class="grid grid-cols-7 gap-1">
            {#each Array.from({ length: 28 }, (_, index) => index) as square, index (index)}
              <div
                class="h-3 w-3 rounded-[2px] {square % 7 === 0
                  ? 'bg-[var(--color-header)]'
                  : square % 5 === 0
                    ? 'bg-[var(--color-correct)]'
                    : square % 3 === 0
                      ? 'bg-[var(--color-accent)]'
                      : 'bg-[var(--color-input-bg)]'}"
                aria-label="Carré d'activité"
              ></div>
            {/each}
          </div>
          <p class="text-xs text-[var(--color-text-muted)]">
            Les carrés de la grille d'activité reflètent les parties jouées et leur
            résultat. Les changements de saison sont marqués au fil des semaines.
          </p>
        </div>
      {:else if activePanel === "notes"}
        <div class="max-h-[60vh] overflow-y-auto rounded-md bg-[var(--color-surface)] p-3 text-sm leading-relaxed text-[var(--color-text)] markdown-body">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html changelogHtml}
        </div>
      {:else}
        <div class="space-y-3 text-sm leading-relaxed text-[var(--color-text)]">
          <p>
            Devine la campagne du jour en essayant des noms. Après chaque tentative,
            les colonnes te disent à quel point ta proposition se rapproche.
          </p>
          <ul class="list-disc space-y-1 pl-5 text-[var(--color-text-muted)]">
            <li>Vert : correspondance exacte.</li>
            <li>Orange : partiellement correct.</li>
            <li>Rouge : pas de correspondance.</li>
            <li>Flèches : la bonne valeur est au-dessus ou en dessous.</li>
          </ul>
          <p>
            Le but est de trouver la bonne campagne en six essais maximum.
          </p>
        </div>
      {/if}
    </div>
  {/if}
</div>
