<script>
  import { CHANGELOG_HTML } from "$lib/generated/changelog";

  let isOpen = $state(false);
  let activePanel = $state("activity");
  let changelogHtml = $state(CHANGELOG_HTML);
  let headbarEl = $state();
  let panelEl = $state();

  const panelButtons = [
    {
      id: "activity",
      label: "Activités",
      hint: "Voir les statistiques de parties et le graphe d'activité",
      icon: "▦",
    },
    {
      id: "notes",
      label: "Notes Du Trajet",
      hint: "Lire le journal des changements",
      icon: "📖",
    },
    {
      id: "help",
      label: "Comment Jouer",
      hint: "Comprendre les règles et les indices",
      icon: "?",
    },
  ];

  const playedWeeklyGames = 0;
  const attemptBars = [
    { attempt: 1, value: 0 },
    { attempt: 2, value: 0 },
    { attempt: 3, value: 0 },
    { attempt: 4, value: 0 },
    { attempt: 5, value: 0 },
    { attempt: 6, value: 0 },
    { attempt: 7, value: 0 },
  ];
  const weeklySquares = [{ label: "17/09/2026", result: null }];
  const maxAttempts = 1;

  $effect(() => {
    function handlePointerDown(event) {
      if (!isOpen) return;
      const target = event.target;
      const clickedInsidePanel = panelEl && panelEl.contains(target);
      const clickedInsideHeadbar = headbarEl && headbarEl.contains(target);
      if (!clickedInsidePanel && !clickedInsideHeadbar) {
        isOpen = false;
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  });

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

<div bind:this={headbarEl} class="relative mt-4 flex justify-center">
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
    <div
      bind:this={panelEl}
      class="absolute left-1/2 top-full z-50 mt-2 w-[min(92vw,540px)] -translate-x-1/2 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-bubble-bg)] p-4 shadow-lg"
    >
      <div class="mb-3 flex items-center justify-between gap-4">
        <h2 class="text-base font-semibold text-[var(--color-text)]">
          {activePanel === "activity"
            ? "Activités"
            : activePanel === "notes"
              ? "Notes Du Trajet"
              : "Comment Jouer"}
        </h2>
        <button
          type="button"
          aria-label="Fermer le panneau"
          onclick={closePanel}
          class="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-input-border)] bg-transparent text-lg leading-none text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
        >
          ×
        </button>
      </div>

      {#if activePanel === "activity"}
        <div class="space-y-4 text-sm text-[var(--color-text)]">
          <div>
            <h3 class="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Performances passées
            </h3>
            <div class={`space-y-2 rounded-lg border p-3 ${playedWeeklyGames > 0 ? "border-[var(--color-input-border)] bg-[var(--color-surface)]" : "border-[var(--color-input-border)] bg-[var(--color-surface)] opacity-60"}`}>
              {#if playedWeeklyGames === 0}
                <div class="mb-1 text-center text-[11px] text-[var(--color-text-muted)]">
                  Joue une fois pour débloquer les statistiques.
                </div>
              {/if}
              {#each attemptBars.slice(0, 6) as row (row.attempt)}
                <div class="grid grid-cols-[18px_1fr_32px] items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                  <span>{row.attempt}</span>
                  <div class="relative h-5 overflow-hidden rounded-full bg-[var(--color-surface)]">
                    <div
                      class={`absolute inset-y-0 left-0 rounded-full ${playedWeeklyGames > 0 ? "bg-[var(--color-correct)]" : "bg-[var(--color-header)]"}`}
                      style={`width: ${playedWeeklyGames > 0 ? (row.value / maxAttempts) * 100 : 0}%`}
                    ></div>
                    <div class="absolute inset-0 min-h-[8px] border border-transparent"></div>
                  </div>
                  <span class="text-right text-[var(--color-text)]">{row.value}</span>
                </div>
              {/each}
              <div class="grid grid-cols-[18px_1fr_32px] items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                <span>💀</span>
                <div class="relative h-5 overflow-hidden rounded-full bg-[var(--color-surface)]">
                  <div
                    class={`absolute inset-y-0 left-0 rounded-full ${playedWeeklyGames > 0 ? "bg-[var(--color-wrong)]" : "bg-[var(--color-header)]"}`}
                    style={`width: ${playedWeeklyGames > 0 ? (attemptBars[6].value / maxAttempts) * 100 : 0}%`}
                  ></div>
                </div>
                <span class="text-right text-[var(--color-text)]">{attemptBars[6].value}</span>
              </div>
            </div>
          </div>

          <div class="border-t border-[var(--color-input-border)] pt-4">
            <h3 class="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Activité
            </h3>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                {#each weeklySquares as square (square.label)}
                  <div
                    class={`h-4 w-4 rounded-[2px] ${square.result === null ? "bg-[var(--color-header)]" : square.result === "win" ? "bg-[var(--color-correct)]" : square.result === "early" ? "bg-[var(--color-accent)]" : square.result === "late" ? "bg-[var(--color-header)]" : "bg-[var(--color-wrong)]"}`}
                    title={square.label}
                    aria-label={`Semaine du ${square.label}`}
                  ></div>
                {/each}
              </div>
              <p class="text-[10px] text-[var(--color-text-muted)]">
                La première semaine de la saison commence le 17/09/2026. Une seule case est
                visible tant qu'aucune part de jeu hebdomadaire n'a été enregistrée.
              </p>
            </div>
          </div>
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
