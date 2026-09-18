<script>
  import { onMount } from "svelte";
  import { SvelteDate, SvelteSet } from "svelte/reactivity";
  import { base } from "$app/paths";
  import {
    loadWeeklyStats,
    summarizeWeeklyPerformance,
  } from "$lib/weekly-stats";

  let isOpen = $state(false);
  let activePanel = $state("activity");
  let changelogHtml = $state("");
  let headbarEl = $state();
  let panelEl = $state();

  let refreshToken = $state(0);
  let performance = $derived.by(() => {
    refreshToken;
    return summarizeWeeklyPerformance();
  });
  let playedWeeklyGames = $derived(performance.playedWeeklyGames);
  let totals = $derived(performance.totals);
  let maxAttempts = $derived(performance.max);

  const panelButtons = [
    {
      id: "activity",
      label: "Statistiques",
      hint: "Voir les statistiques de parties et le graphe d'activité",
      icon: "▦",
    },
    {
      id: "notes",
      label: "Versions",
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

  const ROW_SIZE = 14;

  const performanceRows = [
    { label: "1", index: 0 },
    { label: "2", index: 1 },
    { label: "3", index: 2 },
    { label: "4", index: 3 },
    { label: "5", index: 4 },
    { label: "6", index: 5 },
    { label: "💀", index: 6 },
  ];

  function getFirstThursdayOfSeptember(year) {
    const date = new SvelteDate(Date.UTC(year, 8, 1));
    const day = date.getUTCDay();
    const offset = (4 - day + 7) % 7;
    date.setUTCDate(date.getUTCDate() + offset);
    return date;
  }

  function getSeasonStartForDate(date) {
    const year = date.getUTCFullYear();
    const startOfYear = getFirstThursdayOfSeptember(year);
    if (date < startOfYear) {
      return getFirstThursdayOfSeptember(year - 1);
    }
    return startOfYear;
  }

  function getSeasonLabel(seasonStart) {
    const year = seasonStart.getUTCFullYear();
    return `Saison ${year}-${year + 1}`;
  }

  function chunkWeeks(weeks, size = ROW_SIZE) {
    const rows = [];
    for (let index = 0; index < weeks.length; index += size) {
      rows.push(weeks.slice(index, index + size));
    }
    return rows;
  }

  function readWeeklyResult(seed) {
    return loadWeeklyStats().periods[seed] ?? null;
  }

  function activityColor(result) {
    if (result === "first_try") return "bg-[#d6a84f]";
    if (result === "two_to_five") return "bg-[var(--color-correct)]";
    if (result === "sixth_try") return "bg-[#1f7a43]";
    if (result === "failed") return "bg-[var(--color-wrong)]";
    return "bg-[var(--color-header)]";
  }

  function buildActivitySeasons() {
    const now = new SvelteDate();
    const seasonYears = new SvelteSet();
    const weeklyStats = loadWeeklyStats();

    const currentSeasonStart = getSeasonStartForDate(now);
    seasonYears.add(currentSeasonStart.getUTCFullYear());

    for (const seed of Object.keys(weeklyStats.periods)) {
      const date = new SvelteDate(`${seed}T00:00:00Z`);
      if (!Number.isNaN(date.getTime())) {
        seasonYears.add(getSeasonStartForDate(date).getUTCFullYear());
      }
    }

    return [...seasonYears]
      .sort((left, right) => left - right)
      .map((year) => {
        const seasonStart = getFirstThursdayOfSeptember(year);
        const seasonEnd = new SvelteDate(Date.UTC(year + 1, 8, 1));
        const endDate = new SvelteDate(Math.min(now.getTime(), seasonEnd.getTime()));
        const weeks = [];

        for (let cursor = new SvelteDate(seasonStart); cursor <= endDate; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
          const seed = cursor.toISOString().slice(0, 10);
          weeks.push({
            label: seed,
            seed,
            result: readWeeklyResult(seed),
          });
        }

        return {
          label: getSeasonLabel(seasonStart),
          rows: chunkWeeks(weeks.slice(0, 53)),
        };
      });
  }

  let activitySeasons = $derived.by(() => {
    refreshToken;
    return buildActivitySeasons();
  });

  onMount(() => {
    let disposed = false;

    fetch(`${base}/changelog.html`)
      .then((response) => {
        if (!response.ok) throw new Error(`Changelog request failed: ${response.status}`);
        return response.text();
      })
      .then((html) => {
        if (!disposed) changelogHtml = html;
      })
      .catch(() => {
        if (!disposed) changelogHtml = "<p>Le journal des versions est indisponible.</p>";
      });

    const refresh = () => {
      refreshToken += 1;
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("goblindle:state-changed", refresh);

    return () => {
      disposed = true;
      window.removeEventListener("storage", refresh);
      window.removeEventListener("goblindle:state-changed", refresh);
    };
  });

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
            ? "Statistiques"
            : activePanel === "notes"
              ? "Versions"
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
              {#each performanceRows as row (row.label)}
                <div class="grid grid-cols-[18px_1fr_32px] items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                  <span>{row.label}</span>
                  <div class="relative h-5 overflow-hidden rounded-full bg-[var(--color-surface)]">
                    <div
                      class="absolute inset-y-0 left-0 rounded-full bg-[var(--color-header)]"
                      style={`width: ${playedWeeklyGames > 0 ? (totals[row.index] / maxAttempts) * 100 : 0}%`}
                    ></div>
                  </div>
                  <span class="text-right text-[var(--color-text)]">{totals[row.index]}</span>
                </div>
              {/each}
            </div>
          </div>

          <div class="border-t border-[var(--color-input-border)] pt-4">
            <h3 class="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Activité
            </h3>
            <div class="space-y-4">
              {#each activitySeasons as season (season.label)}
                <div class="space-y-2">
                  <h4 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    {season.label}
                  </h4>
                  {#each season.rows as row, rowIndex (rowIndex)}
                    <div class="flex gap-1" style={`grid-template-columns: repeat(${Math.min(row.length, ROW_SIZE)}, minmax(0, 1fr));`}>
                      {#each row as square (square.label)}
                        <div
                          class={`h-3.5 w-3.5 rounded-[2px] ${activityColor(square.result)}`}
                          title={square.label}
                          aria-label={`Semaine du ${square.label}`}
                        ></div>
                      {/each}
                    </div>
                  {/each}
                </div>
              {/each}
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
