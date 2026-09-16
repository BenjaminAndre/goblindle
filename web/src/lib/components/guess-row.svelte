<script>
  import CampaignAvatar from "./campaign-avatar.svelte";

  /** Single guess row with colored attribute cells */
  let { campaign, results } = $props();
</script>

<div class="guess-row">
  <!-- Campaign name + illustration -->
  <div class="guess-cell campaign-cell" style="animation-delay: 0s">
    <CampaignAvatar {campaign} size={40} />
    <span class="text-xs font-semibold">{campaign.name}</span>
  </div>

  <!-- Attribute cells: the within-row reveal stagger -->
  {#each results as r, i (r.key)}
    <div
      class="guess-cell cell-{r.result}"
      style="animation-delay: {(i + 1) * 0.08}s"
    >
      <span>{r.guessValue}</span>
      {#if r.direction}
        <span class="font-bold text-base">
          {r.direction === "up" ? " ↑" : " ↓"}
        </span>
      {/if}
    </div>
  {/each}
</div>
