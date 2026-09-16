<script>
  import CampaignAvatar from "./campaign-avatar.svelte";

  /** Single guess row with colored attribute cells */
  let { campaign, results, noteBubble } = $props();

  // Notes are keyed by the authored field name, so the name cell reads
  // `campaign` — not `name`, which is derived and never carries notes.
  let nameNotes = $derived(campaign.notes?.campaign);

  function notesFor(key) {
    return campaign.notes?.[key];
  }

  // A tap fires pointerenter before click. Without the pointerType guard the
  // bubble would open on enter and immediately toggle shut on the click.
  function enter(e, notes, id) {
    if (e.pointerType === "touch") return;
    noteBubble.open(e.currentTarget, notes, "hover", id);
  }

  function leave(e) {
    if (e.pointerType === "touch") return;
    noteBubble.close("hover");
  }
</script>

{#snippet marker()}
  <span class="note-marker" aria-hidden="true">?</span>
{/snippet}

{#snippet attributeValue(r)}
  <span>{r.guessValue}</span>
  {#if r.direction}
    <span class="font-bold text-base">
      {r.direction === "up" ? " ↑" : " ↓"}
    </span>
  {/if}
{/snippet}

<div class="guess-row">
  <!-- Campaign name + illustration -->
  {#if nameNotes}
    <button
      type="button"
      data-note-trigger
      class="guess-cell campaign-cell"
      style="animation-delay: 0s"
      aria-expanded={noteBubble.isOpenFor(campaign.name)}
      aria-controls="note-bubble"
      aria-label="Campagne : {campaign.name} — voir une anecdote"
      onpointerenter={(e) => enter(e, nameNotes, campaign.name)}
      onpointerleave={leave}
      onpointercancel={() => noteBubble.close("hover")}
      onclick={(e) => noteBubble.toggle(e.currentTarget, nameNotes, campaign.name)}
    >
      <CampaignAvatar {campaign} size={40} />
      <span class="text-xs font-semibold">{campaign.name}</span>
      {@render marker()}
    </button>
  {:else}
    <div class="guess-cell campaign-cell" style="animation-delay: 0s">
      <CampaignAvatar {campaign} size={40} />
      <span class="text-xs font-semibold">{campaign.name}</span>
    </div>
  {/if}

  <!-- Attribute cells: the within-row reveal stagger -->
  {#each results as r, i (r.key)}
    {@const notes = notesFor(r.key)}
    {#if notes}
      <button
        type="button"
        data-note-trigger
        class="guess-cell cell-{r.result}"
        style="animation-delay: {(i + 1) * 0.08}s"
        aria-expanded={noteBubble.isOpenFor(`${campaign.name}:${r.key}`)}
        aria-controls="note-bubble"
        aria-label="{r.label} : {r.guessValue} — voir une anecdote"
        onpointerenter={(e) => enter(e, notes, `${campaign.name}:${r.key}`)}
        onpointerleave={leave}
        onpointercancel={() => noteBubble.close("hover")}
        onclick={(e) =>
          noteBubble.toggle(e.currentTarget, notes, `${campaign.name}:${r.key}`)}
      >
        {@render attributeValue(r)}
        {@render marker()}
      </button>
    {:else}
      <div
        class="guess-cell cell-{r.result}"
        style="animation-delay: {(i + 1) * 0.08}s"
      >
        {@render attributeValue(r)}
      </div>
    {/if}
  {/each}
</div>
