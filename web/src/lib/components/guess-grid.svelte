<script>
  import { CLASSIC_ATTRIBUTES } from "$lib/classic-mode";
  import GuessRow from "./guess-row.svelte";

  /** Grid with header row + guess rows */
  let { guesses, results } = $props();

  // Newest guess first. .reverse() acts on the fresh array from .map(),
  // so `guesses` itself is never mutated.
  let rows = $derived(
    guesses.map((campaign, i) => ({ campaign, results: results[i] })).reverse(),
  );
</script>

<!--
  --attr-count drives .guess-row's grid-template-columns and cascades to the
  header and every GuessRow, so the column count follows CLASSIC_ATTRIBUTES
  instead of being restated in three CSS media blocks.
-->
<div
  class="w-full max-w-[900px] px-4 overflow-x-auto"
  style="--attr-count: {CLASSIC_ATTRIBUTES.length}"
>
  <!-- Header row -->
  <div class="guess-row header-row">
    <div class="guess-cell header-cell">Campagne</div>
    {#each CLASSIC_ATTRIBUTES as attr (attr.key)}
      <div class="guess-cell header-cell">{attr.label}</div>
    {/each}
  </div>

  <!-- Guess rows — newest first -->
  {#each rows as row (row.campaign.id)}
    <GuessRow campaign={row.campaign} results={row.results} />
  {/each}
</div>
